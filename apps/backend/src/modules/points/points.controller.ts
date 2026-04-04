import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PointsService } from './points.service';
import { StudentJwtAuthGuard } from '../auth/student-jwt.guard';

@Controller('student/points')
@UseGuards(StudentJwtAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('balance')
  async getBalance(@Req() req: any) {
    const balance = await this.pointsService.getBalance(req.user.id);
    return { balance };
  }

  @Get('history')
  async getHistory(@Req() req: any) {
    return this.pointsService.getHistory(req.user.id);
  }
}
