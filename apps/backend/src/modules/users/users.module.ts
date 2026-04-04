import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
    providers: [UsersService],
    exports: [UsersService], // Exported for use in BotModule
})
export class UsersModule { }
