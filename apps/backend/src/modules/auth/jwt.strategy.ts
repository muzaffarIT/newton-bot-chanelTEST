import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>('ADMIN_JWT_SECRET') || 'change_me_in_prod',
        });
    }

    async validate(payload: JwtPayload) {
        const admin = await this.authService.validateFromPayload(payload);
        if (!admin) throw new UnauthorizedException('Admin account not found or disabled.');
        return admin;
    }
}
