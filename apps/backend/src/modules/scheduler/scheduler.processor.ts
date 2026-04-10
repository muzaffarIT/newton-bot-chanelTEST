import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Markup } from 'telegraf';
import { PostJobPayload } from './scheduler.service';
import { PrismaService } from '../prisma/prisma.service';

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
        const { channelId, testId, messageText, scheduledPostId, language } = job.data;
        this.logger.log(`Publishing post to channel=${channelId} test=${testId} attempt=${job.attemptsMade + 1} lang=${language}`);

        try {
            let replyMarkup: any = undefined;

            if (testId) {
                // Fetch bot username dynamically for accurate deep-link
                const botInfo = await this.bot.telegram.getMe();
                const deepLink = `https://t.me/${botInfo.username}?start=test_${testId}`;
                const buttonText = language === 'uz' ? '👉 Testni topshirish' : '👉 Пройти тест';
                replyMarkup = Markup.inlineKeyboard([
                    [Markup.button.url(buttonText, deepLink)],
                ]).reply_markup;
            }

            await this.bot.telegram.sendMessage(
                channelId,
                messageText,
                {
                    parse_mode: 'Markdown',
                    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
                }
            );

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
