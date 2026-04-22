import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';

export interface PostJobPayload {
    channelId: string;
    testId?: string;
    messageText: string;
    scheduledPostId: string;
    language: string;
    mediaUrls?: string[];
}

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(
        @InjectQueue('channel-posts-queue') private readonly postsQueue: Queue,
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        @InjectBot() private readonly bot: Telegraf,
    ) { }

    async generateDeepLink(testId?: string): Promise<string> {
        if (!testId) return '';
        try {
            const botInfo = await this.bot.telegram.getMe();
            return `https://t.me/${botInfo.username}?start=test_${testId}`;
        } catch (e) {
            this.logger.error('Failed to get bot info', e);
            const fallback = this.config.get<string>('BOT_USERNAME') || 'NewtonAcademyBot';
            return `https://t.me/${fallback}?start=test_${testId}`;
        }
    }

    async generateMessageTemplate(testId?: string, lang: string = 'ru'): Promise<string> {
        const isRu = lang === 'ru';
        if (!testId) return isRu ? 'Ваш текст...' : 'Sizning matningiz...';

        const test = await this.prisma.test.findUnique({ where: { id: testId } });
        if (!test) throw new NotFoundException(`Test ${testId} not found`);

        return [
            isRu ? `📚 *Newton Academy — Диагностический тест*` : `📚 *Newton Academy — Diagnostika testi*`,
            ``,
            isRu ? `📝 Тест: *${test.title}*` : `📝 Test: *${test.title}*`,
            test.description ? `${test.description}` : null,
            ``,
            isRu ? `⏱ Продолжительность: ${test.duration_minutes} минут` : `⏱ Davomiyligi: ${test.duration_minutes} daqiqa`,
            ``,
            isRu ? `👇 Нажмите кнопку ниже, чтобы начать тест!` : `👇 Testni boshlash uchun quyidagi tugmani bosing!`,
        ].filter(Boolean).join('\n');
    }

    /**
     * Schedules or immediately publishes a post to a Telegram channel.
     * When publishNow=true: publishes DIRECTLY via Telegram API (no queue dependency).
     * When publishNow=false: enqueues to BullMQ with delay.
     */
    async scheduleTestPost(options: {
        channelId: string;
        testId?: string;
        messageText?: string;
        publishAt?: Date;
        publishNow?: boolean;
        lang?: string;
        mediaUrls?: string[];
    }) {
        const { channelId, testId, publishNow, mediaUrls } = options;

        if (!options.messageText && !testId) {
            throw new Error('Message text is required when no test is specified');
        }

        const lang = options.lang || 'ru';
        const messageText = options.messageText || await this.generateMessageTemplate(testId, lang);
        const publishAt = publishNow ? new Date() : (options.publishAt || new Date());

        this.logger.log(`Post: test=${testId} channel=${channelId} publishNow=${publishNow}`);

        // Get channel from DB
        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) throw new Error(`Channel ${channelId} not found in database`);

        if (publishNow) {
            // ─── DIRECT PUBLISH ───────────────────────────────────────────────────
            try {
                // Build post with deep link button if test is attached
                const deepLink = await this.generateDeepLink(testId);
                const extra: any = { parse_mode: 'Markdown' };

                if (testId && deepLink && (!mediaUrls || mediaUrls.length <= 1)) {
                    extra.reply_markup = {
                        inline_keyboard: [[
                            { text: lang === 'ru' ? '📝 Начать тест' : '📝 Testni boshlash', url: deepLink }
                        ]]
                    };
                }

                if (mediaUrls && mediaUrls.length > 0) {
                    const visuals: string[] = [];
                    const documents: string[] = [];

                    for (const url of mediaUrls) {
                        const ext = path.extname(url).toLowerCase();
                        const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].includes(ext);
                        const isPhoto = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
                        if (isVideo || isPhoto) {
                            visuals.push(url);
                        } else {
                            documents.push(url);
                        }
                    }

                    let finalCaption = messageText;
                    if (testId && deepLink && mediaUrls.length > 1) {
                        finalCaption += `\n\n[📝 Начать тест](${deepLink})`;
                    }

                    let captionSent = false;
                    const getCaptionProps = () => {
                        if (!captionSent) {
                            captionSent = true;
                            return { caption: finalCaption, parse_mode: 'Markdown' as const };
                        }
                        return {};
                    };

                    // Send visuals
                    for (let c = 0; c < visuals.length; c += 10) {
                        const chunk = visuals.slice(c, c + 10);
                        if (chunk.length === 1) {
                            const filePath = path.join(process.cwd(), 'public', chunk[0]);
                            const ext = path.extname(chunk[0]).toLowerCase();
                            const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].includes(ext);
                            const extraProps = getCaptionProps();
                            if (isVideo) {
                                await this.bot.telegram.sendVideo(channel.telegram_id, { source: filePath }, { ...extra, ...extraProps });
                            } else {
                                await this.bot.telegram.sendPhoto(channel.telegram_id, { source: filePath }, { ...extra, ...extraProps });
                            }
                        } else {
                            const mediaGroup = chunk.map((url, i) => {
                                const filePath = path.join(process.cwd(), 'public', url);
                                const ext = path.extname(url).toLowerCase();
                                const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].includes(ext);
                                return {
                                    type: isVideo ? 'video' : 'photo',
                                    media: { source: filePath },
                                    ...(i === 0 ? getCaptionProps() : {})
                                };
                            });
                            await this.bot.telegram.sendMediaGroup(channel.telegram_id, mediaGroup as any);
                        }
                    }

                    // Send documents
                    for (let c = 0; c < documents.length; c += 10) {
                        const chunk = documents.slice(c, c + 10);
                        if (chunk.length === 1) {
                            const filePath = path.join(process.cwd(), 'public', chunk[0]);
                            const extraProps = getCaptionProps();
                            await this.bot.telegram.sendDocument(channel.telegram_id, { source: filePath }, { ...extra, ...extraProps });
                        } else {
                            const mediaGroup = chunk.map((url, i) => {
                                const filePath = path.join(process.cwd(), 'public', url);
                                return {
                                    type: 'document',
                                    media: { source: filePath },
                                    ...(i === 0 ? getCaptionProps() : {})
                                };
                            });
                            await this.bot.telegram.sendMediaGroup(channel.telegram_id, mediaGroup as any);
                        }
                    }
                } else {
                    await this.bot.telegram.sendMessage(channel.telegram_id, messageText, extra);
                }
                
                this.logger.log(`✅ Post published directly to channel ${channel.name}`);

                const scheduledPost = await this.prisma.scheduledPost.create({
                    data: {
                        test_id: testId,
                        channel_id: channelId,
                        publish_at: publishAt,
                        message_tmpl: messageText,
                        media_urls: mediaUrls || [],
                        language: lang,
                        status: 'PUBLISHED',
                    },
                });

                return {
                    success: true,
                    scheduledPostId: scheduledPost.id,
                    publishAt,
                    publishedNow: true,
                    deepLink,
                };
            } catch (err) {
                this.logger.error(`❌ Direct publish failed: ${err.message}`);

                // Save as FAILED in DB for visibility
                await this.prisma.scheduledPost.create({
                    data: {
                        test_id: testId,
                        channel_id: channelId,
                        publish_at: publishAt,
                        message_tmpl: messageText,
                        media_urls: mediaUrls || [],
                        language: lang,
                        status: 'FAILED',
                        error_log: err.message,
                    },
                });

                throw new Error(`Ошибка публикации: ${err.message}. Убедитесь что бот является администратором канала.`);
            }
        } else {
            // ─── QUEUED PUBLISH ───────────────────────────────────────────────────
            const delay = Math.max(0, publishAt.getTime() - Date.now());

            const scheduledPost = await this.prisma.scheduledPost.create({
                data: {
                    test_id: testId,
                    channel_id: channelId,
                    publish_at: publishAt,
                    message_tmpl: messageText,
                    media_urls: mediaUrls || [],
                    language: lang,
                    status: 'PENDING',
                },
            });

            await this.postsQueue.add(
                'publish-post',
                {
                    channelId,
                    testId,
                    messageText,
                    scheduledPostId: scheduledPost.id,
                    language: lang,
                    mediaUrls: mediaUrls || [],
                } as PostJobPayload,
                {
                    delay,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                },
            );

            return {
                success: true,
                scheduledPostId: scheduledPost.id,
                publishAt,
                publishedNow: false,
                deepLink: await this.generateDeepLink(testId),
            };
        }
    }

    async listScheduledPosts(page = 1, limit = 20) {
        const [posts, total] = await Promise.all([
            this.prisma.scheduledPost.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { publish_at: 'desc' },
                include: { test: { select: { title: true } }, channel: { select: { name: true } } },
            }),
            this.prisma.scheduledPost.count(),
        ]);
        return { posts, total, page, limit };
    }

    async cancelScheduledPost(id: string) {
        const post = await this.prisma.scheduledPost.findUnique({ where: { id } });
        if (!post) throw new NotFoundException(`ScheduledPost ${id} not found`);
        if (post.status !== 'PENDING') {
            throw new Error(`Cannot cancel post with status ${post.status}`);
        }
        await this.prisma.scheduledPost.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        return { success: true };
    }
}
