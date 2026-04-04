import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionsModule } from '../sessions/sessions.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [PrismaModule, SessionsModule, JwtModule],
    controllers: [StudentController],
    providers: [StudentService],
    exports: [StudentService],
})
export class StudentModule { }
