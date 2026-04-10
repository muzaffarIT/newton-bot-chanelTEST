import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface PostJobPayload {
    channelId: string;
    testId?: string;
    messageText: string;
    scheduledPostId: string;
    language: string;
}

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(
        @InjectQueue('channel-posts-queue') private readonly postsQueue: Queue,
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    /**
     * Generates a deep-link URL for a given test.
     */
    generateDeepLink(testId?: string): string {
        if (!testId) return '';
        const botUsername = this.config.get<string>('BOT_USERNAME') || 'NewtonAcademyBot';
        return `https://t.me/${botUsername}?start=test_${testId}`;
    }

    /**
     * Auto-generates a post message from test metadata.
     * Uses the stored channel language or defaults to Russian.
     */
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
     * Schedules (or immediately publishes) a post to a Telegram channel.
     */
    async scheduleTestPost(options: {
        channelId: string;
        testId?: string;
        messageText?: string;
        publishAt?: Date;
        publishNow?: boolean;
        lang?: string;
    }) {
        const { channelId, testId, publishNow } = options;

        // Auto-generate message if not provided
        if (!options.messageText && !testId) {
            throw new Error('Message text is required when no test is specified');
        }
        const messageText = options.messageText || await this.generateMessageTemplate(testId);

        const publishAt = publishNow ? new Date() : (options.publishAt || new Date());
        const delay = Math.max(0, publishAt.getTime() - Date.now());

        this.logger.log(`Scheduling post: test=${testId} channel=${channelId} delay=${delay}ms publishNow=${publishNow}`);

        // Save to DB
        const scheduledPost = await this.prisma.scheduledPost.create({
            data: {
                test_id: testId,
                channel_id: channelId,
                publish_at: publishAt,
                message_tmpl: messageText,
                language: options.lang || 'ru',
                status: 'PENDING',
            },
        });

        // Enqueue with appropriate delay
        await this.postsQueue.add(
            'publish-post',
            {
                channelId,
                testId,
                messageText,
                scheduledPostId: scheduledPost.id,
                language: options.lang || 'ru',
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
            deepLink: this.generateDeepLink(testId),
        };
    }

    /**
     * Returns all scheduled posts for admin view.
     */
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

    /**
     * Cancels a pending scheduled post.
     */
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
