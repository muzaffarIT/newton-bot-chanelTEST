import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [LeadsService],
    exports: [LeadsService],
})
export class LeadsModule { }
