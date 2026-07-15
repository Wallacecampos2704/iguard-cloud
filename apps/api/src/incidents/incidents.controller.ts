import { Controller, Get, Param, Post } from '@nestjs/common';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  findAll() {
    return this.incidentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string) {
    return this.incidentsService.acknowledge(id);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.incidentsService.resolve(id);
  }
}
