import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

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

    constructor(private prisma: PrismaService) { }

    @OnEvent('user.registered')
    async handleUserRegisteredEvent(payload: UserRegisteredEvent) {
        this.logger.log(`Handling user.registered for user: ${payload.userId}`);

        // Create a new lead automatically when user registers
        const lead = await this.prisma.lead.create({
            data: {
                user_id: payload.userId,
                status: LeadStatus.REGISTERED,
            }
        });

        // Record history
        await this.prisma.leadStatusHistory.create({
            data: {
                lead_id: lead.id,
                new_status: LeadStatus.REGISTERED,
                changed_by: 'SYSTEM'
            }
        });
    }

    @OnEvent('test.started')
    async handleTestStartedEvent(payload: TestStartedEvent) {
        this.logger.log(`Handling test.started for user: ${payload.userId}`);

        // Find active lead or create
        let lead = await this.prisma.lead.findFirst({
            where: { user_id: payload.userId },
            orderBy: { created_at: 'desc' }
        });

        if (lead) {
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: { status: LeadStatus.STARTED_TEST }
            });

            await this.prisma.leadStatusHistory.create({
                data: {
                    lead_id: lead.id,
                    old_status: lead.status,
                    new_status: LeadStatus.STARTED_TEST,
                    changed_by: 'SYSTEM'
                }
            });
        }
    }

    @OnEvent('test.completed')
    async handleTestCompletedEvent(payload: TestCompletedEvent) {
        this.logger.log(`Handling test.completed for user: ${payload.userId}`);

        let lead = await this.prisma.lead.findFirst({
            where: { user_id: payload.userId },
            orderBy: { created_at: 'desc' }
        });

        if (lead) {
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: { status: LeadStatus.TEST_COMPLETED }
            });

            await this.prisma.leadStatusHistory.create({
                data: {
                    lead_id: lead.id,
                    old_status: lead.status,
                    new_status: LeadStatus.TEST_COMPLETED,
                    changed_by: 'SYSTEM'
                }
            });
        }
    }

    @OnEvent('consultation.requested')
    async handleConsultationRequestedEvent(payload: ConsultationRequestedEvent) {
        this.logger.log(`Handling consultation.requested for user: ${payload.userId}`);

        let lead = await this.prisma.lead.findFirst({
            where: { user_id: payload.userId },
            orderBy: { created_at: 'desc' }
        });

        if (lead) {
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: { 
                    status: LeadStatus.WAITING_CONTACT,
                    manager_comment: payload.message ? `Request message: ${payload.message}` : lead.manager_comment
                }
            });

            await this.prisma.leadStatusHistory.create({
                data: {
                    lead_id: lead.id,
                    old_status: lead.status,
                    new_status: LeadStatus.WAITING_CONTACT,
                    changed_by: 'SYSTEM'
                }
            });
        }
    }
}
