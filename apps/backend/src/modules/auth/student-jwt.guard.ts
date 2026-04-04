import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StudentJwtAuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('Missing token');
        }
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get('ADMIN_JWT_SECRET'), // Use same secret for now or separate
            });

            // Check if this is a student (User model), not an AdminUser
            if (payload.sub_type !== 'student') {
                throw new UnauthorizedException('Not a student token');
            }

            request['user'] = payload;
        } catch {
            throw new UnauthorizedException('Invalid token');
        }
        return true;
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
