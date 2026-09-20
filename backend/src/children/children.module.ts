import { Module } from '@nestjs/common';
import { ChildrenService } from './children.service';
import { ChildAccessService } from './child-access.service';
import { ChildrenController } from './children.controller';

@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService, ChildAccessService],
  exports: [ChildrenService, ChildAccessService],
})
export class ChildrenModule {}
