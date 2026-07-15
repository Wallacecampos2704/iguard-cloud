import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IncidentsController } from './incidents.controller';

describe('IncidentsController routes', () => {
  const route = (method: keyof IncidentsController) =>
    Object.getOwnPropertyDescriptor(IncidentsController.prototype, method)
      ?.value as object;

  it('expõe GET /incidents', () => {
    expect(Reflect.getMetadata(PATH_METADATA, IncidentsController)).toBe(
      'incidents',
    );
    expect(Reflect.getMetadata(PATH_METADATA, route('findAll'))).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, route('findAll'))).toBe(
      RequestMethod.GET,
    );
  });

  it('expõe GET /incidents/:id', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('findOne'))).toBe(':id');
    expect(Reflect.getMetadata(METHOD_METADATA, route('findOne'))).toBe(
      RequestMethod.GET,
    );
  });

  it('expõe POST /incidents/:id/acknowledge', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('acknowledge'))).toBe(
      ':id/acknowledge',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, route('acknowledge'))).toBe(
      RequestMethod.POST,
    );
  });

  it('expõe POST /incidents/:id/resolve', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('resolve'))).toBe(
      ':id/resolve',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, route('resolve'))).toBe(
      RequestMethod.POST,
    );
  });
});
