import { Scene, SceneEnter, Ctx, Action } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
type SceneContext = Scenes.SceneContext;
import { Injectable, Logger } from '@nestjs/common';
import { Markup } from 'telegraf';
import { SessionsService } from '../../sessions/sessions.service';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';

@Scene('TEST_SCENE')
@Injectable()
export class TestScene {
    private readonly logger = new Logger(TestScene.name);

    constructor(
        private readonly sessionsService: SessionsService,
        private readonly usersService: UsersService,
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService,
    ) { }

    @SceneEnter()
    async enter(@Ctx() ctx: SceneContext) {
        const state = ctx.scene.session.state as any;
        const testId: string = state?.testId;

        if (!testId) {
            await ctx.reply('Тест не найден.');
            return ctx.scene.leave();
        }

        this.logger.log(`User ${ctx.from.id} entering TEST_SCENE for test ${testId}`);

        const dbUser = await this.usersService.findByTelegramId(ctx.from.id.toString());
        if (!dbUser) {
            await ctx.reply('Пожалуйста, сначала пройдите регистрацию через /start.');
            return ctx.scene.leave();
        }
        const lang = dbUser.language_code || 'ru';

        // **Resume check**: if there's already an active session, resume it.
        const existingSession = await this.prisma.testSession.findFirst({
            where: { user_id: dbUser.id, test_id: testId, status: 'IN_PROGRESS' },
        });
        if (existingSession) {
            const remaining = Math.max(0, existingSession.expires_at.getTime() - Date.now());
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);

            await ctx.reply(
                `У вас уже есть активная сессия!\n⏳ Оставшееся время: ${mins}м ${secs}с\n\nПродолжаем тест...`,
            );

            // Store session ID in scene state so subsequent actions can use it
            (ctx.scene.session.state as any).sessionId = existingSession.id;
            (ctx.scene.session.state as any).userId = dbUser.id;
            (ctx.scene.session.state as any).lang = lang;

            return this.sendCurrentQuestion(ctx, existingSession.id, lang);
        }

        const test = await this.prisma.test.findUnique({ where: { id: testId } });
        if (!test || !test.is_active) {
            await ctx.reply(await this.i18n.t('bot.test.not_found', { lang }));
            return ctx.scene.leave();
        }

        const durationHours = Math.floor(test.duration_minutes / 60);
        const durationMins = test.duration_minutes % 60;
        const durationStr = durationHours > 0 ? `${durationHours}ч ${durationMins}мин` : `${durationMins}мин`;

        await ctx.reply(
            (await this.i18n.t('bot.test.warning_timer', { lang }))
                .replace('{duration}', durationStr),
            Markup.inlineKeyboard([
                [Markup.button.callback(await this.i18n.t('bot.test.btn_start_test', { lang }), `start_test_${testId}`)],
                [Markup.button.callback(await this.i18n.t('bot.test.btn_cancel_test', { lang }), 'cancel_test')],
            ])
        );

