import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { NotificationType, NotificationStatus } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.SMS })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'Rappel de vaccination' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Le rendez-vous de votre enfant approche' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ example: 'parent@example.com' })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({ example: '+22890112233' })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiPropertyOptional({ example: '2026-09-25T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: { appointmentId: 'apt-uuid' } })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ListNotificationsDto {
  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit: number = 20;
}
