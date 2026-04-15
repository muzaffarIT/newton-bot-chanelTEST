import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [PrismaModule, ConfigModule],
    providers: [LeadsService],
    exports: [LeadsService],
})
export class LeadsModule { }
