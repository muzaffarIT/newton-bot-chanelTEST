import {
    Controller, Get, Patch, Param, Body,
    Query, ParseIntPipe, DefaultValuePipe,
    HttpCode, HttpStatus, HttpException, UseGuards, Post,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';

class UpdateLeadStatusDto {
    @IsString()
    status: string;

    @IsString()
    @IsOptional()
    comment?: string;

    @IsString()
    @IsOptional()
    managerId?: string;
}

class UpdateLeadTagsDto {
    @IsArray()
    @IsString({ each: true })
    tags: string[];
}

class UpdateLeadCommentDto {
    @IsString()
    comment: string;
}

// ── Helper: compute level label ────────────────────────────────────────────────
function levelLabel(pct: number): string {
    if (pct >= 85) return 'Отлично 🏆';
    if (pct >= 70) return 'Хорошо 🌟';
    if (pct >= 50) return 'Удовлетворительно 📈';
    return 'Нужна работа 💪';
}

// ── Helper: format Telegram notification ──────────────────────────────────────
function buildTelegramNotification(lead: any, latestResult?: any): string {
    const user = lead.user;
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Неизвестно';
    const phone = user?.phone || '—';
    const grade = user?.grade ? `${user.grade} класс` : '—';
    const direction = user?.direction?.name || '—';

    let resultLine = '';
    if (latestResult) {
        const pct = latestResult.score_percentage ?? 0;
        const testName = latestResult.session?.test?.title || 'Тест';
        resultLine = `\n📊 ${testName}: *${pct}%* — ${levelLabel(pct)}`;
    }

    const tags = (lead.tags || []).map((t: string) => `#${t}`).join(' ');

    return [
        `🔥 *Запрос на консультацию!*`,
        ``,
        `👤 *${name}*`,
        `📱 ${phone}`,
        `🎓 ${grade} | 📚 ${direction}`,
        resultLine,
        ``,
        `📋 Статус: *WAITING_CONTACT*`,
        tags ? `🏷 ${tags}` : '',
        ``,
        `#горячий #консультация #${lead.status?.toLowerCase()}`,
    ].filter(l => l !== undefined).join('\n');
}

/**
 * Admin Leads Controller — Full CRM version.
 * Routes: /api/admin/leads
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/leads')
export class AdminLeadsController {
    constructor(
        private readonly prisma: PrismaService,
        @InjectBot() private readonly bot: Telegraf,
        private readonly config: ConfigService,
    ) { }

    // ── Private: fetch latest test result for a user ──────────────────────────
    private async getLatestResult(userId: string) {
        return this.prisma.testResult.findFirst({
            where: { session: { user_id: userId } },
            orderBy: { created_at: 'desc' },
            include: {
                session: { include: { test: { select: { id: true, title: true } } } },
                recommendation: true,
            },
        });
    }

    // ── GET /api/admin/leads ──────────────────────────────────────────────────
    @Get()
    async list(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        const where: any = {};
        if (status) where.status = status as any;
        if (search) {
            where.user = {
                OR: [
                    { first_name: { contains: search, mode: 'insensitive' } },
                    { last_name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                ],
            };
        }

        const [leads, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    // Hot leads first
                    { status: 'asc' },
                    { updated_at: 'desc' },
                ],
                include: {
                    user: { include: { direction: true, parent: true } },
                    history: { orderBy: { created_at: 'desc' }, take: 3 },
                    manager: { select: { name: true, id: true } },
                },
            }),
            this.prisma.lead.count({ where }),
        ]);

        // Enrich each lead with its latest test result
        const enriched = await Promise.all(
            leads.map(async (lead) => {
                const latestResult = await this.getLatestResult(lead.user_id);
                const testCount = await this.prisma.testSession.count({
                    where: { user_id: lead.user_id, status: 'CHECKED' },
                });
                return {
                    ...lead,
                    latestResult: latestResult ? {
                        id: latestResult.id,
                        score_percentage: latestResult.score_percentage,
                        correct_count: latestResult.correct_count,
                        incorrect_count: latestResult.incorrect_count,
                        level: latestResult.level,
                        skill_breakdown: latestResult.skill_breakdown,
                        test_title: latestResult.session?.test?.title,
                        created_at: latestResult.created_at,
                    } : null,
                    testCount,
                };
            })
        );

        return { leads: enriched, total, page, limit };
    }

    // ── GET /api/admin/leads/:id ──────────────────────────────────────────────
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

        // Fetch all test results for this user
        const allResults = await this.prisma.testResult.findMany({
            where: { session: { user_id: lead.user_id } },
            orderBy: { created_at: 'desc' },
            include: {
                session: { include: { test: { select: { id: true, title: true } } } },
                recommendation: true,
            },
        });

        return {
            ...lead,
            allResults: allResults.map(r => ({
                id: r.id,
                score_percentage: r.score_percentage,
                correct_count: r.correct_count,
                incorrect_count: r.incorrect_count,
                level: r.level,
                skill_breakdown: r.skill_breakdown,
                test_title: r.session?.test?.title,
                test_id: r.session?.test?.id,
                recommendation: r.recommendation,
                created_at: r.created_at,
            })),
            latestResult: allResults[0] ? {
                id: allResults[0].id,
                score_percentage: allResults[0].score_percentage,
                correct_count: allResults[0].correct_count,
                incorrect_count: allResults[0].incorrect_count,
                level: allResults[0].level,
                skill_breakdown: allResults[0].skill_breakdown,
                test_title: allResults[0].session?.test?.title,
                recommendation: allResults[0].recommendation,
                created_at: allResults[0].created_at,
            } : null,
        };
    }

    // ── PATCH /api/admin/leads/:id/status ─────────────────────────────────────
    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() body: UpdateLeadStatusDto,
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

    // ── PATCH /api/admin/leads/:id/tags ───────────────────────────────────────
    @Patch(':id/tags')
    async updateTags(@Param('id') id: string, @Body() body: UpdateLeadTagsDto) {
        const lead = await this.prisma.lead.findUnique({ where: { id } });
        if (!lead) throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);

        await this.prisma.lead.update({ where: { id }, data: { tags: body.tags } });
        return { success: true, tags: body.tags };
    }

    // ── PATCH /api/admin/leads/:id/comment ───────────────────────────────────
    @Patch(':id/comment')
    async updateComment(@Param('id') id: string, @Body() body: UpdateLeadCommentDto) {
        const lead = await this.prisma.lead.findUnique({ where: { id } });
        if (!lead) throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);

        await this.prisma.lead.update({ where: { id }, data: { manager_comment: body.comment } });
        return { success: true };
    }

    // ── POST /api/admin/leads/:id/notify ──────────────────────────────────────
    // Send Telegram notification about a lead to admin group
    @Post(':id/notify')
    async notifyTelegram(@Param('id') id: string) {
        const lead = await this.prisma.lead.findUnique({
            where: { id },
            include: { user: { include: { direction: true } } },
        });
        if (!lead) throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);

        const adminGroupId = this.config.get<string>('ADMIN_GROUP_CHAT_ID');
        if (!adminGroupId) return { success: false, reason: 'ADMIN_GROUP_CHAT_ID not set' };

        const latestResult = await this.getLatestResult(lead.user_id);
        const message = buildTelegramNotification(lead, latestResult);

        await this.bot.telegram.sendMessage(adminGroupId, message, { parse_mode: 'Markdown' });
        return { success: true };
    }

    // ── POST /api/admin/leads/:id/sync-sheets ─────────────────────────────────
    @Post(':id/sync-sheets')
    async syncToSheets(@Param('id') id: string) {
        const lead = await this.prisma.lead.findUnique({
            where: { id },
            include: { user: { include: { direction: true, parent: true } } },
        });
        if (!lead) throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);

        const latestResult = await this.getLatestResult(lead.user_id);

        const sheetId = this.config.get<string>('GOOGLE_SHEET_ID');
        const serviceAccountJson = this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_JSON');

        if (!sheetId || !serviceAccountJson) {
            return {
                success: false,
                reason: 'Google Sheets not configured. Set GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON env vars.',
            };
        }

        try {
            // Dynamically import to avoid crashing if package not installed
            const { GoogleSpreadsheet } = await import('google-spreadsheet') as any;
            const { JWT } = await import('google-auth-library') as any;

            const serviceAccount = JSON.parse(serviceAccountJson);
            const auth = new JWT({
                email: serviceAccount.client_email,
                key: serviceAccount.private_key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const doc = new GoogleSpreadsheet(sheetId, auth);
            await doc.loadInfo();

            const sheet = doc.sheetsByIndex[0];
            await sheet.loadHeaderRow();

            const user = lead.user;
            const pct = latestResult?.score_percentage ?? '';
            const level = latestResult?.level ?? '';
            const testTitle = latestResult?.session?.test?.title ?? '';

            const rowData = {
                'ФИО': [user?.first_name, user?.last_name].filter(Boolean).join(' '),
                'Телефон': user?.phone || '',
                'Класс': user?.grade || '',
                'Направление': user?.direction?.name || '',
                'Тест': testTitle,
                'Результат %': pct,
                'Уровень': level,
                'Статус': lead.status,
                'Теги': (lead.tags || []).join(', '),
                'Дата': new Date(lead.created_at).toLocaleDateString('ru-RU'),
                'Комментарий': lead.manager_comment || '',
            };

            // Try to find existing row by phone to update, else add
            const rows = await sheet.getRows();
            const existing = rows.find((r: any) => r.get('Телефон') === user?.phone);
            if (existing) {
                Object.entries(rowData).forEach(([k, v]) => existing.set(k, v));
                await existing.save();
            } else {
                await sheet.addRow(rowData);
            }

            return { success: true };
        } catch (err) {
            throw new HttpException(`Sheets sync failed: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
