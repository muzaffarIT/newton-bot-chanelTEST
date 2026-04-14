import { Injectable, Logger } from '@nestjs/common';
import { Scene, SceneEnter, SceneLeave, Ctx, On, Action, Message } from 'nestjs-telegraf';
import { Scenes, Markup, Context } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

type PostContext = Scenes.SceneContext;

/**
 * PostScene — Admin-only Wizard for publishing a plain-text post to one or multiple channels.
 * Flow:
 *   1. Bot displays list of registered channels as toggle buttons (multi-select)
 *   2. Admin toggles channels on/off, then hits "✅ Выбрать"
 *   3. Admin types the message
 *   4. Bot asks for confirmation (shows channel count)
 *   5. On confirm, publishes simultaneously to all selected channels via Telegram Bot API
 *   6. On scene leave, admin reply keyboard is restored
 */
@Injectable()
@Scene('POST_SCENE')
export class PostScene {
    private readonly logger = new Logger(PostScene.name);

    constructor(
        private readonly prisma: PrismaService,
        @InjectBot() private readonly bot: Telegraf,
    ) {}

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private buildChannelKeyboard(channels: any[], selectedIds: string[]) {
        const rows = channels.map((ch) => {
            const isSelected = selectedIds.includes(ch.id);
            const label = isSelected ? `✅ ${ch.name}` : `📢 ${ch.name}`;
            return [Markup.button.callback(label, `pst_toggle_${ch.id}`)];
        });

        const hasSelection = selectedIds.length > 0;
        rows.push([
            Markup.button.callback(
                hasSelection ? `➡️ Далее (${selectedIds.length} канала)` : '➡️ Далее',
                hasSelection ? 'pst_channels_done' : 'pst_noop',
            ),
        ]);
        rows.push([Markup.button.callback('❌ Отмена', 'pst_cancel')]);

        return Markup.inlineKeyboard(rows);
    }

    private getAdminKeyboard() {
        return Markup.keyboard([
            ['📢 Опубликовать пост', '➕ Добавить канал'],
            ['⚙️ Настройки администратора', '🎓 Кабинет'],
            ['🌐 Сменить язык'],
        ]).resize();
    }

    // ─── Scene Lifecycle ───────────────────────────────────────────────────────

