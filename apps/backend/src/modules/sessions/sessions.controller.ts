import { Controller, Post, Body, Get, UseGuards, Req, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { StudentJwtAuthGuard } from '../auth/student-jwt.guard';

@Controller('student/sessions')
@UseGuards(StudentJwtAuthGuard)
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) { }

    @Post('start/:testId')
    async startSession(@Req() req, @Param('testId') testId: string) {
        return this.sessionsService.startTestSession(req.user.sub, testId);
    }

    @Get('active/:testId')
    async getActiveSession(@Req() req, @Param('testId') testId: string) {
        return this.sessionsService.getActiveSession(req.user.sub, testId);
    }

    @Post('answer')
    async saveAnswer(
        @Req() req,
        @Body() body: { sessionId: string; questionId: string; optionId: string }
    ) {
        return this.sessionsService.saveAnswer(
            req.user.sub,
            body.sessionId,
            body.questionId,
            body.optionId
        );
    }

    @Post('submit/:sessionId')
    async submitSession(@Req() req, @Param('sessionId') sessionId: string) {
        return this.sessionsService.submitTestSession(req.user.sub, sessionId);
    }
}
