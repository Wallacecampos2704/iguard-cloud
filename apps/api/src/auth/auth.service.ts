import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCRYPT_ROUNDS,
  DUMMY_PASSWORD_HASH,
  GENERIC_LOGIN_FAILURE_MESSAGE,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  SESSION_REFRESH_THRESHOLD_MS,
} from './auth.constants';
import type {
  AuthenticatedUser,
  LoginInput,
  LoginResult,
  SessionMetadata,
} from './auth.types';

const EMAIL_MAX_LENGTH = 320;
const USER_AGENT_MAX_LENGTH = 255;
const IP_ADDRESS_MAX_LENGTH = 64;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async hashPassword(password: string): Promise<string> {
    if (typeof password !== 'string') {
      throw new BadRequestException('Senha inválida.');
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new BadRequestException(
        `A senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      );
    }

    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
      throw new BadRequestException(
        `A senha deve ter no máximo ${PASSWORD_MAX_BYTES} bytes.`,
      );
    }

    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async login(
    input: LoginInput,
    metadata: SessionMetadata,
  ): Promise<LoginResult> {
    const email = this.normalizeEmail(input?.email);
    const password = input?.password;

    if (typeof password !== 'string' || password.length === 0) {
      throw new BadRequestException('Informe e-mail e senha.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!user || !user.active || !passwordMatches) {
      throw new UnauthorizedException(GENERIC_LOGIN_FAILURE_MESSAGE);
    }

    const sessionToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(sessionToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_IDLE_MS);

    const [, updatedUser] = await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          userId: user.id,
          tokenHash,
          userAgent: this.truncate(metadata.userAgent, USER_AGENT_MAX_LENGTH),
          ipAddress: this.truncate(metadata.ipAddress, IP_ADDRESS_MAX_LENGTH),
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      }),
    ]);

    return {
      sessionToken,
      user: this.toAuthenticatedUser(updatedUser),
    };
  }

  async validateSession(
    sessionToken: string | undefined,
  ): Promise<AuthenticatedUser> {
    if (!sessionToken) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    const tokenHash = this.hashToken(sessionToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    if (!session.user.active) {
      await this.prisma.session.deleteMany({
        where: { userId: session.userId },
      });
      throw new UnauthorizedException('Sessão inválida.');
    }

    const now = new Date();
    const absoluteExpiresAt = new Date(
      session.createdAt.getTime() + SESSION_ABSOLUTE_MS,
    );
    const isIdleExpired = session.expiresAt.getTime() <= now.getTime();
    const isAbsoluteExpired = absoluteExpiresAt.getTime() <= now.getTime();

    if (isIdleExpired || isAbsoluteExpired) {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      throw new UnauthorizedException('Sessão inválida.');
    }

    const idleElapsedMs = now.getTime() - session.lastUsedAt.getTime();

    if (idleElapsedMs >= SESSION_REFRESH_THRESHOLD_MS) {
      const slidingExpiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
      const nextExpiresAt =
        slidingExpiresAt.getTime() < absoluteExpiresAt.getTime()
          ? slidingExpiresAt
          : absoluteExpiresAt;

      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: now, expiresAt: nextExpiresAt },
      });
    }

    return this.toAuthenticatedUser(session.user);
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }

    const tokenHash = this.hashToken(sessionToken);
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }

  private normalizeEmail(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Informe e-mail e senha.');
    }

    const normalized = value.trim().toLowerCase();

    if (!normalized || normalized.length > EMAIL_MAX_LENGTH) {
      throw new BadRequestException('Informe e-mail e senha.');
    }

    return normalized;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private truncate(value: string | null, maxLength: number): string | null {
    if (!value) {
      return null;
    }

    return value.slice(0, maxLength);
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
