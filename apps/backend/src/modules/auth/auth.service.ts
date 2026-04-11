import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) { }

    /**
     * Validates email/password and returns a signed JWT access token.
     */
    async login(email: string, password: string): Promise<{ accessToken: string; admin: any }> {
        const admin = await this.prisma.adminUser.findUnique({ where: { email } });

        if (!admin || !admin.is_active) {
            throw new UnauthorizedException('Invalid credentials or account disabled.');
        }

        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        if (!passwordMatch) {
            throw new UnauthorizedException('Invalid credentials or account disabled.');
        }

        const payload: JwtPayload = {
            sub: admin.id,
            email: admin.email,
            role: admin.role,
        };

        const accessToken = this.jwtService.sign(payload);

        this.logger.log(`Admin ${admin.email} (${admin.role}) logged in.`);

        return {
            accessToken,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
            },
        };
    }

    /**
     * Creates a new admin user (OWNER use only — no route exposed publicly).
     * Call this from a seeder script or via direct invocation.
     */
    async createAdminUser(email: string, password: string, name: string, role: AdminRole = AdminRole.ADMIN) {
        const password_hash = await bcrypt.hash(password, 12);
        return this.prisma.adminUser.create({
            data: { email, password_hash, name, role },
        });
    }

    /**
     * Validates a JWT payload (called by JwtStrategy).
     */
    async validateFromPayload(payload: JwtPayload) {
        const admin = await this.prisma.adminUser.findUnique({
            where: { id: payload.sub },
        });
        if (!admin || !admin.is_active) return null;
        return admin;
    }

    /**
     * Internal method to validate Telegram HMAC signature.
     */
    private validateTelegramInitData(initDataRaw: string): { id: number; username?: string } {
        const botToken = this.config.get<string>('BOT_TOKEN');
        if (!botToken) throw new UnauthorizedException('BOT_TOKEN not configured');

        const params = new URLSearchParams(initDataRaw);
        const hash = params.get('hash');
        if (!hash) throw new UnauthorizedException('Missing hash in initData');

        params.delete('hash');
        const checkString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const expectedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

        if (expectedHash !== hash) {
            throw new UnauthorizedException('Invalid Telegram initData signature');
        }

        const authDate = parseInt(params.get('auth_date') || '0', 10);
        if (Date.now() / 1000 - authDate > 86400 * 7) { // 7 days freshness for students
            throw new UnauthorizedException('initData expired');
        }

        const userJson = params.get('user');
        if (!userJson) throw new UnauthorizedException('No user in initData');
        return JSON.parse(userJson);
    }

    /**
     * Validates Telegram initData HMAC and returns a JWT for ADMIN Mini App.
     */
    async loginWithTelegramInitData(initDataRaw: string): Promise<{ accessToken: string; admin: any }> {
        const tgUser = this.validateTelegramInitData(initDataRaw);

        const admin = await this.prisma.adminUser.findFirst({
            where: { telegram_id: tgUser.id.toString(), is_active: true },
        });

        if (!admin) {
            throw new UnauthorizedException('Telegram account is not linked to an admin profile');
        }

        const payload = { sub: admin.id, email: admin.email, role: admin.role, sub_type: 'admin' };
        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        };
    }

    /**
     * Validates Telegram initData HMAC and returns a JWT for STUDENT Mini App.
     */
    async loginWithStudentTelegramInitData(initDataRaw: string): Promise<{ accessToken: string; user: any }> {
        const tgUser = this.validateTelegramInitData(initDataRaw);

        let user = await this.prisma.user.findUnique({
            where: { telegram_id: tgUser.id.toString() },
        });

        // ─── AUTO-REGISTER UNKNOWN STUDENTS TO ALLOW IMMEDIATE TEST TAKING ───
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    telegram_id: tgUser.id.toString(),
                    first_name: tgUser.first_name || 'Студент',
                    last_name: tgUser.last_name || '',
                    language_code: tgUser.language_code || 'ru',
                }
            });
            this.logger.log(`Auto-registered new student via MiniApp: ${user.telegram_id}`);
        }

        const payload = { sub: user.id, telegram_id: user.telegram_id, sub_type: 'student' };
        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: { id: user.id, first_name: user.first_name, last_name: user.last_name },
        };
    }
}
