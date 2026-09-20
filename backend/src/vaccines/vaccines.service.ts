import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class VaccinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    return this.prisma.vaccine.findMany({
      where: isActive !== undefined ? { isActive } : {},
      include: {
        vaccineSchedules: {
          orderBy: { doseNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const vaccine = await this.prisma.vaccine.findUnique({
      where: { id },
      include: {
        vaccineSchedules: {
          orderBy: { doseNumber: 'asc' },
        },
      },
    });

    if (!vaccine) {
      throw new NotFoundException(`Vaccin #${id} introuvable`);
    }

    return vaccine;
  }

  async getSchedule() {
    return this.prisma.vaccineSchedule.findMany({
      where: { isActive: true },
      include: {
        vaccine: true,
      },
      orderBy: [
        { minAgeDays: 'asc' },
        { doseNumber: 'asc' },
      ],
    });
  }
}
