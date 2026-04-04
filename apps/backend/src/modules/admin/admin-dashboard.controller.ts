import {
    Controller, Get, Query, ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';

/**
 * Admin Dashboard Controller.
 * Routes: /api/admin/dashboard
 * Provides KPI stats for the admin panel home screen.
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('stats')
    async getStats() {
        const [
            totalUsers,
            totalLeads,
            leadsByStatus,
            totalSessions,
            sessionsByStatus,
            avgScore,
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.lead.count(),
            this.prisma.lead.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            this.prisma.testSession.count(),
            this.prisma.testSession.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            this.prisma.testResult.aggregate({
                _avg: { score_percentage: true },
            }),
        ]);

        return {
            totalUsers,
            totalLeads,
            leadsByStatus: Object.fromEntries(leadsByStatus.map(l => [l.status, l._count.status])),
            totalSessions,
            sessionsByStatus: Object.fromEntries(sessionsByStatus.map(s => [s.status, s._count.status])),
            avgScore: avgScore._avg.score_percentage?.toFixed(1) ?? null,
        };
    }

    @Get('sessions')
    async getSessions(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('status') status?: string,
    ) {
        const where = status ? { status: status as any } : {};
        const [sessions, total] = await Promise.all([
            this.prisma.testSession.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { started_at: 'desc' },
                include: {
                    user: { select: { first_name: true, last_name: true, telegram_id: true } },
                    test: { select: { title: true } },
                    result: { select: { score_percentage: true, level: true } },
                },
            }),
            this.prisma.testSession.count({ where }),
        ]);
        return { sessions, total, page, limit };
    }

    @Get('results')
    async getResults(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        const [results, total] = await Promise.all([
            this.prisma.testResult.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    session: {
                        include: {
                            user: { select: { first_name: true, last_name: true, telegram_id: true } },
                            test: { select: { title: true } },
                        },
                    },
                },
            }),
            this.prisma.testResult.count(),
        ]);
        return { results, total, page, limit };
    }
}
