import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from './auth.constants';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SessionGuard } from './session.guard';
import type { AuthenticatedUser } from './auth.types';

function buildResponse() {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const response = { cookie, clearCookie } as unknown as Response;

  return { response, cookie, clearCookie };
}

const safeUser = {
  id: 'user-1',
  organizationId: 'org-1',
  email: 'user@example.com',
  name: 'Test User',
  role: 'OPERATOR',
  active: true,
  lastLoginAt: null,
};

describe('AuthController', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('login cria o cookie de sessão com todas as opções corretas', async () => {
    process.env.NODE_ENV = 'development';
    const login = jest.fn().mockResolvedValue({
      sessionToken: 'raw-session-token',
      user: safeUser,
    });
    const controller = new AuthController({ login } as unknown as AuthService);
    const { response, cookie } = buildResponse();
    const request = {
      headers: { 'user-agent': 'jest-agent' },
      ip: '127.0.0.1',
    } as unknown as Request;

    await controller.login(
      { email: 'user@example.com', password: 'super-secret-pass' },
      request,
      response,
    );

    expect(cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'raw-session-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });
  });

  it('login não retorna sessionToken no corpo da resposta', async () => {
    const login = jest.fn().mockResolvedValue({
      sessionToken: 'raw-session-token',
      user: safeUser,
    });
    const controller = new AuthController({ login } as unknown as AuthService);
    const { response } = buildResponse();
    const request = {
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request;

    const result = await controller.login(
      { email: 'user@example.com', password: 'super-secret-pass' },
      request,
      response,
    );

    expect(result).toEqual({ user: safeUser });
    expect(JSON.stringify(result)).not.toContain('raw-session-token');
  });

  it('repassa IP e user-agent da requisição para o AuthService', async () => {
    const login = jest.fn().mockResolvedValue({
      sessionToken: 'raw-session-token',
      user: safeUser,
    });
    const controller = new AuthController({ login } as unknown as AuthService);
    const { response } = buildResponse();
    const request = {
      headers: { 'user-agent': 'custom-agent' },
      ip: '10.0.0.5',
    } as unknown as Request;

    await controller.login(
      { email: 'user@example.com', password: 'super-secret-pass' },
      request,
      response,
    );

    expect(login).toHaveBeenCalledWith(
      { email: 'user@example.com', password: 'super-secret-pass' },
      { userAgent: 'custom-agent', ipAddress: '10.0.0.5' },
    );
  });

  it('me devolve o usuário que o SessionGuard anexou à requisição', () => {
    const controller = new AuthController({} as unknown as AuthService);

    const result = controller.me(safeUser as unknown as AuthenticatedUser);

    expect(result).toEqual({ user: safeUser });
  });

  it('logout chama AuthService.logout com o token do cookie', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    const controller = new AuthController({ logout } as unknown as AuthService);
    const { response } = buildResponse();
    const request = {
      cookies: { [AUTH_COOKIE_NAME]: 'cookie-token' },
    } as unknown as Request;

    await controller.logout(request, response);

    expect(logout).toHaveBeenCalledWith('cookie-token');
  });

  it('logout limpa o cookie com as mesmas opções usadas na criação', async () => {
    process.env.NODE_ENV = 'production';
    const logout = jest.fn().mockResolvedValue(undefined);
    const controller = new AuthController({ logout } as unknown as AuthService);
    const { response, clearCookie } = buildResponse();
    const request = {
      cookies: {},
    } as unknown as Request;

    await controller.logout(request, response);

    expect(clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('logout responde com status HTTP 204', () => {
    const prototype = AuthController.prototype as unknown as Record<
      string,
      unknown
    >;
    const status = Reflect.getMetadata(
      HTTP_CODE_METADATA,
      prototype.logout,
    ) as number;

    expect(status).toBe(204);
  });

  it('aplica SessionGuard somente na rota GET /auth/me', () => {
    const prototype = AuthController.prototype as unknown as Record<
      string,
      unknown
    >;

    const meGuards = Reflect.getMetadata(GUARDS_METADATA, prototype.me) as
      | unknown[]
      | undefined;
    const loginGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      prototype.login,
    ) as unknown[] | undefined;
    const logoutGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      prototype.logout,
    ) as unknown[] | undefined;

    expect(meGuards).toContain(SessionGuard);
    expect(loginGuards ?? []).not.toContain(SessionGuard);
    expect(logoutGuards ?? []).not.toContain(SessionGuard);
  });

  it('marca login e logout como públicos, e não marca me como público', () => {
    const prototype = AuthController.prototype as unknown as Record<
      string,
      unknown
    >;

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, prototype.login)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, prototype.logout)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, prototype.me)).toBeUndefined();
  });
});
