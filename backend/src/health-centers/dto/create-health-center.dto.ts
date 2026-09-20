import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateHealthCenterDto {
  @ApiProperty({ example: 'Centre Médico-Social de Bè' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CMS-BE-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Quartier Bè, Rue du Commerce' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Maritime' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({ example: 'Golfe' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({ example: '+22822210001' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'contact@cms-be.tg' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 6.1301 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 1.2355 })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
