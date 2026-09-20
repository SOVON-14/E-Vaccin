import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VaccinationsService } from './vaccinations.service';
import { RecordVaccinationDto } from './dto/record-vaccination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('vaccinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vaccinations')
export class VaccinationsController {
  constructor(private readonly vaccinationsService: VaccinationsService) {}

  @Post()
  @Roles(UserRole.HEALTH_WORKER, UserRole.ADMIN, UserRole.CENTER_MANAGER)
  @ApiOperation({ summary: 'Enregistrer une vaccination administrée (Agent de santé)' })
  async record(@Body() dto: RecordVaccinationDto, @CurrentUser() user: any) {
    return this.vaccinationsService.record(dto, user);
  }

  @Get('child/:childId')
  @ApiOperation({
    summary: 'Obtenir l’historique des vaccinations d’un enfant',
    description:
      'Accès restreint : parent propriétaire, agent du centre de rattachement, ou administrateur.',
  })
  async findByChild(@Param('childId') childId: string, @CurrentUser() user: any) {
    return this.vaccinationsService.findByChild(childId, user);
  }
}