    @SceneEnter()
    async onEnter(@Ctx() ctx: PostContext) {
        const channels = await this.prisma.channel.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' },
        });

        if (channels.length === 0) {
            await ctx.reply(
                '❌ Нет зарегистрированных каналов.\n\nСначала добавьте канал через кнопку «➕ Добавить канал» или в Админ Панели.',
                this.getAdminKeyboard(),
            );
            await ctx.scene.leave();
            return;
        }

        (ctx.scene.session as any).channels = channels;
        (ctx.scene.session as any).selectedChannelIds = [];
        (ctx.scene.session as any).messageText = null;

        await ctx.reply(
            '📢 *Публикация поста — шаг 1*\n\nВыберите каналы для рассылки (можно несколько):',
            {
                parse_mode: 'Markdown',
                ...this.buildChannelKeyboard(channels, []),
            },
        );
    }

    @SceneLeave()
    async onLeave(@Ctx() ctx: PostContext) {
        // Always restore the admin reply keyboard when leaving the scene
        try {
            await ctx.reply(
                '✅ Готово. Выберите следующее действие:',
                this.getAdminKeyboard() as any,
            );
        } catch (_) {}
    }

    // ─── Channel Toggle Actions ────────────────────────────────────────────────

    @Action(/^pst_toggle_(.+)$/)
    async onChannelToggle(@Ctx() ctx: PostContext) {
        const callbackData: string = (ctx as any).callbackQuery?.data || '';
        const channelId = callbackData.replace('pst_toggle_', '');

        const session = ctx.scene.session as any;
        const channels = session.channels || [];
        let selectedIds: string[] = session.selectedChannelIds || [];

        if (selectedIds.includes(channelId)) {
            selectedIds = selectedIds.filter((id: string) => id !== channelId);
        } else {
            selectedIds = [...selectedIds, channelId];
        }
        session.selectedChannelIds = selectedIds;

        const selectedNames = channels
            .filter((ch: any) => selectedIds.includes(ch.id))
            .map((ch: any) => `• ${ch.name}`)
            .join('\n');

        const headerText = selectedIds.length > 0
            ? `📢 *Публикация поста — шаг 1*\n\nВыбрано каналов: *${selectedIds.length}*\n${selectedNames}\n\nМожно выбрать ещё или нажать «Далее»:`
            : '📢 *Публикация поста — шаг 1*\n\nВыберите каналы для рассылки (можно несколько):';

        try {
            await ctx.editMessageText(headerText, {
                parse_mode: 'Markdown',
                ...this.buildChannelKeyboard(channels, selectedIds),
            });
        } catch (_) {} // Ignore "message not modified" errors

        await ctx.answerCbQuery(
            selectedIds.includes(channelId) ? `✅ ${channels.find((c: any) => c.id === channelId)?.name} добавлен` : 'Канал убран',
        );
    }

    @Action('pst_noop')
    async onNoop(@Ctx() ctx: PostContext) {
        await ctx.answerCbQuery('⚠️ Сначала выберите хотя бы один канал');
    }

    @Action('pst_channels_done')
    async onChannelsDone(@Ctx() ctx: PostContext) {
        const session = ctx.scene.session as any;
        const selectedIds: string[] = session.selectedChannelIds || [];

        if (selectedIds.length === 0) {
            await ctx.answerCbQuery('Выберите хотя бы один канал');
            return;
        }

        const channels = session.channels || [];
        const names = channels
            .filter((ch: any) => selectedIds.includes(ch.id))
            .map((ch: any) => `*${ch.name}*`)
            .join(', ');

        await ctx.editMessageText(
            `✅ Каналы выбраны: ${names}\n\n✍️ Теперь напишите текст поста.\n\n_Поддерживается Markdown разметка. Отправьте /cancel для отмены._`,
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
        const selectedChannelIds: string[] = session.selectedChannelIds || [];
        const messageText: string = session.messageText;

        if (!selectedChannelIds.length || !messageText) {
            await ctx.answerCbQuery('Ошибка: данные сессии потеряны');
            await ctx.scene.leave();
            return;
        }

        await ctx.answerCbQuery('Публикуем...');
        await ctx.editMessageText(
            `⏳ Публикуем пост в ${selectedChannelIds.length} канала(ов)...`,
        );

        const channels = await this.prisma.channel.findMany({
            where: { id: { in: selectedChannelIds } },
        });

        let successCount = 0;
        const failures: string[] = [];

        await Promise.allSettled(
            channels.map(async (channel) => {
                try {
                    await this.bot.telegram.sendMessage(channel.telegram_id, messageText, {
                        parse_mode: 'Markdown',
                    });

                    await this.prisma.scheduledPost.create({
                        data: {
                            channel_id: channel.id,
                            publish_at: new Date(),
                            message_tmpl: messageText,
                            language: 'ru',
                            status: 'PUBLISHED',
                        },
                    });
                    successCount++;
                } catch (err) {
                    this.logger.error(`Failed to publish to ${channel.name}: ${err.message}`);
                    failures.push(`❌ ${channel.name}: ${err.message}`);
                }
            }),
        );

        const resultText = successCount > 0
            ? `✅ Пост опубликован в *${successCount}* канала(ов)!` +
              (failures.length > 0 ? `\n\n⚠️ Ошибки:\n${failures.join('\n')}` : '')
            : `❌ Не удалось опубликовать пост.\n\n${failures.join('\n')}\n\n_Убедитесь, что бот является администратором канала._`;

        await ctx.reply(resultText, { parse_mode: 'Markdown' });
        await ctx.scene.leave();
    }

    @Action('pst_edit')
    async onEditPost(@Ctx() ctx: PostContext) {
        const session = ctx.scene.session as any;
        const channels = (session.channels || [])
            .filter((ch: any) => (session.selectedChannelIds || []).includes(ch.id))
            .map((ch: any) => `*${ch.name}*`)
            .join(', ');

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `✍️ Введите новый текст поста для ${channels}:`,
            { parse_mode: 'Markdown' },
        );
    }

    // ─── Text Message Handler ─────────────────────────────────────────────────

    @On('text')
    async onText(@Ctx() ctx: PostContext, @Message('text') text: string) {
        const session = ctx.scene.session as any;
        const selectedChannelIds: string[] = session.selectedChannelIds || [];

        if (!selectedChannelIds.length) {
            // Still waiting for channel selection, ignore text
            return;
        }

        if (text === '/cancel' || text === 'Отмена') {
            await ctx.reply('❌ Публикация отменена.');
            await ctx.scene.leave();
            return;
        }

        session.messageText = text;

        const channels = session.channels || [];
        const channelNames = channels
            .filter((ch: any) => selectedChannelIds.includes(ch.id))
            .map((ch: any) => ch.name)
            .join(', ');

        const preview = text.length > 300 ? text.slice(0, 300) + '...' : text;

        await ctx.reply(
            `📋 *Предпросмотр поста*\n\n` +
            `📢 Каналы: *${channelNames}*\n\n` +
            `---\n${preview}\n---\n\n` +
            `Опубликовать во всех выбранных каналах?`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`✅ Опубликовать (${selectedChannelIds.length} кан.)`, 'pst_confirm')],
                    [Markup.button.callback('✏️ Изменить текст', 'pst_edit')],
                    [Markup.button.callback('❌ Отмена', 'pst_cancel')],
                ]),
            },
        );
    }
}
