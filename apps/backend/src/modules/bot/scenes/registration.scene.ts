import { Context, Scenes } from 'telegraf';
type WizardContext = Scenes.WizardContext;
import { Injectable, Logger } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Markup } from 'telegraf';
import { I18nService } from 'nestjs-i18n';

@Wizard('REGISTRATION_WIZARD')
@Injectable()
export class RegistrationWizard {
    private readonly logger = new Logger(RegistrationWizard.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService
    ) { }

    @WizardStep(1)
    async step1_Language(@Ctx() ctx: WizardContext) {
        this.logger.log(`Starting registration for ${ctx.from.id}`);

        await ctx.reply(await this.i18n.t('bot.registration.welcome', { lang: 'ru' }), { parse_mode: 'Markdown', ...Markup.keyboard([
                ['🇷🇺 Русский', '🇺🇿 O\'zbekcha']
            ]).oneTime().resize()
         });

        ctx.wizard.next();
    }

    @WizardStep(2)
    @On('text')
    async step2_Phone(@Ctx() ctx: WizardContext, @Message('text') msg: string) {
        const isRu = msg.includes('Русский');
        const lang = isRu ? 'ru' : 'uz';
        // @ts-ignore
        ctx.wizard.state['language'] = lang;

        const text = await this.i18n.t('bot.registration.ask_phone', { lang });
        const btnText = await this.i18n.t('bot.registration.btn_contact', { lang });

        await ctx.reply(
            text,
            {
                parse_mode: 'Markdown',
                ...Markup.keyboard([
                    Markup.button.contactRequest(btnText)
                ]).oneTime().resize()
            }
        );

        ctx.wizard.next();
    }

    @WizardStep(3)
    @On(['contact', 'text'])
    async step3_Name(@Ctx() ctx: WizardContext) {
        // @ts-ignore
        const msg = ctx.message;
        let phone = '';
        if (msg && 'contact' in msg && msg.contact) {
            phone = msg.contact.phone_number;
        } else if (msg && 'text' in msg) {
            phone = msg.text;
        }

        // @ts-ignore
        ctx.wizard.state['phone'] = phone;
        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        await ctx.reply(await this.i18n.t('bot.registration.ask_name', { lang }), { parse_mode: 'Markdown', ...Markup.removeKeyboard()
         });

        ctx.wizard.next();
    }

