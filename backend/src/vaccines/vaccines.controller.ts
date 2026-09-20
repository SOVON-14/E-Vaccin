import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VaccinesService } from './vaccines.service';

@ApiTags('vaccines')
@Controller('vaccines')
export class VaccinesController {
  constructor(private readonly vaccinesService: VaccinesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les vaccins disponibles' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query('isActive') isActive?: string) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.vaccinesService.findAll(activeBool);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Obtenir le calendrier vaccinal complet (PEV)' })
  async getSchedule() {
    return this.vaccinesService.getSchedule();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir les détails d’un vaccin par son ID' })
  async findOne(@Param('id') id: string) {
    return this.vaccinesService.findOne(id);
  }
}