        (ctx.scene.session.state as any).userId = dbUser.id;
        (ctx.scene.session.state as any).lang = lang;
    }

    @Action(/start_test_(.+)/)
    async onStartTest(@Ctx() ctx: SceneContext) {
        // @ts-ignore
        const testId: string = ctx.match[1];
        const sceneState = ctx.scene.session.state as any;
        const userId: string = sceneState.userId;
        const lang: string = sceneState.lang || 'ru';

        try {
            const session = await this.sessionsService.startTestSession(userId, testId);

            // Store session ID for future answer callbacks
            sceneState.sessionId = session.id;

            await ctx.answerCbQuery(await this.i18n.t('bot.test.timer_started', { lang }));

            const test = await this.prisma.test.findUnique({ where: { id: testId } });
            await ctx.editMessageText(
                `⏳ Таймер запущен! У вас есть ${test.duration_minutes} минут.\n\nОтвечайте на вопросы по порядку. Удачи! 🎯`,
            );

            await this.sendCurrentQuestion(ctx, session.id, lang);

        } catch (e) {
            this.logger.error('Error starting session', e);
            await ctx.answerCbQuery(e.message || 'Произошла ошибка или тест уже запущен.', { show_alert: true });
        }
    }

    @Action('cancel_test')
    async onCancelTest(@Ctx() ctx: SceneContext) {
        const lang = (ctx.scene.session.state as any)?.lang || 'ru';
        await ctx.answerCbQuery();
        await ctx.editMessageText(await this.i18n.t('bot.test.cancel_msg', { lang }));
        await ctx.scene.leave();
    }

    @Action(/answer_([^_]+)_([^_]+)/)
    async onAnswer(@Ctx() ctx: SceneContext) {
        // @ts-ignore
        const optionId: string = ctx.match[1];
        // @ts-ignore
        const questionId: string = ctx.match[2];

        const sceneState = ctx.scene.session.state as any;
        const sessionId: string = sceneState.sessionId;
        const lang: string = sceneState.lang || 'ru';

        if (!sessionId) {
            await ctx.answerCbQuery('Сессия не найдена. Попробуйте начать заново.', { show_alert: true });
            return;
        }

        try {
            // Verify session is still active before saving answer
            const session = await this.prisma.testSession.findUnique({ where: { id: sessionId } });
            if (!session || session.status !== 'IN_PROGRESS') {
                await ctx.answerCbQuery('Время вышло! Ваш тест был автоматически отправлен.', { show_alert: true });
                return ctx.scene.leave();
            }

            // Upsert answer (idempotent: user can change answer within session)
            await this.prisma.testAnswer.upsert({
                where: { session_id_question_id: { session_id: sessionId, question_id: questionId } },
                create: { session_id: sessionId, question_id: questionId, selected_option_id: optionId },
                update: { selected_option_id: optionId },
            });

            // Advance question pointer
            const nextIndex = (session.current_question_index ?? 0) + 1;
            await this.prisma.testSession.update({
                where: { id: sessionId },
                data: { current_question_index: nextIndex },
            });

            await ctx.answerCbQuery(await this.i18n.t('bot.test.answer_saved', { lang }));
            await this.sendCurrentQuestion(ctx, sessionId, lang);

        } catch (e) {
            this.logger.error('Error saving answer', e);
            await ctx.answerCbQuery('Ошибка при сохранении ответа.', { show_alert: true });
        }
    }

    @Action('finish_test')
    async onFinishTest(@Ctx() ctx: SceneContext) {
        const sceneState = ctx.scene.session.state as any;
        const sessionId: string = sceneState.sessionId;
        const userId: string = sceneState.userId;
        const lang: string = sceneState.lang || 'ru';

        try {
            await ctx.answerCbQuery('Завершаем тест...');
            const session = await this.sessionsService.submitTestSession(userId, sessionId);
            await ctx.editMessageText('✅ Тест сдан! Рассчитываем ваш результат...');

            this.logger.log(`Session ${sessionId} manually submitted by user ${userId}`);

            await ctx.scene.leave();
        } catch (e) {
            this.logger.error('Error submitting test', e);
            await ctx.answerCbQuery(e.message || 'Ошибка при сдаче теста.', { show_alert: true });
        }
    }

    /**
     * Fetches the current question from the session's progress and sends it to the user.
     */
    private async sendCurrentQuestion(ctx: SceneContext, sessionId: string, lang: string) {
        const session = await this.prisma.testSession.findUnique({
            where: { id: sessionId },
            include: {
                test: {
                    include: {
                        questions: {
                            orderBy: { order_num: 'asc' },
                            include: { options: true },
                        },
                    },
                },
            },
        });

        if (!session) return;

        const questions = session.test.questions;
        const currentIndex = session.current_question_index ?? 0;

        if (currentIndex >= questions.length) {
            // User has answered all questions — auto-submit
            const sceneState = ctx.scene.session.state as any;
            const userId: string = sceneState.userId;
            await this.sessionsService.submitTestSession(userId, sessionId);
            await ctx.reply('🎉 Вы ответили на все вопросы! Рассчитываем результат...');
            return ctx.scene.leave();
        }

        const question = questions[currentIndex];
        const total = questions.length;
        const questionNum = currentIndex + 1;

        // Build answer buttons: one per row for clarity
        const answerButtons = question.options.map(opt =>
            [Markup.button.callback(opt.content, `answer_${opt.id}_${question.id}`)]
        );

        // Add Finish Test button at the bottom
        answerButtons.push([Markup.button.callback('🏁 Завершить тест', 'finish_test')]);

        // Remaining time display
        const remaining = Math.max(0, session.expires_at.getTime() - Date.now());
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);

        await ctx.reply(
            `📝 Вопрос ${questionNum}/${total}\n⏳ Осталось: ${mins}м ${secs}с\n\n${question.content}`,
            Markup.inlineKeyboard(answerButtons),
        );
    }
}
