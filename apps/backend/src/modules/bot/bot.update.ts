import { Update, Ctx, Start, Action, On, Command, Help } from 'nestjs-telegraf';
import { Context, Scenes, Markup } from 'telegraf';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

interface BotContext extends Context {
    scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
    wizard: Scenes.WizardContextWizard<BotContext>;
}

@Update()
@Injectable()
export class BotUpdate implements OnModuleInit {
    private readonly logger = new Logger(BotUpdate.name);

    constructor(
        private readonly usersService: UsersService,
        @InjectBot() private readonly bot: Telegraf,
        private readonly config: ConfigService,
    ) { }

    async onModuleInit() {
        const adminUrl = this.config.get<string>('ADMIN_MINI_APP_URL');
        if (adminUrl) {
            try {
                await this.bot.telegram.setChatMenuButton({
                    menuButton: {
                        type: 'web_app',
                        text: '⚙️ Admin Panel',
                        web_app: { url: adminUrl },
                    } as any,
                });
                this.logger.log(`✅ Admin menu button set: ${adminUrl}`);
            } catch (e) {
                this.logger.warn(`⚠️ Could not set menu button: ${e.message}`);
            }
        }
    }

    @Start()
    async onStart(@Ctx() ctx: BotContext) {
        this.logger.log(`Received /start command from ${ctx.from.id}`);

        // Parse deep link payload, e.g., t.me/Bot?start=test_123
        // @ts-ignore
        const payload = ctx.message?.text?.split(' ')[1];

        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());

        if (!user) {
            // User not registered, enter Registration Wizard
            this.logger.log(`User ${ctx.from.id} is new. Starting REGISTRATION_WIZARD.`);

            // Pass test_id so the wizard knows where to route after completion
            await ctx.scene.enter('REGISTRATION_WIZARD', { test_id: payload });
            return;
        }

        // User is registered
        const isRu = user.language_code === 'ru';
        const welcomeText = isRu
            ? `С возвращением, ${user.first_name}! Откройте ваш учебный кабинет ниже 👇`
            : `Xush kelibsiz, ${user.first_name}! O'quv kabinetingizni pastda oching 👇`;

        const studentUrl = this.config.get<string>('STUDENT_MINI_APP_URL');

        await ctx.reply(welcomeText, Markup.inlineKeyboard([
            [Markup.button.webApp(isRu ? '🎓 Личный кабинет' : '🎓 Shaxsiy kabinet', studentUrl || '')]
        ]));

        // If there is a deep link parameter (like transitioning to a test from the channel)
        if (payload && payload.startsWith('test_')) {
            const testId = payload.replace('test_', '');
            // In the new Mini App world, we should ideally open the Mini App directly to that test
            // But for now, let's just enter the bot scene to keep compatibility
            await ctx.scene.enter('TEST_SCENE', { testId });
            return;
        }
    }

    @On('text')
    async onMessage(@Ctx() ctx: BotContext) {
        // @ts-ignore
        const text = ctx.message?.text;
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        const lang = user?.language_code || 'ru';

        if (text === 'Личный кабинет' || text === 'Mening kabinetim') {
            if (!user) {
                await ctx.reply(lang === 'uz' ? 'Avval ro\'yxatdan o\'ting: /start' : 'Сначала пройдите регистрацию: /start');
                return;
            }

            const studentUrl = this.config.get<string>('STUDENT_MINI_APP_URL');
            await ctx.reply(
                lang === 'ru' ? 'Нажмите на кнопку ниже, чтобы войти в кабинет:' : 'Kabinetga kirish uchun pastdagi tugmani bosing:',
                Markup.inlineKeyboard([
                    [Markup.button.webApp(lang === 'ru' ? '🎓 Открыть кабинет' : '🎓 Kabinetni ochish', studentUrl || '')]
                ])
            );
        }
    }

    @Help()
    async onHelp(@Ctx() ctx: BotContext) {
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        const lang = user?.language_code || 'ru';

        const helpText = lang === 'uz'
            ? [
                '📚 *Newton Academy Bot yordami*',
                '',
                '/start — Botni qayta ishga tushirish',
                '/help — Ushbu yordam xabari',
                '/status — Joriy test sessiyasi holati',
                '',
                'Savol bo\'lsa, menejerimizga yozing: @manager',
            ].join('\n')
            : [
                '📚 *Помощь по Newton Academy Bot*',
                '',
                '/start — Перезапустить бота',
                '/help — Это сообщение помощи',
                '/status — Статус текущей тест-сессии',
                '',
                'Вопросы? Пишите менеджеру: @manager',
            ].join('\n');

        await ctx.reply(helpText, { parse_mode: 'Markdown' });
    }

    @Command('status')
    async onStatus(@Ctx() ctx: BotContext) {
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        if (!user) {
            await ctx.reply('Сначала пройдите регистрацию: /start');
            return;
        }
        const lang = user.language_code || 'ru';

        // Send to test scene for session status
        await ctx.scene.enter('TEST_STATUS_CHECK', { userId: user.id, lang });
    }
}
