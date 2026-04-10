import {
    Controller, Get, Patch, Body, UseGuards, HttpException, HttpStatus
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';

const DEFAULT_SETTINGS: Record<string, string> = {
    consultant_username: '@newton_support',
    consultant_phone: '+998 90 123 45 67',
    consultant_name: 'Поддержка Newton',
    school_name: 'Newton Academy',
    school_address: 'г. Ташкент, ул. Мирзо-Улугбек 1',
};

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/settings')
export class AdminSettingsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async getSettings() {
        const rows = await this.prisma.appSetting.findMany();
        const map: Record<string, string> = { ...DEFAULT_SETTINGS };
        rows.forEach(r => { map[r.key] = r.value; });
        return map;
    }

    @Patch()
    async updateSettings(@Body() dto: Record<string, string>) {
        const allowed = Object.keys(DEFAULT_SETTINGS);
        const updates: Promise<any>[] = [];

        for (const key of allowed) {
            if (dto[key] !== undefined) {
                updates.push(
                    this.prisma.appSetting.upsert({
                        where: { key },
                        update: { value: String(dto[key]) },
                        create: { key, value: String(dto[key]) },
                    })
                );
            }
        }

        await Promise.all(updates);
        return this.getSettings();
    }
}

/** Public endpoint — student app reads consultant contact */
@Controller('student/settings')
export class StudentSettingsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get('public')
    async getPublicSettings() {
        const rows = await this.prisma.appSetting.findMany({
            where: { key: { in: ['consultant_username', 'consultant_phone', 'consultant_name', 'school_name'] } },
        });
        const result: Record<string, string> = {
            consultant_username: '@newton_support',
            consultant_phone: '+998 90 123 45 67',
            consultant_name: 'Поддержка Newton',
            school_name: 'Newton Academy',
        };
        rows.forEach(r => { result[r.key] = r.value; });
        return result;
    }
}
