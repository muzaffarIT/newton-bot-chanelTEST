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

    // Exntended for Parent Contact
    father_name?: string;
    father_phone?: string;
    mother_name?: string;
    mother_phone?: string;
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
                parent: (data.father_name || data.mother_phone) ? {
                    create: {
                        father_name: data.father_name,
                        father_phone: data.father_phone,
                        mother_name: data.mother_name,
                        mother_phone: data.mother_phone,
                    }
                } : undefined
            },
            include: {
                parent: true
            }
        });

        this.eventEmitter.emit('user.registered', user);
        return user;
    }

    async updateUser(telegram_id: string, data: Partial<CreateUserDto>): Promise<User> {
        // In a real scenario, map data to parent sub-object if parent changing
        return this.prisma.user.update({
            where: { telegram_id },
            data: {
                first_name: data.first_name,
                last_name: data.last_name,
                language_code: data.language_code
            },
        });
    }
}
