import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { CustomersModule } from './customers/customers.module';
import { DevicesModule } from './devices/devices.module';
import { ChecksModule } from './checks/checks.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    PrismaModule,
    DashboardModule,
    HealthModule,
    CustomersModule,
    DevicesModule,
    ChecksModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}