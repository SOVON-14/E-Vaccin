import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('children')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Post()
  @ApiOperation({ summary: 'Enregistrer un nouvel enfant (Parent ou Agent)' })
  async create(@Body() dto: CreateChildDto, @CurrentUser() user: any) {
    return this.childrenService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les enfants avec pagination et recherche' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    return this.childrenService.findAll(user, search, page, limit);
  }

  @Get('by-unique-id/:uniqueId')
  @ApiOperation({
    summary: 'Rechercher un enfant par son identifiant unique ou QR code',
    description:
      'Accès restreint : parent propriétaire, agent du centre de rattachement, ou administrateur.',
  })
  async findByUniqueId(@Param('uniqueId') uniqueId: string, @CurrentUser() user: any) {
    return this.childrenService.findByUniqueId(uniqueId, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consulter le carnet vaccinal détaillé d’un enfant',
    description:
      'Accès restreint : parent propriétaire, agent du centre de rattachement, ou administrateur.',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.childrenService.findOne(id, user);
  }

  @Get(':id/upcoming-vaccinations')
  @ApiOperation({
    summary: 'Calculer les prochaines doses attendues pour l’enfant',
    description:
      'Accès restreint : parent propriétaire, agent du centre de rattachement, ou administrateur.',
  })
  async getUpcoming(@Param('id') id: string, @CurrentUser() user: any) {
    return this.childrenService.getUpcomingVaccinations(id, user);
  }
}
