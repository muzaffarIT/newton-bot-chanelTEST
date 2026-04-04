import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

// Import modules
import { BotModule } from './modules/bot/bot.module';
import { UsersModule } from './modules/users/users.module';
import { TestsModule } from './modules/tests/tests.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { PrismaModule } from './modules/prisma/prisma.module'; // Assume we have a global Prisma module
import { AppI18nModule } from './modules/i18n/i18n.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LeadsModule } from './modules/leads/leads.module';
import { ResultsModule } from './modules/results/results.module';
import { SheetsModule } from './modules/sheets/sheets.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { StudentModule } from './modules/student/student.module';
import { PointsModule } from './modules/points/points.module';
import { StoreModule } from './modules/store/store.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    PrismaModule,
    AppI18nModule,
    EventEmitterModule.forRoot(),
    BotModule,
    UsersModule,
    TestsModule,
    SessionsModule,
    DiagnosticsModule,
    LeadsModule,
    ResultsModule,
    SheetsModule,
    AdminModule,
    AuthModule,
    HealthModule,
    SchedulerModule,
    StudentModule,
    PointsModule,
    StoreModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
