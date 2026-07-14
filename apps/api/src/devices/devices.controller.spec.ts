import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DevicesController } from './devices.controller';

describe('DevicesController routes', () => {
  it('expõe POST /devices/check-all', () => {
    const handler = Object.getOwnPropertyDescriptor(
      DevicesController.prototype,
      'checkAll',
    )?.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('check-all');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
  });

  it('expõe GET /devices/:id/checks', () => {
    const handler = Object.getOwnPropertyDescriptor(
      DevicesController.prototype,
      'getChecks',
    )?.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/checks');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );
  });
});
