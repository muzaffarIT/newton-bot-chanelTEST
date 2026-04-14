import {
    Controller, Post, Get, Patch, Delete, Body,
    Param, Query, ParseIntPipe, DefaultValuePipe,
    HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';

/**
 * Admin scheduler controller.
 * All routes are under /admin/scheduler — intended for use by the admin panel.
 * In production, protect these with an AdminJwtAuthGuard.
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/scheduler')
export class SchedulerController {
    constructor(private readonly schedulerService: SchedulerService) { }

    /**
     * Schedule a post to a Telegram channel.
     * If publishNow=true, publishes immediately.
     * If publishAt is omitted and publishNow is false, returns 400.
     */
    @Post('schedule')
    @HttpCode(HttpStatus.CREATED)
    async schedulePost(@Body() dto: SchedulePostDto) {
        try {
            if (!dto.publishNow && !dto.publishAt) {
                throw new HttpException('Either publishAt or publishNow must be provided.', HttpStatus.BAD_REQUEST);
            }

            // Resolve which channels to post to (support both single and multi-channel)
            const channelIds: string[] = dto.channelIds?.length
                ? dto.channelIds
                : dto.channelId
                    ? [dto.channelId]
                    : [];

            if (channelIds.length === 0) {
                throw new HttpException('At least one channelId or channelIds must be provided.', HttpStatus.BAD_REQUEST);
            }

            const publishAt = dto.publishAt ? new Date(dto.publishAt) : undefined;
            if (publishAt && isNaN(publishAt.getTime())) {
                throw new HttpException('Invalid publishAt date format.', HttpStatus.BAD_REQUEST);
            }

            // Fan-out: schedule/publish to each channel in parallel
            const results = await Promise.all(
                channelIds.map(channelId =>
                    this.schedulerService.scheduleTestPost({
                        channelId,
                        testId: dto.testId,
                        messageText: dto.messageText,
                        publishAt,
                        publishNow: dto.publishNow,
                    })
                )
            );

            return { success: true, results, channelCount: channelIds.length };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * List all scheduled posts (paginated).
     */
    @Get()
    async listPosts(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.schedulerService.listScheduledPosts(page, limit);
    }

    /**
     * Cancel a pending scheduled post.
     */
    @Delete(':id')
    async cancelPost(@Param('id') id: string) {
        try {
            return await this.schedulerService.cancelScheduledPost(id);
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }
}
