import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AdminJwtAuthGuard } from './admin-jwt.guard';
import { StudentJwtAuthGuard } from './student-jwt.guard';
import { StudentAuthController } from './student-auth.controller';

@Global()
@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('ADMIN_JWT_SECRET') || 'change_me_in_prod',
                signOptions: { expiresIn: '8h' },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [AuthService, JwtStrategy, AdminJwtAuthGuard, StudentJwtAuthGuard],
    controllers: [AuthController, StudentAuthController],
    exports: [AuthService, AdminJwtAuthGuard, StudentJwtAuthGuard, JwtModule],
})
export class AuthModule { }
