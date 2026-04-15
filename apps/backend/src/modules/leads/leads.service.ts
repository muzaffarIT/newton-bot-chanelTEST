import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus } from '@prisma/client';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';

export class UserRegisteredEvent {
    constructor(public readonly userId: string, public readonly telegramId: string) { }
}

export class TestStartedEvent {
    constructor(public readonly userId: string, public readonly sessionId: string) { }
}

export class TestCompletedEvent {
    constructor(public readonly userId: string, public readonly resultId: string) { }
}

export class ConsultationRequestedEvent {
    constructor(public readonly userId: string, public readonly message?: string) { }
}

@Injectable()
export class LeadsService {
    private readonly logger = new Logger(LeadsService.name);

    constructor(
        private readonly prisma: PrismaService,
        @InjectBot() private readonly bot: Telegraf,
        private readonly config: ConfigService,
    ) { }

    // ── Event: user.registered ────────────────────────────────────────────────
    @OnEvent('user.registered')
    async handleUserRegisteredEvent(payload: UserRegisteredEvent) {
        this.logger.log(`Handling user.registered for user: ${payload.userId}`);
        const lead = await this.prisma.lead.create({
            data: { user_id: payload.userId, status: LeadStatus.REGISTERED },
        });
        await this.prisma.leadStatusHistory.create({
            data: { lead_id: lead.id, new_status: LeadStatus.REGISTERED, changed_by: 'SYSTEM' },
        });
    }

    // ── Event: test.started ───────────────────────────────────────────────────
    @OnEvent('test.started')
    async handleTestStartedEvent(payload: TestStartedEvent) {
        this.logger.log(`Handling test.started for user: ${payload.userId}`);
        const lead = await this.prisma.lead.findFirst({
            where: { user_id: payload.userId },
            orderBy: { created_at: 'desc' },
        });
        if (!lead) return;
        await this.prisma.lead.update({ where: { id: lead.id }, data: { status: LeadStatus.STARTED_TEST } });
        await this.prisma.leadStatusHistory.create({
            data: { lead_id: lead.id, old_status: lead.status, new_status: LeadStatus.STARTED_TEST, changed_by: 'SYSTEM' },
        });
    }

    // ── Event: test.completed ─────────────────────────────────────────────────
    @OnEvent('test.completed')
    async handleTestCompletedEvent(payload: TestCompletedEvent) {
        this.logger.log(`Handling test.completed for user: ${payload.userId}`);
        const lead = await this.prisma.lead.findFirst({
            where: { user_id: payload.userId },
            orderBy: { created_at: 'desc' },
        });
        if (!lead) return;

        const currentTags: string[] = (lead as any).tags || [];
        const newTags = [...new Set([...currentTags, 'тест_пройден'])];

        await this.prisma.lead.update({
            where: { id: lead.id },
            data: { status: LeadStatus.TEST_COMPLETED, tags: newTags } as any,
        });
        await this.prisma.leadStatusHistory.create({
            data: { lead_id: lead.id, old_status: lead.status, new_status: LeadStatus.TEST_COMPLETED, changed_by: 'SYSTEM' },
        });
    }

    // ── Event: consultation.requested ─────────────────────────────────────────
    @OnEvent('consultation.requested')
    async handleConsultationRequestedEvent(payload: ConsultationRequestedEvent) {
        this.logger.log(`Handling consultation.requested for user: ${payload.userId}`);
        const lead = await this.prisma.lead.findFirst({
            where: { user_id: payload.userId },
            orderBy: { created_at: 'desc' },
        });
        if (!lead) return;

        const currentTags: string[] = (lead as any).tags || [];
        const newTags = [...new Set([...currentTags, 'горячий', 'консультация'])];

        await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                status: LeadStatus.WAITING_CONTACT,
                manager_comment: payload.message ? `Запрос: ${payload.message}` : lead.manager_comment,
                tags: newTags,
            } as any,
        });
        await this.prisma.leadStatusHistory.create({
            data: { lead_id: lead.id, old_status: lead.status, new_status: LeadStatus.WAITING_CONTACT, changed_by: 'SYSTEM' },
        });

        // 🔔 Notify admin Telegram group
        await this.sendAdminNotification(payload.userId).catch(e =>
            this.logger.warn(`Telegram notify failed: ${e.message}`)
        );
    }

    // ── Private: send admin Telegram notification ─────────────────────────────
    private async sendAdminNotification(userId: string) {
        const adminGroupId = this.config.get<string>('ADMIN_GROUP_CHAT_ID');
        if (!adminGroupId) return;

        const [user, latestResult] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: userId }, include: { direction: true } }),
            this.prisma.testResult.findFirst({
                where: { session: { user_id: userId } },
                orderBy: { created_at: 'desc' },
                include: { session: { include: { test: { select: { title: true } } } } },
            }),
        ]);

        const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Неизвестно';
        const phone = user?.phone || '—';
        const grade = user?.grade ? `${user.grade} класс` : '—';

        let resultLine = '';
        if (latestResult) {
            const pct = latestResult.score_percentage ?? 0;
            const testName = latestResult.session?.test?.title || 'Тест';
            const lvl = pct >= 85 ? 'Отлично 🏆' : pct >= 70 ? 'Хорошо 🌟' : pct >= 50 ? 'Средне 📈' : 'Нужна работа 💪';
            resultLine = `📊 *${testName}:* ${pct}% — ${lvl}`;
        }

        const lines = [
            `🔥 *ГОРЯЧИЙ ЛИД — Запрос консультации!*`,
            ``,
            `👤 *${name}*`,
            `📱 ${phone}`,
            `🎓 ${grade}`,
        ];
        if (resultLine) lines.push(resultLine);
        lines.push(``, `💡 Откройте Лиды в Админ Панели`, ``, `#горячий #консультация #waiting\\_contact`);

        await this.bot.telegram.sendMessage(adminGroupId, lines.join('\n'), { parse_mode: 'Markdown' });
    }
}
