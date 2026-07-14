import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { DevicesService } from './devices.service';

type CreateDeviceBody = {
  name: string;
  deviceType: string;
  host: string;
  port?: number | null;
  currentStatus?: string;
  checkType?: string;
};

type UpdateDeviceBody = Partial<CreateDeviceBody>;

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

  @Post(':id/check')
  check(@Param('id') id: string) {
    return this.devicesService.check(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateDeviceBody) {
    return this.devicesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }
}
