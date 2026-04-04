import {
    Controller, Get, Post, Put, Delete, Body, Param,
    HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';
import { AuthService } from '../auth/auth.service';
import { AdminRole } from '@prisma/client';

class CreateAdminUserDto {
    email: string;
    password: string;
    name: string;
    role?: 'ADMIN';
}

class UpdateAdminUserDto {
    name?: string;
    role?: 'ADMIN';
    is_active?: boolean;
    telegram_id?: string;
}

/**
 * Admin Users Controller.
 * Routes: /api/admin/admin-users
 * Only accessible by authenticated admins.
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/admin-users')
export class AdminUsersController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly authService: AuthService,
    ) { }

    @Get()
    async list() {
        return this.prisma.adminUser.findMany({
            select: {
                id: true, email: true, name: true, role: true,
                is_active: true, created_at: true,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        const admin = await this.prisma.adminUser.findUnique({
            where: { id },
            select: { id: true, email: true, name: true, role: true, is_active: true, created_at: true },
        });
        if (!admin) throw new HttpException('Admin user not found', HttpStatus.NOT_FOUND);
        return admin;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() dto: CreateAdminUserDto) {
        const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
        if (existing) throw new HttpException('Admin user with this email already exists.', HttpStatus.CONFLICT);

        const role = AdminRole.ADMIN;
        const admin = await this.authService.createAdminUser(dto.email, dto.password, dto.name, role);

        return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
        };
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
        return this.prisma.adminUser.update({
            where: { id },
            data: {
                name: dto.name,
                role: dto.role as AdminRole | undefined,
                is_active: dto.is_active,
                telegram_id: dto.telegram_id,
            },
            select: { id: true, email: true, name: true, role: true, is_active: true, telegram_id: true },
        });
    }

    /** PATCH /api/admin/admin-users/:id/telegram — link Telegram account to admin */
    @Put(':id/telegram')
    async linkTelegram(
        @Param('id') id: string,
        @Body() dto: { telegram_id: string },
    ) {
        if (!dto.telegram_id) {
            throw new HttpException('telegram_id is required', HttpStatus.BAD_REQUEST);
        }
        return this.prisma.adminUser.update({
            where: { id },
            data: { telegram_id: dto.telegram_id },
            select: { id: true, email: true, name: true, telegram_id: true },
        });
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        // Soft delete — deactivate instead of hard delete
        await this.prisma.adminUser.update({
            where: { id },
            data: { is_active: false },
        });
        return { success: true };
    }
}
