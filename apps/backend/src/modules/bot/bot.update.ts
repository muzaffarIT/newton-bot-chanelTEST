import { Update, Ctx, Start, Action, Command, Help, Hears, On } from 'nestjs-telegraf';
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
            await ctx.scene.enter('REGISTRATION_WIZARD', { test_id: payload });
            return;
        }

        const currentId = ctx.from.id.toString();
        const isAdmin = await this.isAdminUser(currentId);
        const isRu = user.language_code === 'ru';

        // Build keyboard based on role
        let keyboardOptions: any[][];
        if (isAdmin) {
            keyboardOptions = [
                ['📢 Опубликовать пост', '➕ Добавить канал'],
                ['⚙️ Настройки администратора'],
            ];
        } else {
            keyboardOptions = isRu
                ? [['🎓 Кабинет', '📝 Тесты'], ['📞 Консультация', '🌐 Язык']]
                : [['🎓 Kabinet', '📝 Testlar'], ['📞 Konsultatsiya', '🌐 Tilni o\'zgartirish']];
        }

        const welcomeText = isAdmin
            ? `👋 Добро пожаловать, *${user.first_name}*! _(Администратор)_\n\nДоступные действия:\n📢 *Опубликовать пост* — форма отправки поста\n➕ *Добавить канал* — регистрация бота в канале\n⚙️ *Настройки администратора* — панель управления`
            : isRu
                ? `👋 Добро пожаловать, *${user.first_name}*!\n\nВаш образовательный профиль Newton Academy успешно активирован. Выберите нужное действие в меню ниже:`
                : `👋 Xush kelibsiz, *${user.first_name}*!\n\nNewton Academy ta'lim profilingiz faollashtirildi. Quyida kerakli bo'limni tanlang:`;

        const studentUrl = this.config.get<string>('STUDENT_MINI_APP_URL');
        const adminUrl = this.config.get<string>('ADMIN_MINI_APP_URL');

        let inlineKeyboard = [];
        
        if (isAdmin && adminUrl) {
           inlineKeyboard = [[{ text: '🛠 Открыть Админ-панель', web_app: { url: `${adminUrl}/dashboard` } }]];
        } else if (!isAdmin && studentUrl) {
           inlineKeyboard = [[{ text: isRu ? '🎓 Открыть Личный Кабинет' : '🎓 Kabinetni ochish', web_app: { url: studentUrl } }]];
        }

        await ctx.reply(welcomeText, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: keyboardOptions,
                resize_keyboard: true,
            },
        });

        if (payload && payload.startsWith('test_')) {
            const testId = payload.replace('test_', '');
            await ctx.scene.enter('TEST_SCENE', { testId });
        }
    }

    @Hears(['🎓 Кабинет', '🎓 Kabinet', '📝 Тесты', '📝 Testlar', '⚙️ Настройки администратора'])
    async onCabinet(@Ctx() ctx: BotContext) {
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        const lang = user?.language_code || 'ru';
        const currentId = ctx.from.id.toString();
        const isAdmin = await this.isAdminUser(currentId);

        if (!user && !isAdmin) {
            await ctx.reply(lang === 'uz' ? '⚠️ Avval ro\'yxatdan o\'ting: /start' : '⚠️ Пожалуйста, пройдите регистрацию: /start');
            return;
        }

        const studentUrl = this.config.get<string>('STUDENT_MINI_APP_URL');
        const adminUrl = this.config.get<string>('ADMIN_MINI_APP_URL');

        const btnText = isAdmin ? '🛠 Открыть Админ-панель' : (lang === 'ru' ? '🎓 Платформа Newton' : '🎓 Newton platformasi');
        const urlToOpen = isAdmin ? `${adminUrl}/dashboard` : studentUrl;

        await ctx.reply(
            isAdmin ? '🔗 Нажмите кнопку ниже для управления платформой:' : (lang === 'ru' ? '🔗 Нажмите на кнопку ниже, чтобы открыть платформу:' : '🔗 Platformani ochish uchun pastdagi tugmani bosing:'),
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.webApp(btnText, urlToOpen || '')]
                ])
            }
        );
    }

    /** Admin keyboard button: Publish post */
    @Hears('📢 Опубликовать пост')
    async onPostButton(@Ctx() ctx: BotContext) {
        const currentId = ctx.from.id.toString();
        const isAdmin = await this.isAdminUser(currentId);
        if (!isAdmin) {
            await ctx.reply('⚠️ У вас нет прав для публикации постов.');
            return;
        }
        await ctx.scene.enter('POST_SCENE');
    }

    /** Admin keyboard button: Add channel */
    @Hears('➕ Добавить канал')
    async onAddChannelButton(@Ctx() ctx: BotContext) {
        const currentId = ctx.from.id.toString();
        const isAdmin = await this.isAdminUser(currentId);
        if (!isAdmin) {
            await ctx.reply('⚠️ У вас нет прав для добавления каналов.');
            return;
        }
        // Re-use the same add_channel logic
        await this.onAddChannel(ctx);
    }

    @Hears(['📞 Бесплатная консультация', '📞 Bepul konsultatsiya', '📞 Консультация'])
    async onConsultation(@Ctx() ctx: BotContext) {
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        const lang = user?.language_code || 'ru';

        // Read contact from DB settings (with fallback)
        const settings = await this.prisma.appSetting.findMany({
            where: { key: { in: ['consultant_username', 'consultant_phone', 'consultant_name'] } },
        });
        const smap: Record<string, string> = {};
        settings.forEach(s => { smap[s.key] = s.value; });
        const username = smap['consultant_username'] || '@newton_support';
        const phone = smap['consultant_phone'] || '+998 90 123 45 67';
        const name = smap['consultant_name'] || (lang === 'ru' ? 'Поддержка Newton' : 'Newton qo\'llab-quvvatlash');

        const text = lang === 'ru'
            ? `🧑‍💼 *${name}*\n\n📱 Телефон: ${phone}\n💬 Telegram: ${username}\n\nНаш специалист ответит на все ваши вопросы в рабочее время (Пн–Сб 9:00–18:00).`
            : `🧑‍💼 *${name}*\n\n📱 Telefon: ${phone}\n💬 Telegram: ${username}\n\nMutaxassisimiz barcha savollaringizni ish vaqtida (Du–Sh 9:00–18:00) javob beradi.`;

        await ctx.reply(text, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '💬 Написать', url: `https://t.me/${username.replace('@', '')}` },
                    { text: '📱 Позвонить', url: `tel:${phone.replace(/\s/g, '')}` },
                ]],
            },
        });
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

    /** Check if the given telegram user ID belongs to an admin */
    private async isAdminUser(telegramId: string): Promise<boolean> {
        if (telegramId === this.OWNER_TELEGRAM_ID) return true;
        const envOwnerId = process.env.OWNER_TELEGRAM_ID;
        if (envOwnerId && telegramId === envOwnerId) return true;
        const adminUser = await this.prisma.adminUser.findUnique({
            where: { telegram_id: telegramId },
        });
        return !!(adminUser?.is_active);
    }

    @Command('add_channel')
    async onAddChannel(@Ctx() ctx: BotContext) {
        const currentId = ctx.from.id.toString();
        const isAdmin = await this.isAdminUser(currentId);

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

    @Command('post')
    async onPost(@Ctx() ctx: BotContext) {
        const currentId = ctx.from.id.toString();
        const isAdmin = await this.isAdminUser(currentId);

        if (!isAdmin) {
            await ctx.reply('⚠️ Только администраторы могут публиковать посты.');
            return;
        }

        await ctx.scene.enter('POST_SCENE');
    }

    // Handle the chat_shared service message (Telegraf v4 sends it as a normal message with type service)
    @On('message')
    async onMessage(@Ctx() ctx: BotContext) {
        // @ts-ignore
        const msg = ctx.message as any;

        // Handle chat_shared service message from KeyboardButtonRequestChat
        if (msg?.chat_shared) {
            const chatShared = msg.chat_shared;
            const chatId = chatShared.chat_id.toString();

            try {
                // Try to get the actual channel title from Telegram
                let channelTitle = `Channel ${chatId}`;
                try {
                    const chat = await this.bot.telegram.getChat(chatId);
                    // @ts-ignore
                    channelTitle = chat.title || channelTitle;
                } catch (_) {}

                await this.prisma.channel.upsert({
                    where: { telegram_id: chatId },
                    update: { is_active: true, name: channelTitle },
                    create: { telegram_id: chatId, name: channelTitle, is_active: true },
                });

                await ctx.reply(
                    `✅ Канал успешно добавлен!\n\n📢 *${channelTitle}*\nID: \`${chatId}\`\n\n_Обновите страницу Настроек в Админ Панели._`,
                    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } },
                );
            } catch (e) {
                await ctx.reply('❌ Произошла ошибка при сохранении канала: ' + e.message);
            }
            return;
        }

        // Ignore all other unhandled messages silently
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
