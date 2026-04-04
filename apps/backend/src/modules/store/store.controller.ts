import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { StoreService } from './store.service';
import { StudentJwtAuthGuard } from '../auth/student-jwt.guard';

@Controller('student/store')
@UseGuards(StudentJwtAuthGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('rewards')
  async getRewards() {
    return this.storeService.getAllRewards();
  }

  @Post('redeem/:id')
  async redeem(@Req() req: any, @Param('id') id: string) {
    return this.storeService.redeemReward(req.user.id, id);
  }

  @Get('my-redemptions')
  async getMyRedemptions(@Req() req: any) {
    return this.storeService.getMyRedemptions(req.user.id);
  }
}
