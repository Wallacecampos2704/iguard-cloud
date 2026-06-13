import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DashboardController } from './dashboard.controller';
import { DevicesController } from './devices.controller';

@Module({
  imports: [],
  controllers: [AppController, DashboardController, DevicesController],
  providers: [],
})
export class AppModule {}
