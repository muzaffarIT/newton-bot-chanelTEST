import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for all /api/admin/* routes.
 * Requires a valid JWT in Authorization: Bearer <token> header.
 *
 * Usage: @UseGuards(AdminJwtAuthGuard)
 */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') { }
