import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from './auth.constants';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { SessionGuard } from './session.guard';
import type { AuthenticatedUser, LoginInput } from './auth.types';

function buildCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function readUserAgent(request: Request): string | null {
  return request.headers['user-agent'] ?? null;
}

function readSessionCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, string> | undefined;
  return cookies?.[AUTH_COOKIE_NAME];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body, {
      userAgent: readUserAgent(request),
      ipAddress: request.ip ?? null,
    });

    response.cookie(AUTH_COOKIE_NAME, result.sessionToken, {
      ...buildCookieOptions(),
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });

    return { user: result.user };
  }

  @UseGuards(SessionGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(readSessionCookie(request));
    response.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
  }
}
