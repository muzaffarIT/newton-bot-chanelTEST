import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestStartedEvent, TestCompletedEvent } from '../leads/leads.service';
import { PointsService } from '../points/points.service';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class SessionsService {
    constructor(
        private prisma: PrismaService,
        @InjectQueue('test-timer-queue') private testTimerQueue: Queue, // Injecting BullMQ queue
        private eventEmitter: EventEmitter2,
        private pointsService: PointsService,
        private diagnosticsService: DiagnosticsService,
    ) { }

    /**
     * Starts a new test session for a user.
     * Initializes the session in the DB and enqueues a timer job.
     */
    async startTestSession(userId: string, testId: string): Promise<any> { // Changed return type to any for now, assuming TestSession is a Prisma type
        // 1. Find the test to get its duration
        const test = await this.prisma.test.findUnique({
            where: { id: testId },
        });

        if (!test || !test.is_active) {
            throw new NotFoundException('Test not found or inactive');
        }

        // 2. Check if an active session already exists
        const existingActiveSession = await this.prisma.testSession.findFirst({
            where: {
                user_id: userId,
                test_id: testId,
                status: SessionStatus.IN_PROGRESS,
            },
        });

        if (existingActiveSession) {
            throw new BadRequestException('An active session already exists for this test.');
        }

        // 2.5 Check retake policy
        if (!test.allow_retakes) {
            const previousSession = await this.prisma.testSession.findFirst({
                where: {
                    user_id: userId,
                    test_id: testId,
                    status: { in: ['SUBMITTED', 'EXPIRED', 'CHECKED'] }
                }
            });
            if (previousSession) {
                throw new BadRequestException('You have already taken this test and retakes are not allowed.');
            }
        }

        // 3. Calculate timestamps
        const startedAt = new Date();
        // test.duration_minutes is in minutes, convert to milliseconds
        const durationMs = test.duration_minutes * 60 * 1000;
        const expiresAt = new Date(startedAt.getTime() + durationMs);

        // 4. Create the session in the database
        const session = await this.prisma.testSession.create({
            data: {
                user_id: userId,
                test_id: testId,
                started_at: startedAt,
                expires_at: expiresAt,
                status: 'IN_PROGRESS',
            },
        });

        // 5. Enqueue the BullMQ job to auto-expire the test when duration ends
        const job = await this.testTimerQueue.add(
            'auto-expire-test', // Job name
            { sessionId: session.id }, // Payload
            { delay: durationMs }, // Job configuration (delay)
        );

        // 6. Save job_id back to session for cancellation
        await this.prisma.testSession.update({
            where: { id: session.id },
            data: { job_id: job.id as string }
        });

        this.eventEmitter.emit('test.started', new TestStartedEvent(userId, session.id));

        return session;
    }

    /**
     * get active session for student to resume
     */
    async getActiveSession(userId: string, testId: string) {
        return this.prisma.testSession.findFirst({
            where: {
                user_id: userId,
                test_id: testId,
                status: SessionStatus.IN_PROGRESS,
            },
            include: {
                answers: true,
            },
        });
    }

    /**
     * Save an answer to the database.
     * Updates correctly if answer already exists.
     */
    async saveAnswer(userId: string, sessionId: string, questionId: string, optionId: string) {
        // 1. Verify session ownership and status
        const session = await this.prisma.testSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.user_id !== userId || session.status !== SessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Invalid session or session not in progress');
        }

        // 2. Upsert answer
        return this.prisma.testAnswer.upsert({
            where: {
                session_id_question_id: {
                    session_id: sessionId,
                    question_id: questionId,
                },
            },
            update: {
                selected_option_id: optionId,
            },
            create: {
                session_id: sessionId,
                question_id: questionId,
                selected_option_id: optionId,
            },
        });
    }

    /**
     * Manually submits a test session (e.g. user clicked "Finish Test").
     * Uses atomic update to guarantee idempotency.
     */
    async submitTestSession(userId: string, sessionId: string): Promise<any> {
        // 1. Atomic status update. Only update if IN_PROGRESS.
        const updateResult = await this.prisma.testSession.updateMany({
            where: {
                id: sessionId,
                user_id: userId,
                status: SessionStatus.IN_PROGRESS
            },
            data: { status: SessionStatus.SUBMITTED },
        });

        if (updateResult.count === 0) {
            throw new BadRequestException('Session is already submitted, expired, or does not exist.');
        }

        // 2. Fetch updated session to get job_id
        const session = await this.prisma.testSession.findUnique({ where: { id: sessionId } });

        // 3. Halt BullMQ timer job
        if (session.job_id) {
            const job = await this.testTimerQueue.getJob(session.job_id);
            if (job) {
                await job.remove();
            }
        }

        // 4. Calculate diagnostics
        const result = await this.diagnosticsService.calculateResult(sessionId);

        // 5. Award points (fixed award for now, e.g. 10 points)
        await this.pointsService.addPoints(userId, 10, `TEST_COMPLETED: ${sessionId}`);

        // 6. Final status update to CHECKED
        await this.prisma.testSession.update({
            where: { id: sessionId },
            data: { status: SessionStatus.CHECKED },
        });

        this.eventEmitter.emit('test.completed', new TestCompletedEvent(userId, result.id));

        return { session, result };
    }
}
