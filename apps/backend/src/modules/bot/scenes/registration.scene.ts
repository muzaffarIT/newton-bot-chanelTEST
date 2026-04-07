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

        const text = isRu ? 'Пожалуйста, поделитесь своим номером телефона:' : 'Iltimos, telefon raqamingizni yuboring:';
        const btnText = isRu ? '📱 Отправить контакт' : '📱 Kontaktni yuborish';

        await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...Markup.keyboard([Markup.button.contactRequest(btnText)]).oneTime().resize()
        });
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

        const text = lang === 'ru' ? 'Как вас зовут? (Введите ФИО)' : 'Ism-sharifingizni kiriting:';
        await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
        ctx.wizard.next();
    }

    @WizardStep(4)
    @On('text')
    async step4_ParentPhone(@Ctx() ctx: WizardContext, @Message('text') text: string) {
        const parts = text.split(' ');
        // @ts-ignore
        ctx.wizard.state['first_name'] = parts[0] || '';
        // @ts-ignore
        ctx.wizard.state['last_name'] = parts.slice(1).join(' ');

        // @ts-ignore
        const lang = ctx.wizard.state['language'];
        const msg = lang === 'ru' ? 'Напишите номер телефона ваших родителей (для связи):' : 'Ota-onangizning telefon raqamini kiriting:';
        
        await ctx.reply(msg, { parse_mode: 'Markdown' });
        ctx.wizard.next();
    }

    @WizardStep(5)
    @On('text')
    async step5_Grade(@Ctx() ctx: WizardContext, @Message('text') parentPhone: string) {
        // @ts-ignore
        ctx.wizard.state['parent_phone'] = parentPhone;
        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        const msg = lang === 'ru' ? 'В каком вы классе?' : 'Nechanchi sinfda o\'qiysiz?';
        
        // 3 buttons per row: "Почемучка", "1 класс", ..., "11 класс". Total 12 options = 4 rows of 3 buttons.
        const keyboard = [
            [Markup.button.callback('Почемучка', 'grade_0'), Markup.button.callback('1 класс', 'grade_1'), Markup.button.callback('2 класс', 'grade_2')],
            [Markup.button.callback('3 класс', 'grade_3'), Markup.button.callback('4 класс', 'grade_4'), Markup.button.callback('5 класс', 'grade_5')],
            [Markup.button.callback('6 класс', 'grade_6'), Markup.button.callback('7 класс', 'grade_7'), Markup.button.callback('8 класс', 'grade_8')],
            [Markup.button.callback('9 класс', 'grade_9'), Markup.button.callback('10 класс', 'grade_10'), Markup.button.callback('11 класс', 'grade_11')]
        ];

        await ctx.reply(msg, { 
            parse_mode: 'Markdown', 
            ...Markup.inlineKeyboard(keyboard)
        });

        ctx.wizard.next();
    }

    @WizardStep(6)
    @On('callback_query')
    async step6_TargetSchool(@Ctx() ctx: WizardContext) {
        // @ts-ignore
        const grade = ctx.callbackQuery.data.replace('grade_', '');
        // @ts-ignore
        ctx.wizard.state['grade'] = grade;
        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        await ctx.answerCbQuery();

        const msg = lang === 'ru' ? 'Какая ваша целевая школа?' : 'Qaysi maktabga kirishni xohlaysiz?';
        await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
                [Markup.button.callback('Президентская школа', 'school_President')],
                [Markup.button.callback('Мирзо Улугбек', 'school_Ulugbek')],
                [Markup.button.callback('Аль-Хоразмий', 'school_Khorazmiy')],
                [Markup.button.callback('Аль-Беруни', 'school_Beruni')],
                [Markup.button.callback('Ибн Сино', 'school_Sino')],
                [Markup.button.callback('Другое', 'school_Other')]
            ])
         });

        ctx.wizard.next();
    }

    @WizardStep(7)
    @On('callback_query')
    async step7_Finish(@Ctx() ctx: WizardContext) {
        // @ts-ignore
        const targetSchoolRaw = ctx.callbackQuery.data.replace('school_', '');
        // @ts-ignore
        ctx.wizard.state['target_school'] = targetSchoolRaw;
        // @ts-ignore
        const lang = ctx.wizard.state['language'];

        await ctx.answerCbQuery();

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
            const dto = {
                first_name: state['first_name'],
                last_name: state['last_name'],
                phone: state['phone'],
                language_code: lang,
                grade: state['grade'],
                parent_phone: state['parent_phone'],
                target_school: state['target_school']
            };

            if (!existingUser) {
                await this.usersService.createUser({
                    telegram_id: ctx.from.id.toString(),
                    ...dto
                });
            } else {
                await this.usersService.updateUser(ctx.from.id.toString(), dto);
            }

            const successMsg = lang === 'ru' ? '✅ Вы успешно зарегистрированы!' : '✅ Muvaffaqiyatli ro\'yxatdan o\'tdingiz!';
            await ctx.editMessageText(successMsg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
                    [Markup.button.webApp(
                        lang === 'ru' ? '🎓 Открыть платформу' : '🎓 Platformani ochish',
                        process.env.STUDENT_MINI_APP_URL || ''
                    )]
                ])
             });

            await ctx.scene.leave();
        } catch (e) {
            this.logger.error('Error during registration', e);
            await ctx.reply('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
            await ctx.scene.leave();
        }
    }
}
