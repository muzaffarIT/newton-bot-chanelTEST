import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { session } from 'telegraf';

import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { BotUpdate } from './bot.update';
import { RegistrationWizard } from './scenes/registration.scene';
import { TestScene } from './scenes/test.scene';
import { PostScene } from './scenes/post.scene';

@Module({
    imports: [
        TelegrafModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                token: configService.get<string>('BOT_TOKEN') || 'mock_token',
                middlewares: [session()],
                launchOptions: configService.get<string>('WEBHOOK_URL') ? {
                    webhook: {
                        domain: configService.get<string>('STAGING_DOMAIN'),
                        hookPath: '/telegraf',
                    }
                } : undefined,
            }),
            inject: [ConfigService],
        }),
        UsersModule,
        SessionsModule, // To access startTestSession inside TestScene
        PrismaModule,   // To dynamically fetch Directions in RegistrationWizard
        SchedulerModule, // For PostScene to publish directly
    ],
    providers: [
        BotUpdate,
        RegistrationWizard,
        TestScene,
        PostScene,
    ],
})
export class BotModule { }
