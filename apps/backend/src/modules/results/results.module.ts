import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResultNotificationService } from './results.service';

@Module({
    imports: [PrismaModule],
    providers: [ResultNotificationService],
})
export class ResultsModule { }
