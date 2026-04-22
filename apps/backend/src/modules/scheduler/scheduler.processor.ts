import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Markup } from 'telegraf';
import { PostJobPayload } from './scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Processor('channel-posts-queue')
@Injectable()
export class SchedulerProcessor extends WorkerHost {
    private readonly logger = new Logger(SchedulerProcessor.name);

    constructor(
        @InjectBot() private bot: Telegraf,
        private prisma: PrismaService,
    ) {
        super();
    }

    async process(job: Job<PostJobPayload, any, string>): Promise<any> {
        const { channelId, testId, messageText, scheduledPostId, language, mediaUrls } = job.data;
        this.logger.log(`Publishing post to channel=${channelId} test=${testId} attempt=${job.attemptsMade + 1} lang=${language}`);

        try {
            let replyMarkup: any = undefined;

            let finalCaption = messageText;
            if (testId) {
                // Fetch bot username dynamically for accurate deep-link
                const botInfo = await this.bot.telegram.getMe();
                const deepLink = `https://t.me/${botInfo.username}?start=test_${testId}`;
                const buttonText = language === 'uz' ? '👉 Testni topshirish' : '👉 Пройти тест';
                
                if (!mediaUrls || mediaUrls.length <= 1) {
                    replyMarkup = Markup.inlineKeyboard([
                        [Markup.button.url(buttonText, deepLink)],
                    ]).reply_markup;
                } else {
                    finalCaption += `\n\n[📝 ${buttonText}](${deepLink})`;
                }
            }

            const channel = await this.prisma.channel.findUnique({
                where: { id: channelId }
            });

            if (!channel) throw new Error(`Channel not found in DB: ${channelId}`);

            const extra: any = {
                parse_mode: 'Markdown',
                ...(replyMarkup ? { reply_markup: replyMarkup } : {})
            };

            if (mediaUrls && mediaUrls.length > 0) {
                if (mediaUrls.length === 1) {
                    const filePath = path.join(process.cwd(), 'public', mediaUrls[0]);
                    const ext = path.extname(mediaUrls[0]).toLowerCase();
                    if (ext === '.mp4' || ext === '.mov') {
                        await this.bot.telegram.sendVideo(channel.telegram_id, { source: filePath }, { ...extra, caption: finalCaption });
                    } else {
                        await this.bot.telegram.sendPhoto(channel.telegram_id, { source: filePath }, { ...extra, caption: finalCaption });
                    }
                } else {
                    const chunkSize = 10;
                    for (let c = 0; c < mediaUrls.length; c += chunkSize) {
                        const chunk = mediaUrls.slice(c, c + chunkSize);
                        const mediaGroup = chunk.map((url, i) => {
                            const filePath = path.join(process.cwd(), 'public', url);
                            const ext = path.extname(url).toLowerCase();
                            const type = (ext === '.mp4' || ext === '.mov') ? 'video' : 'photo';
                            return {
                                type,
                                media: { source: filePath },
                                ...((c === 0 && i === 0) ? { caption: finalCaption, parse_mode: 'Markdown' } : {})
                            };
                        });
                        await this.bot.telegram.sendMediaGroup(channel.telegram_id, mediaGroup as any);
                    }
                }
            } else {
                await this.bot.telegram.sendMessage(
                    channel.telegram_id,
                    finalCaption,
                    extra
                );
            }

            this.logger.log(`✅ Post published for test=${testId}`);

            await this.prisma.scheduledPost.update({
                where: { id: scheduledPostId },
                data: { status: 'PUBLISHED' },
            });

        } catch (error) {
            this.logger.error(`❌ Failed to publish post [attempt ${job.attemptsMade + 1}]`, error?.message);

            // Update error log
            await this.prisma.scheduledPost.update({
                where: { id: scheduledPostId },
                data: {
                    status: job.attemptsMade >= 2 ? 'FAILED' : 'PENDING',
                    error_log: error?.message || 'Unknown error',
                },
            });

            // Re-throw so BullMQ retries according to job config
            throw error;
        }
    }
}
