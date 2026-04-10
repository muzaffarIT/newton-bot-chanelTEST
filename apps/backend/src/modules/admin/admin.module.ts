import { Module } from '@nestjs/common';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminTestsController } from './admin-tests.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminTopicsController } from './admin-topics.controller';
import { AdminChannelsController } from './admin-channels.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminStoreController } from './admin-store.controller';
import { AdminSettingsController, StudentSettingsController } from './admin-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [
        AdminLeadsController,
        AdminTestsController,
        AdminDashboardController,
        AdminTopicsController,
        AdminChannelsController,
        AdminUsersController,
        AdminStoreController,
        AdminSettingsController,
        StudentSettingsController,
    ],
})
export class AdminModule { }
