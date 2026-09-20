import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateChildDto {
  @ApiProperty({ example: 'Kévin' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Dosseh' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ example: 'Lomé' })
  @IsOptional()
  @IsString()
  placeOfBirth?: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiProperty({ example: 'health-center-uuid' })
  @IsString()
  @IsNotEmpty()
  healthCenterId: string;

  @ApiPropertyOptional({ example: 'parent-uuid', description: 'Obligatoire si enregistré par un agent' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
