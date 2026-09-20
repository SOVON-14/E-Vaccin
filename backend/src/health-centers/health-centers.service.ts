import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateHealthCenterDto } from './dto/create-health-center.dto';

@Injectable()
export class HealthCentersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(region?: string, isActive?: boolean) {
    return this.prisma.healthCenter.findMany({
      where: {
        ...(region ? { region: { contains: region, mode: 'insensitive' } } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        _count: {
          select: {
            children: true,
            vaccinations: true,
            healthWorkers: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const center = await this.prisma.healthCenter.findUnique({
      where: { id },
      include: {
        healthWorkers: true,
        vaccineBatches: {
          where: { isActive: true },
          include: { vaccine: true },
        },
        _count: {
          select: { children: true, vaccinations: true },
        },
      },
    });

    if (!center) {
      throw new NotFoundException(`Centre de santé #${id} introuvable`);
    }

    return center;
  }

  async create(dto: CreateHealthCenterDto) {
    const existing = await this.prisma.healthCenter.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Un centre avec le code ${dto.code} existe déjà`);
    }

    return this.prisma.healthCenter.create({
      data: dto,
    });
  }
}
