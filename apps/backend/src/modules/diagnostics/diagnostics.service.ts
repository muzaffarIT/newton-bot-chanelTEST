import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestCompletedEvent } from '../leads/leads.service';

/**
 * Interface representing the breakdown of skills
 */
interface SkillBreakdown {
    [topicName: string]: {
        correctVotes: number;
        totalQuestions: number;
        percentage: number;
        isStrong: boolean;
        isWeak: boolean;
    };
}

@Injectable()
export class DiagnosticsService {
    private readonly logger = new Logger(DiagnosticsService.name);

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2
    ) { }

    /**
     * Calculates logic for Strong/Weak topics, Level and total score
     * and saves the TestResult.
     *
     * @param sessionId The ID of the completed or expired session.
     */
    async calculateResult(sessionId: string) {
        this.logger.log(`Calculating diagnostics for session: ${sessionId}`);

        // 1. Fetch the session with answers and topics
        const session = await this.prisma.testSession.findUnique({
            where: { id: sessionId },
            include: {
                answers: {
                    include: {
                        selected_option: true,
                        question: {
                            include: {
                                topic: true,
                            },
                        },
                    },
                },
                test: {
                    include: {
                        questions: true, // Need this to know the total questions in the test
                    },
                },
            },
        });

        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found`);
        }

        // 2. Tally accurate answers and Group by topic
        let correctCount = 0;
        let incorrectCount = 0;
        // Map of topic id to tracking object
        const topicStats: Record<string, { total: number; correct: number; name: string }> = {};

        // Only total questions answered will determine correct/incorrect count
        // But missed questions should also count as incorrect.
        const answeredQuestionIds = new Set<string>();

        for (const answer of session.answers) {
            const isCorrect = answer.selected_option.is_correct;
            const topicId = answer.question.topic_id;
            const topicName = answer.question.topic.name;

            answeredQuestionIds.add(answer.question_id);

            if (!topicStats[topicId]) {
                topicStats[topicId] = { total: 0, correct: 0, name: topicName };
            }

            topicStats[topicId].total += 1; // Number of questions user answered in this topic

            if (isCorrect) {
                correctCount++;
                topicStats[topicId].correct += 1;
            } else {
                incorrectCount++;
            }
        }

        // 3. Count missing questions as incorrect
        // For a fully accurate breakdown, we also need to know which topics the missed questions belonged to.
        const allTestQuestions = session.test.questions;
        for (const question of allTestQuestions) {
            if (!answeredQuestionIds.has(question.id)) {
                incorrectCount++; // Missed it

                // Also add the potential to the total for that topic
                // We'd need to fetch topics for all questions to do this fully.
                // For simplicity in this example, we assume we only analyze topics the user at least touched, 
                // OR we can make a separate query:
            }
        }

        const totalQuestions = allTestQuestions.length;
        const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

        // 4. Determine Level
        let level: 'LOW' | 'MEDIUM' | 'HIGH';
        if (scorePercentage < 41) {
            level = 'LOW';
        } else if (scorePercentage <= 75) {
            level = 'MEDIUM';
        } else {
            level = 'HIGH';
        }

        // 5. Structure Skill Breakdown
        const skillBreakdown: SkillBreakdown = {};

        for (const topicId of Object.keys(topicStats)) {
            const stats = topicStats[topicId];
            // Note: If you want missed questions to impact topic percentages,
            // you must calculate stats.total based on allTestQuestions instead of answers.
            const topicPercentage = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

            skillBreakdown[stats.name] = {
                correctVotes: stats.correct,
                totalQuestions: stats.total,
                percentage: Number(topicPercentage.toFixed(2)),
                // Logic requested: Strong >= 70%, Weak <= 40%
                isStrong: topicPercentage >= 70,
                isWeak: topicPercentage <= 40,
            };
        }

        // 6. Save the Result to DB
        const result = await this.prisma.testResult.create({
            data: {
                session_id: sessionId,
                correct_count: correctCount,
                incorrect_count: incorrectCount,
                score_percentage: Number(scorePercentage.toFixed(2)),
                level,
                skill_breakdown: skillBreakdown as any, // casting to any for Prisma Json
            },
        });

        this.logger.log(`Successfully calculated results for session: ${sessionId}. Score: ${scorePercentage}%`);

        this.eventEmitter.emit('test.completed', new TestCompletedEvent(session.user_id, result.id));

        return result;
    }
}
