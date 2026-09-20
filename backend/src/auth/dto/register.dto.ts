import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Rôles autorisés à l'auto-inscription.
 * ADMIN et CENTER_MANAGER ne peuvent être attribués que par un administrateur,
 * jamais via l'endpoint public d'inscription.
 */
const SELF_REGISTRABLE_ROLES: UserRole[] = [UserRole.PARENT, UserRole.HEALTH_WORKER];

export class RegisterDto {
  @ApiProperty({ example: 'parent@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'User password (minimum 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Koffi', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Dosseh', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+22890112233', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: SELF_REGISTRABLE_ROLES,
    default: UserRole.PARENT,
    description: 'Rôle auto-attribuable à l\'inscription (PARENT ou HEALTH_WORKER uniquement)',
  })
  @IsOptional()
  @IsIn(SELF_REGISTRABLE_ROLES, {
    message:
      'Rôle non autorisé à l\'inscription : seuls PARENT et HEALTH_WORKER peuvent créer un compte eux-mêmes',
  })
  role?: UserRole = UserRole.PARENT;

  @ApiPropertyOptional({ example: 'CHR-LOME-001', description: 'Health Center ID if health worker' })
  @IsOptional()
  @IsString()
  healthCenterId?: string;

  @ApiPropertyOptional({ example: 'LIC-2026-001', description: 'License number if health worker' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;
}
