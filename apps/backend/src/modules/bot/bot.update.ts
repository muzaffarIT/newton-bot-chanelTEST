import { Update, Ctx, Start, Action, On, Command, Help, Hears, Next } from 'nestjs-telegraf';
import { Context, Scenes, Markup } from 'telegraf';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

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
        private readonly prisma: PrismaService,
    ) { }

    // ─── Hardcoded Owner Telegram ID ──────────────────────────────────────────
    private readonly OWNER_TELEGRAM_ID = '1450296021';

    async onModuleInit() {
        const adminUrl = this.config.get<string>('ADMIN_MINI_APP_URL');
        const studentUrl = this.config.get<string>('STUDENT_MINI_APP_URL');

        // Set default menu button for ALL users to Student App
        if (studentUrl) {
            try {
                await this.bot.telegram.setChatMenuButton({
                    menuButton: {
                        type: 'web_app',
                        text: '🎓 Кабинет',
                        web_app: { url: studentUrl },
                    } as any,
                });
                this.logger.log(`✅ Default menu button set to Student APP`);
            } catch (e) {
                this.logger.warn(`⚠️ Could not set default menu button: ${e.message}`);
            }
        }

        // Set specific menu button for Admin Owner
        if (adminUrl) {
            try {
                await this.bot.telegram.setChatMenuButton({
                    chatId: Number(this.OWNER_TELEGRAM_ID),
                    menuButton: {
                        type: 'web_app',
                        text: '⚙️ Admin Panel',
                        web_app: { url: adminUrl },
                    } as any,
                });
                this.logger.log(`✅ Admin menu button set for owner: ${this.OWNER_TELEGRAM_ID}`);
            } catch (e) {
                this.logger.warn(`⚠️ Could not set context menu button for owner: ${e.message}`);
            }
        }

        // Auto-seed the owner as admin on every startup
        await this.seedOwnerAdmin();
    }

    private async seedOwnerAdmin() {
        try {
            await this.prisma.adminUser.upsert({
                where: { email: `owner_${this.OWNER_TELEGRAM_ID}@newton.com` },
                update: { telegram_id: this.OWNER_TELEGRAM_ID, is_active: true },
                create: {
                    email: `owner_${this.OWNER_TELEGRAM_ID}@newton.com`,
                    password_hash: 'tg-auth-only',
                    name: 'Владелец',
                    telegram_id: this.OWNER_TELEGRAM_ID,
                    role: 'ADMIN',
                    is_active: true,
                },
            });
            this.logger.log(`✅ Owner admin seeded: telegram_id=${this.OWNER_TELEGRAM_ID}`);
        } catch (err) {
            this.logger.warn(`⚠️ Could not seed owner admin: ${err.message}`);
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
            ? `👋 Добро пожаловать, *${user.first_name}*!\n\nВаш образовательный профиль Newton Academy успешно активирован. В личном кабинете вам доступны:\n\n🔹 Прохождение модульных тестирований\n🔹 Детальная аналитика прогресса\n🔹 Накопление бонусных баллов\n\n👇 Нажмите на кнопку ниже, чтобы перейти в панель студента:`
            : `👋 Xush kelibsiz, *${user.first_name}*!\n\nNewton Academy ta'lim profilingiz muvaffaqiyatli faollashtirildi. Shaxsiy kabinetingizda quyidagilar mavjud:\n\n🔹 Modul testlarini o'tish\n🔹 Rivojlanish analitikasi\n🔹 Bonus ballarini yig'ish\n\n👇 Talaba paneliga o'tish uchun quyidagi tugmani bosing:`;

        const studentUrl = this.config.get<string>('STUDENT_MINI_APP_URL');

        // We will add a persistent reply keyboard for quick actions
        const keyboardOptions = isRu 
            ? [['🎓 Личный кабинет'], ['📝 Пройти тест', '📞 Бесплатная консультация'], ['🌐 Сменить язык']]
            : [['🎓 Mening kabinetim'], ['📝 Test ishlash', '📞 Bepul konsultatsiya'], ['🌐 Tilni o\'zgartirish']];

        await ctx.reply(welcomeText, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: keyboardOptions,
                resize_keyboard: true
            }
        });

        // Send inline button as well for convenience
        await ctx.reply(isRu ? 'Перейти в приложение:' : 'Ilovaga o\'tish:', {
            reply_markup: {
                inline_keyboard: [[Markup.button.webApp(isRu ? '🎓 Открыть профиль' : '🎓 Profilni ochish', studentUrl || '')]]
            }
        });

        // If there is a deep link parameter (like transitioning to a test from the channel)
        if (payload && payload.startsWith('test_')) {
            const testId = payload.replace('test_', '');
            // In the new Mini App world, we should ideally open the Mini App directly to that test
            // But for now, let's just enter the bot scene to keep compatibility
            await ctx.scene.enter('TEST_SCENE', { testId });
            return;
        }
    }

    @Hears(['🎓 Личный кабинет', '🎓 Mening kabinetim', '📝 Пройти тест', '📝 Test ishlash'])
    async onCabinet(@Ctx() ctx: BotContext) {
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        const lang = user?.language_code || 'ru';

        if (!user) {
            await ctx.reply(lang === 'uz' ? '⚠️ Avval ro\'yxatdan o\'ting: /start' : '⚠️ Пожалуйста, пройдите регистрацию: /start');
            return;
        }

        const studentUrl = this.config.get<string>('STUDENT_MINI_APP_URL');
        await ctx.reply(
            lang === 'ru' ? '🔗 Нажмите на кнопку ниже, чтобы открыть платформу:' : '🔗 Platformani ochish uchun pastdagi tugmani bosing:',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.webApp(lang === 'ru' ? '🎓 Платформа Newton' : '🎓 Newton platformasi', studentUrl || '')]
                ])
            }
        );
    }

    @Hears(['📞 Бесплатная консультация', '📞 Bepul konsultatsiya'])
    async onConsultation(@Ctx() ctx: BotContext) {
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        const lang = user?.language_code || 'ru';
        
        await ctx.reply(
            lang === 'ru' 
            ? '🧑‍💼 Наш менеджер свяжется с вами в ближайшее время. Или вы можете написать напрямую: @manager' 
            : '🧑‍💼 Menejerimiz tez orada siz bilan bog\'lanadi. Yoki to\'g\'ridan-to\'g\'ri yozishingiz mumkin: @manager',
            { parse_mode: 'Markdown' }
        );
    }

    @Command('language')
    @Hears(['🌐 Сменить язык', '🌐 Tilni o\'zgartirish'])
    async onChangeLanguage(@Ctx() ctx: BotContext) {
        await ctx.reply('🇺🇿 Iltimos, tilni tanlang:\n🇷🇺 Пожалуйста, выберите язык:', {
            reply_markup: {
                inline_keyboard: [
                    [
                        Markup.button.callback('🇷🇺 Русский', 'set_lang_ru'),
                        Markup.button.callback('🇺🇿 O\'zbek tili', 'set_lang_uz')
                    ]
                ]
            }
        });
    }

    @Action('set_lang_ru')
    async setLangRu(@Ctx() ctx: BotContext) {
        await this.usersService.updateLanguage(ctx.from.id.toString(), 'ru');
        await ctx.answerCbQuery('Язык изменен на Русский 🇷🇺');
        await ctx.reply('✅ Язык успешно изменен на Русский.\nИспользуйте /start для обновления меню.');
    }

    @Action('set_lang_uz')
    async setLangUz(@Ctx() ctx: BotContext) {
        await this.usersService.updateLanguage(ctx.from.id.toString(), 'uz');
        await ctx.answerCbQuery('Til O\'zbek tiliga o\'zgartirildi 🇺🇿');
        await ctx.reply('✅ Til muvaffaqiyatli O\'zbek tiliga o\'zgartirildi.\nMenyuni yangilash uchun /start dan foydalaning.');
    }

    @Command('add_channel')
    async onAddChannel(@Ctx() ctx: BotContext) {
        const ownerId = process.env.OWNER_TELEGRAM_ID;
        const currentId = ctx.from.id.toString();
        
        let isAdmin = currentId === ownerId;

        if (!isAdmin) {
            const adminUser = await this.prisma.adminUser.findUnique({
                where: { telegram_id: currentId }
            });
            if (adminUser?.is_active) {
                isAdmin = true;
            }
        }

        if (!isAdmin) {
            await ctx.reply('⚠️ Только администраторы могут добавлять каналы. Пожалуйста, убедитесь что ваш Telegram ID привязан к профилю администратора.');
            return;
        }

        await ctx.reply(
            '📢 Пожалуйста, выберите канал, в который вы хотите добавить бота.\n\n_Нажмите на кнопку ниже и выберите канал из списка. Вы должны быть администратором этого канала._',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [
                            {
                                text: 'Выбрать канал',
                                request_chat: {
                                    request_id: 1, // Any arbitrary ID
                                    chat_is_channel: true,
                                    user_administrator_rights: {
                                        can_post_messages: true,
                                        can_edit_messages: true,
                                        can_delete_messages: true,
                                        can_post_stories: false,
                                        can_edit_stories: false,
                                        can_delete_stories: false,
                                        is_anonymous: false,
                                        can_manage_chat: true,
                                        can_manage_video_chats: false,
                                        can_restrict_members: false,
                                        can_promote_members: false,
                                        can_change_info: false,
                                        can_invite_users: false,
                                        can_pin_messages: false,
                                    },
                                    bot_administrator_rights: {
                                        can_post_messages: true,
                                        can_edit_messages: true,
                                        can_delete_messages: true,
                                        can_post_stories: false,
                                        can_edit_stories: false,
                                        can_delete_stories: false,
                                        is_anonymous: false,
                                        can_manage_chat: true,
                                        can_manage_video_chats: false,
                                        can_restrict_members: false,
                                        can_promote_members: false,
                                        can_change_info: false,
                                        can_invite_users: false,
                                        can_pin_messages: false,
                                    }
                                }
                            }
                        ]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            }
        );
    }

    @On('chat_shared')
    async onChatShared(@Ctx() ctx: BotContext) {
        // @ts-ignore
        const chatShared = ctx.message?.chat_shared;
        if (!chatShared) return;

        const chatId = chatShared.chat_id.toString();

        try {
            await this.prisma.channel.upsert({
                where: { telegram_id: chatId },
                update: { is_active: true },
                create: { telegram_id: chatId, name: `Channel ${chatId}`, is_active: true }
            });

            await ctx.reply(
                `✅ Канал успешно добавлен в базу!\n\nID: \`${chatId}\`\n\n_Не забудьте обновить страницу админ панели. Название канала обновится автоматически при первом сообщении, или вы можете задать его вручную в панели._`,
                { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
            );
        } catch (e) {
            await ctx.reply('❌ Произошла ошибка при сохранении канала: ' + e.message);
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
                '🔹 /start — Botni qayta ishga tushirish',
                "🔹 /help — Ushbu yordam xabari \n\n💬 Savol bo'lsa, menejerimizga yozing: @manager",
            ].join('\n')
            : [
                '📚 *Помощь по Newton Academy Bot*',
                '',
                '🔹 /start — Перезапустить бота',
                '🔹 /help — Это сообщение помощи \n\n💬 Вопросы? Пишите менеджеру: @manager',
            ].join('\n');

        await ctx.reply(helpText, { parse_mode: 'Markdown' });
    }

    @Command('status')
    async onStatus(@Ctx() ctx: BotContext) {
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        if (!user) {
            await ctx.reply('⚠️ Сначала пройдите регистрацию: /start');
            return;
        }
        const lang = user.language_code || 'ru';

        // Send to test scene for session status
        await ctx.scene.enter('TEST_STATUS_CHECK', { userId: user.id, lang });
    }
}
