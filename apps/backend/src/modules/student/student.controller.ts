import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentJwtAuthGuard } from '../auth/student-jwt.guard';

@UseGuards(StudentJwtAuthGuard)
@Controller('student')
export class StudentController {
    constructor(private readonly studentService: StudentService) { }

    @Get('profile')
    getProfile(@Request() req) {
        return this.studentService.getProfile(req.user.sub);
    }

    @Get('tests')
    getTests(@Request() req) {
        return this.studentService.getAvailableTests(req.user.sub);
    }

    @Get('sessions/active')
    getActiveSession(@Request() req) {
        return this.studentService.getActiveSession(req.user.sub);
    }

    @Post('sessions/start/:testId')
    startSession(@Request() req, @Param('testId') testId: string) {
        return this.studentService.startSession(req.user.sub, testId);
    }

    @Post('sessions/answer')
    saveAnswer(@Request() req, @Body() dto: { sessionId: string, questionId: string, optionId: string }) {
        return this.studentService.saveAnswer(req.user.sub, dto.sessionId, dto.questionId, dto.optionId);
    }

    @Post('sessions/submit/:sessionId')
    submitSession(@Request() req, @Param('sessionId') sessionId: string) {
        return this.studentService.submitSession(req.user.sub, sessionId);
    }

    @Get('results')
    getResults(@Request() req) {
        return this.studentService.getResults(req.user.sub);
    }

    @Get('results/:id')
    getResult(@Request() req, @Param('id') id: string) {
        return this.studentService.getResult(req.user.sub, id);
    }

    @Post('leads/consultation')
    requestConsultation(@Request() req, @Body() dto: { courseType: 'ONLINE' | 'OFFLINE' }) {
        return this.studentService.requestConsultation(req.user.sub, dto.courseType);
    }
}
