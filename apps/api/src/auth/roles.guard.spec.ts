import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

function buildUser(role: UserRole): AuthenticatedUser {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'user@example.com',
    name: 'Test User',
    role,
    active: true,
    lastLoginAt: null,
  };
}

function buildContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => () => undefined,
    getClass: () => () => undefined,
  } as unknown as ExecutionContext;
}

function buildReflector(requiredRoles: UserRole[] | undefined) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('permite acesso quando nenhuma role é exigida pela rota', () => {
    const reflector = buildReflector(undefined);
    const guard = new RolesGuard(reflector);
    const context = buildContext({ user: buildUser(UserRole.VIEWER) });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite acesso quando a lista de roles exigidas está vazia', () => {
    const reflector = buildReflector([]);
    const guard = new RolesGuard(reflector);
    const context = buildContext({ user: buildUser(UserRole.VIEWER) });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite acesso quando o usuário possui uma das roles exigidas', () => {
    const reflector = buildReflector([UserRole.ADMIN, UserRole.MASTER]);
    const guard = new RolesGuard(reflector);
    const context = buildContext({ user: buildUser(UserRole.ADMIN) });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nega acesso com ForbiddenException quando o usuário não possui a role exigida', () => {
    const reflector = buildReflector([UserRole.MASTER]);
    const guard = new RolesGuard(reflector);
    const context = buildContext({ user: buildUser(UserRole.OPERATOR) });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nega acesso com UnauthorizedException (401) quando não há usuário anexado à requisição', () => {
    const reflector = buildReflector([UserRole.MASTER]);
    const guard = new RolesGuard(reflector);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('usuário permitido pela lista de roles retorna true', () => {
    const reflector = buildReflector([UserRole.OPERATOR, UserRole.ADMIN]);
    const guard = new RolesGuard(reflector);
    const context = buildContext({ user: buildUser(UserRole.OPERATOR) });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('MASTER não possui bypass implícito: fora da lista de roles exigidas, recebe ForbiddenException (403)', () => {
    const reflector = buildReflector([UserRole.ADMIN, UserRole.OPERATOR]);
    const guard = new RolesGuard(reflector);
    const context = buildContext({ user: buildUser(UserRole.MASTER) });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('MASTER sem sessão (sem request.user) recebe UnauthorizedException (401), não ForbiddenException', () => {
    const reflector = buildReflector([UserRole.MASTER]);
    const guard = new RolesGuard(reflector);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).not.toThrow(ForbiddenException);
  });
});
