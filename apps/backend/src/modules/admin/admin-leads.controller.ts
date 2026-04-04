import {
    Controller, Get, Patch, Param, Body,
    Query, ParseIntPipe, DefaultValuePipe,
    HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';

/**
 * Admin Leads Controller.
 * Routes: /api/admin/leads
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/leads')
export class AdminLeadsController {
    constructor(private readonly prisma: PrismaService) { }

    /** List all leads, paginated and filterable by status */
    @Get()
    async list(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
        @Query('status') status?: string,
    ) {
        const where = status ? { status: status as any } : {};
        const [leads, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    user: {
                        include: { direction: true, parent: true },
                    },
                    history: { orderBy: { created_at: 'desc' }, take: 5 },
                },
            }),
            this.prisma.lead.count({ where }),
        ]);
        return { leads, total, page, limit };
    }

    /** Get a single lead with full history */
    @Get(':id')
    async getOne(@Param('id') id: string) {
        const lead = await this.prisma.lead.findUnique({
            where: { id },
            include: {
                user: { include: { direction: true, parent: true } },
                history: { orderBy: { created_at: 'asc' } },
                manager: true,
            },
        });
        if (!lead) throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
        return lead;
    }

    /** Manually update lead status (e.g., CONTACTED, ENROLLED, REJECTED) */
    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: string; comment?: string; managerId?: string },
    ) {
        const lead = await this.prisma.lead.findUnique({ where: { id } });
        if (!lead) throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);

        await this.prisma.$transaction([
            this.prisma.lead.update({
                where: { id },
                data: {
                    status: body.status as any,
                    manager_id: body.managerId || lead.manager_id,
                    manager_comment: body.comment || lead.manager_comment,
                },
            }),
            this.prisma.leadStatusHistory.create({
                data: {
                    lead_id: id,
                    old_status: lead.status,
                    new_status: body.status as any,
                    changed_by: body.managerId || 'ADMIN',
                },
            }),
        ]);

        return { success: true };
    }
}
