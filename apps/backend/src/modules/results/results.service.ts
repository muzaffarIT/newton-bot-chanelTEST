import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TestCompletedEvent } from '../leads/leads.service';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class ResultNotificationService {
    private readonly logger = new Logger(ResultNotificationService.name);

    constructor(
        private prisma: PrismaService,
        @InjectBot() private bot: Telegraf<any>,
        private i18n: I18nService,
    ) { }

    @OnEvent('test.completed')
    async handleTestCompleted(payload: TestCompletedEvent) {
        this.logger.log(`Sending result notification for result: ${payload.resultId}`);

        // Fetch result & User
        const result = await this.prisma.testResult.findUnique({
            where: { id: payload.resultId },
            include: {
                session: {
                    include: {
                        user: true,
                        test: true
                    }
                }
            }
        });

        if (!result) return;

        const user = result.session.user;
        const lang = user.language_code || 'ru';

        // Build breakdown string
        let breakdownText = '';
        const breakdown = result.skill_breakdown as Record<string, any>;
        for (const [topic, data] of Object.entries(breakdown)) {
            let icon = '✅';
            if (data.isWeak) icon = '❌';
            else if (!data.isStrong) icon = '⚠️';

            breakdownText += `${icon} *${topic}*: ${data.percentage}%\n`;
        }

        const message = await this.i18n.t('bot.result.summary', {
            lang,
            args: {
                testTitle: result.session.test.title,
                score: result.score_percentage,
                correct: result.correct_count,
                incorrect: result.incorrect_count,
                breakdown: breakdownText,
                cta: await this.getCallToActionText(result.level, lang)
            }
        });

        try {
            await this.bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
        } catch (e) {
            this.logger.error(`Failed to send result message to user ${user.telegram_id}`, e);
        }
    }

    private async getCallToActionText(level: string, lang: string): Promise<string> {
        if (level === 'HIGH') {
            return await this.i18n.t('bot.result.cta_high', { lang });
        } else if (level === 'MEDIUM') {
            return await this.i18n.t('bot.result.cta_medium', { lang });
        } else {
            return await this.i18n.t('bot.result.cta_low', { lang });
        }
    }
}
