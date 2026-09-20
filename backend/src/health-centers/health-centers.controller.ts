import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HealthCentersService } from './health-centers.service';
import { CreateHealthCenterDto } from './dto/create-health-center.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('health-centers')
@Controller('health-centers')
export class HealthCentersController {
  constructor(private readonly healthCentersService: HealthCentersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les centres de santé' })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('region') region?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.healthCentersService.findAll(region, activeBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir les détails d’un centre de santé' })
  async findOne(@Param('id') id: string) {
    return this.healthCentersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau centre de santé (Admin uniquement)' })
  async create(@Body() dto: CreateHealthCenterDto) {
    return this.healthCentersService.create(dto);
  }
}
