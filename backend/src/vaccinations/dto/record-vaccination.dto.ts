import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecordVaccinationDto {
  @ApiProperty({ example: 'child-uuid' })
  @IsString()
  @IsNotEmpty()
  childId: string;

  @ApiProperty({ example: 'vaccine-uuid' })
  @IsString()
  @IsNotEmpty()
  vaccineId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  doseNumber: number;

  @ApiProperty({ example: 'BCG-2026-LOT1' })
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @ApiPropertyOptional({ example: 'health-center-uuid' })
  @IsOptional()
  @IsString()
  healthCenterId?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  vaccinationDate?: string;

  @ApiPropertyOptional({ example: 'Aucune complication, enfant calme' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Légère rougeur au point d’injection' })
  @IsOptional()
  @IsString()
  adverseReaction?: string;
}
