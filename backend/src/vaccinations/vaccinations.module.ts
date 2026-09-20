import { Module } from '@nestjs/common';
import { ChildrenModule } from '../children/children.module';
import { VaccinationsService } from './vaccinations.service';
import { VaccinationsController } from './vaccinations.controller';

@Module({
  imports: [ChildrenModule],
  controllers: [VaccinationsController],
  providers: [VaccinationsService],
  exports: [VaccinationsService],
})
export class VaccinationsModule {}
