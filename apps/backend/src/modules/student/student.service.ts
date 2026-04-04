import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { LeadStatus, SessionStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsultationRequestedEvent } from '../leads/leads.service';

@Injectable()
export class StudentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly sessionsService: SessionsService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { parent: true, direction: true, redemptions: { include: { reward: true } } }
        });
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        return user;
    }

    async getAvailableTests(userId: string) {
        return this.prisma.test.findMany({
            where: { is_active: true },
            select: {
                id: true,
                title: true,
                description: true,
                duration_minutes: true,
                questions: { select: { id: true } }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async getActiveSession(userId: string) {
        const session = await this.prisma.testSession.findFirst({
            where: { user_id: userId, status: SessionStatus.IN_PROGRESS },
            include: {
                test: {
                    include: { questions: { include: { options: true } } }
                },
                answers: true
            }
        });
        return session;
    }

    async startSession(userId: string, testId: string) {
        // sessionsService.startTestSession already has logic for checking retakes etc.
        return this.sessionsService.startTestSession(userId, testId);
    }

    async saveAnswer(userId: string, sessionId: string, questionId: string, optionId: string) {
        // Safety check: is this session owned by the user?
        const session = await this.prisma.testSession.findUnique({ where: { id: sessionId } });
        if (!session || session.user_id !== userId) throw new HttpException('Session not found', HttpStatus.FORBIDDEN);

        return this.prisma.testAnswer.upsert({
            where: { session_id_question_id: { session_id: sessionId, question_id: questionId } },
            update: { selected_option_id: optionId },
            create: { session_id: sessionId, question_id: questionId, selected_option_id: optionId }
        });
    }

    async submitSession(userId: string, sessionId: string) {
        const session = await this.prisma.testSession.findUnique({ where: { id: sessionId } });
        if (!session || session.user_id !== userId) throw new HttpException('Session not found', HttpStatus.FORBIDDEN);

        return this.sessionsService.submitTestSession(userId, sessionId);
    }

    async getResults(userId: string) {
        return this.prisma.testResult.findMany({
            where: { session: { user_id: userId } },
            include: { session: { include: { test: true } } },
            orderBy: { created_at: 'desc' }
        });
    }

    async getResult(userId: string, resultId: string) {
        const result = await this.prisma.testResult.findUnique({
            where: { id: resultId },
            include: { session: { include: { test: { include: { questions: true } } } } }
        });
        if (!result || result.session.user_id !== userId) throw new HttpException('Result not found', HttpStatus.NOT_FOUND);
        return result;
    }

    async requestConsultation(userId: string, courseType: 'ONLINE' | 'OFFLINE') {
        const message = `Запрос на консультацию: ${courseType}`;
        this.eventEmitter.emit('consultation.requested', new ConsultationRequestedEvent(userId, message));
        return { success: true };
    }
}
