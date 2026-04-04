import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points_balance: true },
    });
    return user?.points_balance || 0;
  }

  async addPoints(userId: string, amount: number, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          points_balance: {
            increment: amount,
          },
        },
      });

      await tx.pointHistory.create({
        data: {
          user_id: userId,
          amount,
          reason,
        },
      });

      return user.points_balance;
    });
  }

  async deductPoints(userId: string, amount: number, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { points_balance: true },
      });

      if (!user || user.points_balance < amount) {
        throw new Error('Insufficient points balance');
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points_balance: {
            decrement: amount,
          },
        },
      });

      await tx.pointHistory.create({
        data: {
          user_id: userId,
          amount: -amount,
          reason,
        },
      });

      return updatedUser.points_balance;
    });
  }

  async getHistory(userId: string) {
    return this.prisma.pointHistory.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }
}
