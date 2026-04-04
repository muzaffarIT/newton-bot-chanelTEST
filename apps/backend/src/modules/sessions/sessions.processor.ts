import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { DiagnosticsService } from '../diagnostics/diagnostics.service'; // Service responsible for calculating results
import { Injectable, Logger } from '@nestjs/common';

@Processor('test-timer-queue')
@Injectable()
export class SessionsProcessor extends WorkerHost {
    private readonly logger = new Logger(SessionsProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly diagnosticsService: DiagnosticsService,
    ) {
        super();
    }

    /**
     * Processes the 'auto-expire-test' job.
     * Runs exactly after the test's duration has passed.
     */
    async process(job: Job<any, any, string>): Promise<any> {
        const { sessionId } = job.data;
        this.logger.log(`Processing auto-expiration for session: ${sessionId}`);

        // 1. Atomic update to EXPIRED
        // If the query updates 0 rows, the session was manually submitted just before the timer.
        const updateResult = await this.prisma.testSession.updateMany({
            where: { id: sessionId, status: 'IN_PROGRESS' },
            data: { status: 'EXPIRED' },
        });

        if (updateResult.count === 0) {
            this.logger.log(`Session ${sessionId} is no longer IN_PROGRESS. Auto-expire aborted.`);
            return; // The user submitted it manually and beat the timer.
        }

        this.logger.log(`Session ${sessionId} marked as EXPIRED.`);

        // 2. Trigger the diagnostic/calculation logic
        // We calculate results for whatever answers were submitted before expiration
        try {
            await this.diagnosticsService.calculateResult(sessionId);
            this.logger.log(`Session ${sessionId} auto-evaluated successfully.`);

            // We also update status to CHECKED after calculation
            await this.prisma.testSession.update({
                where: { id: sessionId },
                data: { status: 'CHECKED' },
            });

            // NOTE: Here we could dispatch an event (e.g., EventEmitter2) 
            // so the bot module can notify the user that their time is up and here are the results.

        } catch (error) {
            this.logger.error(
                `Failed to calculate results for expired session ${sessionId}`,
                error.stack,
            );
        }
    }
}
