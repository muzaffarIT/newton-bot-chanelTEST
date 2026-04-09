import {
    Controller, Get, Post, Put, Delete, Body, Param,
    Query, ParseIntPipe, DefaultValuePipe,
    HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';
import { IsString, IsOptional } from 'class-validator';

class CreateTopicDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

/**
 * Admin Topics Controller.
 * Routes: /api/admin/topics
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/topics')
export class AdminTopicsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async list(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ) {
        const [topics, total] = await Promise.all([
            this.prisma.topic.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { name: 'asc' },
                include: { _count: { select: { questions: true } } },
            }),
            this.prisma.topic.count(),
        ]);
        return { topics, total, page, limit };
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        const topic = await this.prisma.topic.findUnique({
            where: { id },
            include: {
                questions: {
                    include: { options: true },
                    orderBy: { order_num: 'asc' },
                },
            },
        });
        if (!topic) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
        return topic;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() dto: CreateTopicDto) {
        return this.prisma.topic.create({
            data: { name: dto.name, description: dto.description },
        });
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: Partial<CreateTopicDto>) {
        return this.prisma.topic.update({ where: { id }, data: dto });
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.prisma.topic.delete({ where: { id } });
        return { success: true };
    }
}
