import { Injectable, Logger } from '@nestjs/common';
import { Scene, SceneEnter, Ctx, On, Action, Message } from 'nestjs-telegraf';
import { Scenes, Markup, Context } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

type PostContext = Scenes.SceneContext;

/**
 * PostScene — Admin-only Wizard for publishing a plain-text post to a channel.
 * Flow:
 *   1. Bot displays list of registered channels as inline buttons
 *   2. Admin selects channel
 *   3. Admin types the message
 *   4. Bot asks for confirmation
 *   5. On confirm, publishes immediately via Telegram Bot API
 */
@Injectable()
@Scene('POST_SCENE')
export class PostScene {
    private readonly logger = new Logger(PostScene.name);

    constructor(
        private readonly prisma: PrismaService,
        @InjectBot() private readonly bot: Telegraf,
    ) {}

    @SceneEnter()
    async onEnter(@Ctx() ctx: PostContext) {
        // Load active channels from DB
        const channels = await this.prisma.channel.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' },
        });

        if (channels.length === 0) {
            await ctx.reply(
                '❌ Нет зарегистрированных каналов.\n\nСначала добавьте канал через команду /add_channel или в Админ Панели.',
                { reply_markup: { remove_keyboard: true } },
            );
            await ctx.scene.leave();
            return;
        }

        // Store channels in session for later use
        (ctx.scene.session as any).channels = channels;

        const buttons = channels.map((ch) =>
            [Markup.button.callback(`📢 ${ch.name}`, `pst_ch_${ch.id}`)],
        );
        buttons.push([Markup.button.callback('❌ Отмена', 'pst_cancel')]);

        await ctx.reply(
            '📢 *Публикация поста*\n\nВыберите канал для публикации:',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons),
            },
        );
    }

    @Action(/^pst_ch_(.+)$/)
    async onChannelSelected(@Ctx() ctx: PostContext) {
        const callbackData: string = (ctx as any).callbackQuery?.data || '';
        const channelId = callbackData.replace('pst_ch_', '');

        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) {
            await ctx.answerCbQuery('Канал не найден');
            return;
        }

        (ctx.scene.session as any).selectedChannelId = channelId;
        (ctx.scene.session as any).selectedChannelName = channel.name;

        await ctx.editMessageText(
            `✅ Канал выбран: *${channel.name}*\n\n` +
            `✍️ Теперь напишите текст поста.\n\n` +
            `_Поддерживается Markdown разметка._`,
            { parse_mode: 'Markdown' },
        );
        await ctx.answerCbQuery();
    }

    @Action('pst_cancel')
    async onCancel(@Ctx() ctx: PostContext) {
        await ctx.editMessageText('❌ Публикация отменена.');
        await ctx.answerCbQuery();
        await ctx.scene.leave();
    }

    @Action('pst_confirm')
    async onConfirmPost(@Ctx() ctx: PostContext) {
        const session = ctx.scene.session as any;
        const channelId = session.selectedChannelId;
        const messageText = session.messageText;

        if (!channelId || !messageText) {
            await ctx.answerCbQuery('Ошибка: данные сессии потеряны');
            await ctx.scene.leave();
            return;
        }

        await ctx.answerCbQuery('Публикуем...');
        await ctx.editMessageText('⏳ Публикуем пост...');

        try {
            const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
            if (!channel) throw new Error('Канал не найден в базе данных');

            // Publish immediately via Telegram API
            await this.bot.telegram.sendMessage(channel.telegram_id, messageText, {
                parse_mode: 'Markdown',
            });

            // Log in DB as published
            await this.prisma.scheduledPost.create({
                data: {
                    channel_id: channelId,
                    publish_at: new Date(),
                    message_tmpl: messageText,
                    language: 'ru',
                    status: 'PUBLISHED',
                },
            });

            await ctx.reply(
                `✅ Пост успешно опубликован в *${channel.name}*!`,
                { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } },
            );
        } catch (err) {
            this.logger.error(`Failed to publish post: ${err.message}`);
            await ctx.reply(
                `❌ Ошибка при публикации: ${err.message}\n\n` +
                `_Убедитесь, что бот является администратором канала._`,
                { parse_mode: 'Markdown' },
            );
        }

        await ctx.scene.leave();
    }

    @Action('pst_edit')
    async onEditPost(@Ctx() ctx: PostContext) {
        const session = ctx.scene.session as any;
        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `✍️ Введите новый текст поста для *${session.selectedChannelName}*:`,
            { parse_mode: 'Markdown' },
        );
    }

    @On('text')
    async onText(@Ctx() ctx: PostContext, @Message('text') text: string) {
        const session = ctx.scene.session as any;

        if (!session.selectedChannelId) {
            // Still waiting for channel selection, ignore text
            return;
        }

        if (text === '/cancel' || text === 'Отмена') {
            await ctx.reply('❌ Публикация отменена.', { reply_markup: { remove_keyboard: true } });
            await ctx.scene.leave();
            return;
        }

        session.messageText = text;
        const channelName = session.selectedChannelName;

        const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;

        await ctx.reply(
            `📋 *Предпросмотр поста*\n\n` +
            `Канал: *${channelName}*\n\n` +
            `---\n${preview}\n---\n\n` +
            `Опубликовать?`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Опубликовать', 'pst_confirm')],
                    [Markup.button.callback('✏️ Изменить текст', 'pst_edit')],
                    [Markup.button.callback('❌ Отмена', 'pst_cancel')],
                ]),
            },
        );
    }
}
