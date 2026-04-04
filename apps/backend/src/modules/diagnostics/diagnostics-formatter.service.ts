import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { Markup } from 'telegraf';

interface TopicStat {
    name: string;
    percentage: number;
    isStrong: boolean;
    isWeak: boolean;
}

@Injectable()
export class DiagnosticsFormatterService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService,
    ) { }

    /**
     * Formats a TestResult into a localized user-facing message with inline CTA buttons.
     */
    async formatResultMessage(resultId: string, lang: string = 'ru'): Promise<{
        text: string;
        inlineKeyboard: ReturnType<typeof Markup.inlineKeyboard>;
    }> {
        const result = await this.prisma.testResult.findUnique({
            where: { id: resultId },
            include: {
                session: {
                    include: { test: true },
                },
                recommendation: true,
            },
        });

        if (!result) {
            return { text: 'Результат не найден.', inlineKeyboard: Markup.inlineKeyboard([]) };
        }

        const test = result.session.test;
        const scorePercent = result.score_percentage;
        const skillBreakdown = result.skill_breakdown as Record<string, {
            percentage: number;
            isStrong: boolean;
            isWeak: boolean;
        }>;

        // Sort topics into strong/weak/neutral
        const strongTopics: TopicStat[] = [];
        const weakTopics: TopicStat[] = [];

        for (const [name, stats] of Object.entries(skillBreakdown)) {
            const topic: TopicStat = { name, percentage: stats.percentage, isStrong: stats.isStrong, isWeak: stats.isWeak };
            if (stats.isStrong) strongTopics.push(topic);
            else if (stats.isWeak) weakTopics.push(topic);
        }

        // Determine preparation level label
        let levelLabel: string;
        if (scorePercent >= 76) {
            levelLabel = lang === 'uz' ? 'Yuqori daraja 🔥' : 'Высокий уровень 🔥';
        } else if (scorePercent >= 41) {
            levelLabel = lang === 'uz' ? 'O\'rta daraja 👍' : 'Средний уровень 👍';
        } else {
            levelLabel = lang === 'uz' ? 'Boshlang\'ich daraja 💪' : 'Начальный уровень 💪';
        }

        // Build message
        let text = '';
        if (lang === 'uz') {
            text += `📊 *Test natijalari: ${test.title}*\n\n`;
            text += `Umumiy balingiz: *${scorePercent.toFixed(1)}%* — ${levelLabel}\n`;
            text += `To'g'ri javoblar: ${result.correct_count}\n`;
            text += `Noto'g'ri javoblar: ${result.incorrect_count}\n\n`;

            if (strongTopics.length > 0) {
                text += `📈 *Kuchli tomonlaringiz:*\n`;
                for (const t of strongTopics) {
                    text += `✅ ${t.name}: ${t.percentage.toFixed(0)}%\n`;
                }
                text += '\n';
            }

            if (weakTopics.length > 0) {
                text += `📉 *O'sish zonalari:*\n`;
                for (const t of weakTopics) {
                    text += `⚠️ ${t.name}: ${t.percentage.toFixed(0)}% — mashq kerak\n`;
                }
                text += '\n';
            }

            // CTA
            if (scorePercent >= 76) {
                text += `💡 *Tavsiya:*\n${result.recommendation?.summary_text || 'Olimpiada va kirish imtihonlariga tayyorgarlik kurslarini maslahat beramiz.'}`;
            } else if (scorePercent >= 41) {
                text += `💡 *Tavsiya:*\n${result.recommendation?.summary_text || 'Asosiy tayyorgarlik kurslarimizda bo\'shliqlarni yopishingiz mumkin.'}`;
            } else {
                text += `💡 *Tavsiya:*\n${result.recommendation?.summary_text || 'Noldan baza yaratish uchun individual dastur ishlab chiqdik.'}`;
            }
        } else {
            text += `📊 *Результаты теста: ${test.title}*\n\n`;
            text += `Ваш общий балл: *${scorePercent.toFixed(1)}%* — ${levelLabel}\n`;
            text += `Правильных ответов: ${result.correct_count}\n`;
            text += `Ошибок: ${result.incorrect_count}\n\n`;

            if (strongTopics.length > 0) {
                text += `📈 *Ваши сильные стороны:*\n`;
                for (const t of strongTopics) {
                    text += `✅ ${t.name}: ${t.percentage.toFixed(0)}%\n`;
                }
                text += '\n';
            }

            if (weakTopics.length > 0) {
                text += `📉 *Зоны для роста:*\n`;
                for (const t of weakTopics) {
                    text += `⚠️ ${t.name}: ${t.percentage.toFixed(0)}% — требуется практика\n`;
                }
                text += '\n';
            }

            // CTA text
            if (scorePercent >= 76) {
                text += `💡 *Рекомендация:*\n${result.recommendation?.summary_text || 'Рекомендуем записать вас в профильные группы подготовки к олимпиадам и поступлению.'}`;
            } else if (scorePercent >= 41) {
                text += `💡 *Рекомендация:*\n${result.recommendation?.summary_text || 'На наших курсах вы легко закроете пробелы по слабым темам.'}`;
            } else {
                text += `💡 *Рекомендация:*\n${result.recommendation?.summary_text || 'Мы разработаем индивидуальную программу для подтягивания базы с нуля.'}`;
            }
        }

        // CTA buttons: always show both enroll options and contact
        const ctaButtons = lang === 'uz' ? [
            [Markup.button.callback('🌐 Onlayn kursga yozilish', 'cta_enroll_online')],
            [Markup.button.callback('🏫 Oflayn kursga yozilish', 'cta_enroll_offline')],
            [Markup.button.callback('💬 Menejer bilan bog\'lanish', 'cta_contact_manager')],
        ] : [
            [Markup.button.callback('🌐 Записаться онлайн', 'cta_enroll_online')],
            [Markup.button.callback('🏫 Записаться офлайн', 'cta_enroll_offline')],
            [Markup.button.callback('💬 Связаться с менеджером', 'cta_contact_manager')],
        ];

        return {
            text,
            inlineKeyboard: Markup.inlineKeyboard(ctaButtons),
        };
    }
}
