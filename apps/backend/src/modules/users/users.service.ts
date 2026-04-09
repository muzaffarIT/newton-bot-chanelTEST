import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, ParentContact } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRegisteredEvent } from '../leads/leads.service';

export interface CreateUserDto {
    telegram_id: string;
    phone?: string;
    first_name: string;
    last_name?: string;
    language_code: string;
    grade?: string;
    direction_id?: string;
    parent_phone?: string;
    target_school?: string;
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2
    ) { }

    async findByTelegramId(telegram_id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { telegram_id },
            include: {
                parent: true
            }
        });
    }

    async createUser(data: CreateUserDto): Promise<User> {
        this.logger.log(`Creating new user: ${data.telegram_id}`);

        const user = await this.prisma.user.create({
            data: {
                telegram_id: data.telegram_id,
                phone: data.phone,
                first_name: data.first_name,
                last_name: data.last_name,
                language_code: data.language_code,
                grade: data.grade,
                direction_id: data.direction_id,
                parent_phone: data.parent_phone,
                target_school: data.target_school
            },
            include: {
                parent: true
            }
        });

        this.eventEmitter.emit('user.registered', new UserRegisteredEvent(user.id, user.telegram_id));
        return user;
    }

    async updateUser(telegram_id: string, data: Partial<CreateUserDto>): Promise<User> {
        return this.prisma.user.update({
            where: { telegram_id },
            data: {
                first_name: data.first_name,
                last_name: data.last_name,
                language_code: data.language_code,
                phone: data.phone,
                grade: data.grade,
                parent_phone: data.parent_phone,
                target_school: data.target_school,
                direction_id: data.direction_id
            },
        });
    }
}
