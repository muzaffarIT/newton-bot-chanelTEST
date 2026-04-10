import { IsString, IsDateString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class SchedulePostDto {
    @IsNotEmpty()
    @IsString()
    channelId: string;

    /** Optional: The test ID to attach to the message. If omitted, sends a regular text post */
    @IsOptional()
    @IsString()
    testId?: string;

    /** Optional custom message text. If omitted, a template is auto-generated from test metadata. */
    @IsOptional()
    @IsString()
    messageText?: string;

    /** ISO date string for scheduled publish time. If omitted or null, publishes immediately. */
    @IsOptional()
    @IsDateString()
    publishAt?: string;

    /** If true, ignore publishAt and publish right now. */
    @IsOptional()
    @IsBoolean()
    publishNow?: boolean;
}
