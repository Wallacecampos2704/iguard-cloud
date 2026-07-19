import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';
import { AUTH_COOKIE_NAME } from './auth.constants';
import type { AuthenticatedRequest } from './auth.types';

const safeUser = {
  id: 'user-1',
  organizationId: 'org-1',
  email: 'user@example.com',
  name: 'Test User',
  role: UserRole.OPERATOR,
  active: true,
  lastLoginAt: null,
};

function buildContext(request: Partial<AuthenticatedRequest>): {
  context: ExecutionContext;
  handler: () => void;
  klass: () => void;
} {
  const handler = () => undefined;
  const klass = () => undefined;
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => handler,
    getClass: () => klass,
  } as unknown as ExecutionContext;

  return { context, handler, klass };
}

function buildReflector(isPublic: boolean) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
}

describe('SessionGuard', () => {
  it('permite acesso sem validar sessão quando a rota é pública', async () => {
    const validateSession = jest.fn();
    const authService = { validateSession } as unknown as AuthService;
    const reflector = buildReflector(true);
    const guard = new SessionGuard(authService, reflector);
    const { context } = buildContext({ cookies: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validateSession).not.toHaveBeenCalled();
  });

  it('valida a sessão pelo cookie correto e anexa o usuário à requisição', async () => {
    const validateSession = jest.fn().mockResolvedValue(safeUser);
    const authService = { validateSession } as unknown as AuthService;
    const reflector = buildReflector(false);
    const guard = new SessionGuard(authService, reflector);
    const request: Partial<AuthenticatedRequest> = {
      cookies: { [AUTH_COOKIE_NAME]: 'raw-token', other: 'ignored' },
    };
    const { context } = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validateSession).toHaveBeenCalledWith('raw-token');
    expect(request.user).toEqual(safeUser);
  });

  it('repassa undefined ao AuthService quando não há cookie de sessão', async () => {
    const validateSession = jest
      .fn()
      .mockRejectedValue(new UnauthorizedException('Sessão inválida.'));
    const authService = { validateSession } as unknown as AuthService;
    const reflector = buildReflector(false);
    const guard = new SessionGuard(authService, reflector);
    const { context } = buildContext({ cookies: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(validateSession).toHaveBeenCalledWith(undefined);
  });

  it('propaga UnauthorizedException quando a sessão é inválida ou expirada', async () => {
    const validateSession = jest
      .fn()
      .mockRejectedValue(new UnauthorizedException('Sessão inválida.'));
    const authService = { validateSession } as unknown as AuthService;
    const reflector = buildReflector(false);
    const guard = new SessionGuard(authService, reflector);
    const request: Partial<AuthenticatedRequest> = {
      cookies: { [AUTH_COOKIE_NAME]: 'expired-token' },
    };
    const { context } = buildContext(request);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });
});
