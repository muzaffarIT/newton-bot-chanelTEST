import {
  Controller, Get, Post, Put, Delete, Body, Param,
  HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard';
import { RewardType } from '@prisma/client';
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class CreateRewardDto {
  @IsString()
  title_ru: string;

  @IsString()
  title_uz: string;

  @IsString()
  @IsOptional()
  description_ru?: string;

  @IsString()
  @IsOptional()
  description_uz?: string;

  @IsNumber()
  @Type(() => Number)
  point_cost: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stock_limits?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsEnum(RewardType)
  @IsOptional()
  type?: RewardType;

  @IsString()
  @IsOptional()
  image_url?: string;
}

/**
 * Admin Store Controller.
 * Routes: /api/admin/store/rewards
 */
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/store/rewards')
export class AdminStoreController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.reward.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) throw new HttpException('Reward not found', HttpStatus.NOT_FOUND);
    return reward;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRewardDto) {
    return this.prisma.reward.create({
      data: {
        title_ru: dto.title_ru,
        title_uz: dto.title_uz,
        description_ru: dto.description_ru,
        description_uz: dto.description_uz,
        point_cost: dto.point_cost,
        stock_limits: dto.stock_limits,
        is_active: dto.is_active ?? true,
        type: dto.type ?? RewardType.DISCOUNT,
        image_url: dto.image_url,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateRewardDto>) {
    return this.prisma.reward.update({
      where: { id },
      data: dto,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.reward.delete({ where: { id } });
    return { success: true };
  }
}
