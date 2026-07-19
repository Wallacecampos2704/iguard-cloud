import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, string> | undefined;
    const sessionToken = cookies?.[AUTH_COOKIE_NAME];

    const user = await this.authService.validateSession(sessionToken);
    request.user = user;

    return true;
  }
}
