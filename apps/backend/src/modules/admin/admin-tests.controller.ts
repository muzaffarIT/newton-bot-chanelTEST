import {
    Controller, Get, Post, Put, Delete, Body, Param,
    Query, ParseIntPipe, DefaultValuePipe,
    HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';

class CreateTestDto {
    title: string;
    description?: string;
    duration_minutes?: number;
    allow_retakes?: boolean;
}

class CreateQuestionDto {
    content: string;
    topic_id: string;
    order_num?: number;
    options: { content: string; is_correct: boolean }[];
}

/**
 * Admin Tests Controller.
 * Routes: /api/admin/tests
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/tests')
export class AdminTestsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async list(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        const [tests, total] = await Promise.all([
            this.prisma.test.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { _count: { select: { questions: true, sessions: true } } },
            }),
            this.prisma.test.count(),
        ]);
        return { tests, total, page, limit };
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        const test = await this.prisma.test.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { order_num: 'asc' },
                    include: { options: true, topic: true },
                },
            },
        });
        if (!test) throw new HttpException('Test not found', HttpStatus.NOT_FOUND);
        return test;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() dto: CreateTestDto) {
        return this.prisma.test.create({
            data: {
                title: dto.title,
                description: dto.description,
                duration_minutes: dto.duration_minutes ?? 120,
                allow_retakes: dto.allow_retakes ?? false,
            },
        });
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: Partial<CreateTestDto>) {
        return this.prisma.test.update({ where: { id }, data: dto });
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.prisma.test.delete({ where: { id } });
        return { success: true };
    }

    /** Add a question with all its options in one request */
    @Post(':id/questions')
    @HttpCode(HttpStatus.CREATED)
    async addQuestion(@Param('id') testId: string, @Body() dto: CreateQuestionDto) {
        if (!dto.options || dto.options.length < 2) {
            throw new HttpException('A question must have at least 2 options.', HttpStatus.BAD_REQUEST);
        }
        const correctCount = dto.options.filter(o => o.is_correct).length;
        if (correctCount !== 1) {
            throw new HttpException('Exactly one option must be marked as correct.', HttpStatus.BAD_REQUEST);
        }

        const question = await this.prisma.testQuestion.create({
            data: {
                test_id: testId,
                topic_id: dto.topic_id,
                content: dto.content,
                order_num: dto.order_num ?? 0,
                options: {
                    createMany: {
                        data: dto.options.map(o => ({ content: o.content, is_correct: o.is_correct })),
                    },
                },
            },
            include: { options: true },
        });

        return question;
    }
}
