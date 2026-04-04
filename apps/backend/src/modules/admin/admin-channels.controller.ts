import {
    Controller, Get, Post, Put, Delete, Body, Param,
    Query, ParseIntPipe, DefaultValuePipe,
    HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';

class CreateChannelDto {
    telegram_id: string; // e.g. "-100123456789"
    name: string;
    is_active?: boolean;
}

/**
 * Admin Channels Controller.
 * Routes: /api/admin/channels
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/channels')
export class AdminChannelsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async list() {
        const [channels, total] = await Promise.all([
            this.prisma.channel.findMany({
                orderBy: { name: 'asc' },
                include: { _count: { select: { scheduled_posts: true } } },
            }),
            this.prisma.channel.count(),
        ]);
        return { channels, total };
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        const ch = await this.prisma.channel.findUnique({
            where: { id },
            include: {
                scheduled_posts: {
                    orderBy: { publish_at: 'desc' },
                    take: 20,
                    include: { test: { select: { title: true } } },
                },
            },
        });
        if (!ch) throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
        return ch;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() dto: CreateChannelDto) {
        const existing = await this.prisma.channel.findUnique({
            where: { telegram_id: dto.telegram_id },
        });
        if (existing) throw new HttpException('Channel already registered.', HttpStatus.CONFLICT);

        return this.prisma.channel.create({
            data: {
                telegram_id: dto.telegram_id,
                name: dto.name,
                is_active: dto.is_active ?? true,
            },
        });
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: Partial<CreateChannelDto>) {
        return this.prisma.channel.update({ where: { id }, data: dto });
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.prisma.channel.delete({ where: { id } });
        return { success: true };
    }
}