    @WizardStep(4)
    @On('text')
    async step4_Grade(@Ctx() ctx: WizardContext, @Message('text') name: string) {
        // split strictly into first and last name
        const parts = name.split(' ');
        // @ts-ignore
        ctx.wizard.state['first_name'] = parts[0] || '';
        // @ts-ignore
        ctx.wizard.state['last_name'] = parts.slice(1).join(' ');

        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        await ctx.reply(await this.i18n.t('bot.registration.ask_grade', { lang }), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
                [Markup.button.callback(await this.i18n.t('bot.registration.btn_grade_5', { lang }), 'grade_5'),
                Markup.button.callback(await this.i18n.t('bot.registration.btn_grade_6', { lang }), 'grade_6')],
                [Markup.button.callback(await this.i18n.t('bot.registration.btn_grade_7', { lang }), 'grade_7'),
                Markup.button.callback(await this.i18n.t('bot.registration.btn_grade_8', { lang }), 'grade_8')],
                [Markup.button.callback(await this.i18n.t('bot.registration.btn_grade_other', { lang }), 'grade_other')]
            ])
         });

        ctx.wizard.next();
    }

    @WizardStep(5)
    @On('callback_query')
    async step5_Direction(@Ctx() ctx: WizardContext) {
        // @ts-ignore
        const grade = ctx.callbackQuery.data.replace('grade_', '');
        // @ts-ignore
        ctx.wizard.state['grade'] = grade;
        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        await ctx.answerCbQuery();

        const directions = await this.prisma.direction.findMany();
        const buttons = directions.map(d => [Markup.button.callback(d.name, `dir_${d.id}`)]);

        // If no directions in DB, give a fallback skip button
        if (buttons.length === 0) {
            buttons.push([Markup.button.callback(await this.i18n.t('bot.registration.btn_skip', { lang }), 'dir_skip')]);
        }

        await ctx.editMessageText(await this.i18n.t('bot.registration.ask_direction', { lang }), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons)
         });

        ctx.wizard.next();
    }

    @WizardStep(6)
    @On('callback_query')
    async step6_ParentName(@Ctx() ctx: WizardContext) {
        // @ts-ignore
        const directionData = ctx.callbackQuery.data;
        // @ts-ignore
        ctx.wizard.state['direction_id'] = directionData === 'dir_skip' ? undefined : directionData.replace('dir_', '');
        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        await ctx.answerCbQuery();

        await ctx.editMessageText(await this.i18n.t('bot.registration.ask_parent_name', { lang }), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
                [Markup.button.callback(await this.i18n.t('bot.registration.btn_skip', { lang }), 'parent_skip')]
            ])
         });

        ctx.wizard.next();
    }

    @WizardStep(7)
    @On(['text', 'callback_query'])
    async step7_ParentPhone(@Ctx() ctx: WizardContext) {
        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        // @ts-ignore
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'parent_skip') {
            await ctx.answerCbQuery();
        } else {
            // @ts-ignore
            ctx.wizard.state['parent_name'] = ctx.message?.text;
        }

        const skipBtn = Markup.button.callback(await this.i18n.t('bot.registration.btn_skip', { lang }), 'parent_skip');

        // Send new message because we might have received text
        await ctx.reply(await this.i18n.t('bot.registration.ask_parent_phone', { lang }), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[skipBtn]])
         });

        ctx.wizard.next();
    }

    @WizardStep(8)
    @On(['text', 'callback_query'])
    async step8_Finish(@Ctx() ctx: WizardContext) {
        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        // @ts-ignore
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'parent_skip') {
            await ctx.answerCbQuery();
        } else {
            // @ts-ignore
            ctx.wizard.state['parent_phone'] = ctx.message?.text;
        }

        try {
            return this.finishRegistration(ctx, lang);
        } catch (e) {
            this.logger.error(e);
        }
    }

    private async finishRegistration(ctx: WizardContext, lang: string) {
        try {
            // @ts-ignore
            const state = ctx.wizard.state;

            const existingUser = await this.usersService.findByTelegramId(ctx.from.id.toString());
            if (!existingUser) {
                await this.usersService.createUser({
                    telegram_id: ctx.from.id.toString(),
                    first_name: state['first_name'],
                    last_name: state['last_name'],
                    phone: state['phone'],
                    language_code: lang,
                    grade: state['grade'],
                    direction_id: state['direction_id'],
                    father_name: state['parent_name'],
                    father_phone: state['parent_phone']
                });
            } else {
                await this.usersService.updateUser(ctx.from.id.toString(), {
                    first_name: state['first_name'],
                    last_name: state['last_name'],
                    phone: state['phone'],
                    language_code: lang,
                    grade: state['grade'],
                    direction_id: state['direction_id']
                });
            }

            await ctx.reply(await this.i18n.t('bot.registration.finish_success', { lang }), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
                    [Markup.button.webApp(
                        lang === 'ru' ? '🎓 Открыть кабинет' : '🎓 Kabinetni ochish',
                        process.env.STUDENT_MINI_APP_URL || ''
                    )]
                ])
             });

            // Check if user came via deep link
            if (state['test_id']) {
                // ... logic to maybe still enter bot scene or just rely on TMA
                await ctx.scene.leave();
            } else {
                await ctx.scene.leave();
            }
        } catch (e) {
            this.logger.error('Error during registration', e);
            await ctx.reply(await this.i18n.t('bot.registration.finish_error', { lang }));
            await ctx.scene.leave();
        }
    }
}
