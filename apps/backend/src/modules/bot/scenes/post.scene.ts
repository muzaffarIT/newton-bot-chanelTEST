import { Injectable, Logger } from '@nestjs/common';
import { Scene, SceneEnter, SceneLeave, Ctx, On, Action, Message } from 'nestjs-telegraf';
import { Scenes, Markup, Context } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

// We need NodeJS.Timeout for debouncing media groups
type Timeout = ReturnType<typeof setTimeout>;

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
    private previewTimeouts = new Map<number, Timeout>();

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
        (ctx.scene.session as any).postMessages = [];
        (ctx.scene.session as any).fromChatId = null;

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
            `✅ Каналы выбраны: ${names}\n\n✍️ Теперь отправьте текст, фото, видео или медиагруппу для поста.\n\n_Отправьте /cancel для отмены._`,
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
        const messageIds: number[] = session.postMessages || [];
        const fromChatId: number = session.fromChatId;

        if (!selectedChannelIds.length || !messageIds.length || !fromChatId) {
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
                    await this.bot.telegram.copyMessages(
                        channel.telegram_id,
                        fromChatId,
                        messageIds,
                    );

                    await this.prisma.scheduledPost.create({
                        data: {
                            channel_id: channel.id,
                            publish_at: new Date(),
                            message_tmpl: `[Медиа пост: ${messageIds.length} сообщений]`,
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
        session.postMessages = [];
        
        const channels = (session.channels || [])
            .filter((ch: any) => (session.selectedChannelIds || []).includes(ch.id))
            .map((ch: any) => `*${ch.name}*`)
            .join(', ');

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `✍️ Отправьте новый текст, фото или видео поста для ${channels}:`,
            { parse_mode: 'Markdown' },
        );
    }

    // ─── Message Handler ──────────────────────────────────────────────────────

    @On('message')
    async onMessage(@Ctx() ctx: PostContext) {
        const session = ctx.scene.session as any;
        const selectedChannelIds: string[] = session.selectedChannelIds || [];

        if (!selectedChannelIds.length) {
            // Still waiting for channel selection, ignore
            return;
        }

        const message = ctx.message as any;
        if (message.text === '/cancel' || message.text === 'Отмена') {
            await ctx.reply('❌ Публикация отменена.');
            await ctx.scene.leave();
            return;
        }

        if (!session.postMessages) {
            session.postMessages = [];
        }
        
        session.postMessages.push(message.message_id);
        session.fromChatId = ctx.chat?.id;

        const userId = ctx.from?.id;
        if (userId) {
            if (this.previewTimeouts.has(userId)) {
                clearTimeout(this.previewTimeouts.get(userId));
            }
            
            this.previewTimeouts.set(userId, setTimeout(async () => {
                this.previewTimeouts.delete(userId);
                try {
                    await this.showPreview(ctx);
                } catch (err) {
                    this.logger.error(`Error showing preview: ${err}`);
                }
            }, 1500));
        }
    }

    private async showPreview(ctx: PostContext) {
        const session = ctx.scene.session as any;
        const selectedChannelIds: string[] = session.selectedChannelIds || [];
        const messages: number[] = session.postMessages || [];
        const channels = session.channels || [];

        if (!messages.length) return;

        const channelNames = channels
            .filter((ch: any) => selectedChannelIds.includes(ch.id))
            .map((ch: any) => ch.name)
            .join(', ');

        await ctx.reply(
            `📋 *Предпросмотр поста*\n\n` +
            `📢 Каналы: *${channelNames}*\n` +
            `📎 Прикреплено частей: *${messages.length}*\n\n` +
            `Опубликовать во всех выбранных каналах?`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`✅ Опубликовать (${selectedChannelIds.length} кан.)`, 'pst_confirm')],
                    [Markup.button.callback('✏️ Изменить (начать заново)', 'pst_edit')],
                    [Markup.button.callback('❌ Отмена', 'pst_cancel')],
                ]),
            },
        );
    }
}
