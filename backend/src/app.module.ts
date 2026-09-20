import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChildrenModule } from './children/children.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { VaccinationsModule } from './vaccinations/vaccinations.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthCentersModule } from './health-centers/health-centers.module';
import { StockModule } from './stock/stock.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChildrenModule,
    VaccinesModule,
    VaccinationsModule,
    AppointmentsModule,
    NotificationsModule,
    HealthCentersModule,
    StockModule,
    ReportsModule,
    AuditModule,
  ],
})
export class AppModule {}
