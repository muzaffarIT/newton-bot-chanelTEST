import { Module } from '@nestjs/common';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminTestsController } from './admin-tests.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminTopicsController } from './admin-topics.controller';
import { AdminChannelsController } from './admin-channels.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminStoreController } from './admin-store.controller';

/**
 * AdminModule — REST API surface for the Newton Academy admin panel.
 * All routes are prefixed /api/admin/* by their controllers.
 *
 * TODO: Add AdminJwtAuthGuard to protect all routes before production.
 */
@Module({
    controllers: [
        AdminLeadsController,
        AdminTestsController,
        AdminDashboardController,
        AdminTopicsController,
        AdminChannelsController,
        AdminUsersController,
        AdminStoreController,
    ],
})
export class AdminModule { }
