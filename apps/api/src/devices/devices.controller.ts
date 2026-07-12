import { Body, Controller, Get, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';

type CreateDeviceBody = {
  name: string;
  deviceType: string;
  host: string;
  port?: number;
  currentStatus?: string;
};

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  @Post()
  create(@Body() body: CreateDeviceBody) {
    return this.devicesService.create(body);
  }
}
