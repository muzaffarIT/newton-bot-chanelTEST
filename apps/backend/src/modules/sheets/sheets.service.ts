import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { TestCompletedEvent, UserRegisteredEvent } from '../leads/leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

export interface SheetsLeadJob {
    type: 'lead';
    telegramId: string;
    name: string;
    phone: string;
    parentName: string;
    parentPhone: string;
    grade: string;
    direction: string;
    language: string;
}

export interface SheetsResultJob {
    type: 'result';
    telegramId: string;
    name: string;
    testName: string;
    scorePercentage: number;
    level: string;
    correctCount: number;
    incorrectCount: number;
    strongTopics: string;
    weakTopics: string;
}

@Injectable()
export class SheetsService {
    private readonly logger = new Logger(SheetsService.name);
    private sheetsClient: any;
    private spreadSheetId: string;

    constructor(
        @InjectQueue('sheets-queue') private readonly sheetsQueue: Queue,
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {
        this.spreadSheetId = this.config.get<string>('GOOGLE_SHEET_ID') || '';
        this.initSheetsClient();
    }

    private async initSheetsClient() {
        if (!this.spreadSheetId) {
            this.logger.warn('GOOGLE_SHEET_ID not set — Sheets writes will be logged only.');
            return;
        }
        try {
            const auth = new google.auth.JWT({
                email: this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
                key: this.config.get<string>('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            this.sheetsClient = google.sheets({ version: 'v4', auth });
            this.logger.log('Google Sheets client initialized.');
        } catch (e) {
            this.logger.error('Failed to initialize Google Sheets client', e);
        }
    }

    /**
     * Enqueue a lead row write. Retried automatically by BullMQ on failure.
     */
    async enqueueLead(data: Omit<SheetsLeadJob, 'type'>) {
        await this.sheetsQueue.add('write-lead', { type: 'lead', ...data }, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
        });
        this.logger.log(`Lead write enqueued for ${data.telegramId}`);
    }

    /**
     * Enqueue a test result row write. Retried automatically by BullMQ on failure.
     */
    async enqueueResult(data: Omit<SheetsResultJob, 'type'>) {
        await this.sheetsQueue.add('write-result', { type: 'result', ...data }, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
        });
        this.logger.log(`Result write enqueued for ${data.telegramId}`);
    }

    /**
     * Called directly by the SheetsProcessor — the actual Google API write.
     */
    async appendRow(range: string, values: any[]) {
        if (!this.sheetsClient || !this.spreadSheetId) {
            this.logger.log(`[STUB] Sheet write to ${range}: ${JSON.stringify(values)}`);
            return;
        }

        await this.sheetsClient.spreadsheets.values.append({
            spreadsheetId: this.spreadSheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [values] },
        });
        this.logger.log(`Successfully appended to ${range}`);
    }

    /**
     * Listen to user.registered events and enqueue Sheets lead write.
     */
    @OnEvent('user.registered')
    async handleUserRegisteredSheetsSync(payload: UserRegisteredEvent) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
            include: { direction: true, parent: true },
        });

        if (!user) return;

        await this.enqueueLead({
            telegramId: user.telegram_id,
            name: `${user.first_name} ${user.last_name || ''}`.trim(),
            phone: user.phone || '',
            parentName: user.parent?.father_name || user.parent?.mother_name || '',
            parentPhone: user.parent?.father_phone || user.parent?.mother_phone || '',
            grade: user.grade || '',
            direction: user.direction?.name || '',
            language: user.language_code,
        });
    }

    /**
     * Listen to test.completed events and enqueue Sheets result write.
     */
    @OnEvent('test.completed')
    async handleTestCompletedSheetsSync(payload: TestCompletedEvent) {
        const result = await this.prisma.testResult.findUnique({
            where: { id: payload.resultId },
            include: {
                session: {
                    include: {
                        user: { include: { direction: true, parent: true } },
                        test: true,
                    },
                },
            },
        });

        if (!result) return;

        const { user, test } = result.session;
        const breakdown = result.skill_breakdown as Record<string, { isStrong: boolean; isWeak: boolean }>;
        const strongTopics = Object.entries(breakdown).filter(([, v]) => v.isStrong).map(([k]) => k).join(', ');
        const weakTopics = Object.entries(breakdown).filter(([, v]) => v.isWeak).map(([k]) => k).join(', ');

        await this.enqueueResult({
            telegramId: user.telegram_id,
            name: `${user.first_name} ${user.last_name || ''}`.trim(),
            testName: test.title,
            scorePercentage: result.score_percentage,
            level: result.level,
            correctCount: result.correct_count,
            incorrectCount: result.incorrect_count,
            strongTopics,
            weakTopics,
        });
    }
}
