import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { RedemptionStatus } from '@prisma/client';

@Injectable()
export class StoreService {
  constructor(
    private prisma: PrismaService,
    private pointsService: PointsService,
  ) {}

  async getAllRewards(isActiveOnly = true) {
    return this.prisma.reward.findMany({
      where: isActiveOnly ? { is_active: true } : {},
      orderBy: { point_cost: 'asc' },
    });
  }

  async getRewardById(id: string) {
    return this.prisma.reward.findUnique({
      where: { id },
    });
  }

  async redeemReward(userId: string, rewardId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });

      if (!reward || !reward.is_active) {
        throw new BadRequestException('Reward not available');
      }

      if (reward.stock_limits !== null && reward.stock_limits <= 0) {
        throw new BadRequestException('Reward out of stock');
      }

      // Points balance check and deduction is handled within pointsService (or here via transaction)
      // Since we want to ensure atomicity, we'll implement the logic here inside the tx
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { points_balance: true },
      });

      if (!user || user.points_balance < reward.point_cost) {
        throw new BadRequestException('Insufficient points balance');
      }

      // Deduct points
      await tx.user.update({
        where: { id: userId },
        data: {
          points_balance: {
            decrement: reward.point_cost,
          },
        },
      });

      // Log point history
      await tx.pointHistory.create({
        data: {
          user_id: userId,
          amount: -reward.point_cost,
          reason: `REDEEM_REWARD: ${reward.title_ru}`,
        },
      });

      // Decrement stock if applicable
      if (reward.stock_limits !== null) {
        await tx.reward.update({
          where: { id: rewardId },
          data: {
            stock_limits: {
              decrement: 1,
            },
          },
        });
      }

      // Create redemption record
      return tx.redemption.create({
        data: {
          user_id: userId,
          reward_id: rewardId,
          status: RedemptionStatus.PENDING,
        },
        include: {
          reward: true,
        },
      });
    });
  }

  async getMyRedemptions(userId: string) {
    return this.prisma.redemption.findMany({
      where: { user_id: userId },
      include: { reward: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
