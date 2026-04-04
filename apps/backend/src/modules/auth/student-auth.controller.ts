import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class StudentAuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('student-miniapp')
    async loginWithInitData(@Body() body: { initData: string }) {
        return this.authService.loginWithStudentTelegramInitData(body.initData);
    }
}
