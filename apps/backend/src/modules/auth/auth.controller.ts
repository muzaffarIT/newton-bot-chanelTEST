import { Controller, Post, Body, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

class LoginDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;
}

class TelegramMiniAppDto {
    @IsNotEmpty()
    @IsString()
    initData: string;
}

/**
 * Auth controller for admin panel.
 * POST /api/auth/login → JWT via email+password
 * POST /api/auth/telegram-miniapp → JWT via Telegram initData (Mini App)
 */
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        try {
            return await this.authService.login(dto.email, dto.password);
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.UNAUTHORIZED);
        }
    }

    @Post('telegram-miniapp')
    @HttpCode(HttpStatus.OK)
    async telegramMiniApp(@Body() dto: TelegramMiniAppDto) {
        try {
            return await this.authService.loginWithTelegramInitData(dto.initData);
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.UNAUTHORIZED);
        }
    }

    @Post('student-miniapp')
    @HttpCode(HttpStatus.OK)
    async studentMiniApp(@Body() dto: TelegramMiniAppDto) {
        try {
            return await this.authService.loginWithStudentTelegramInitData(dto.initData);
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.UNAUTHORIZED);
        }
    }
}
