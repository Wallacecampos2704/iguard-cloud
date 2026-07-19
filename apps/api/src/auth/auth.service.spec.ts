import { createHash } from 'node:crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole, type User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import {
  DUMMY_PASSWORD_HASH,
  GENERIC_LOGIN_FAILURE_MESSAGE,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  SESSION_REFRESH_THRESHOLD_MS,
} from './auth.constants';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'user@example.com',
    passwordHash: 'stored-hash',
    name: 'Test User',
    role: UserRole.OPERATOR,
    active: true,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
}

const metadata = { userAgent: 'jest-agent', ipAddress: '127.0.0.1' };

describe('AuthService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('login', () => {
    it('normaliza o e-mail com trim e lowercase antes de buscar o usuário', async () => {
      const prisma = buildPrismaMock();
      prisma.user.findUnique.mockResolvedValue(null);
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(
        service.login(
          { email: '  User@Example.com  ', password: 'whatever-password' },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });

    it('rejeita body estruturalmente inválido com BadRequestException', async () => {
      const prisma = buildPrismaMock();
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(
        service.login({ email: '', password: 'anything' }, metadata),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.login({ email: 'user@example.com', password: '' }, metadata),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('usuário inexistente falha com mensagem genérica', async () => {
      const prisma = buildPrismaMock();
      prisma.user.findUnique.mockResolvedValue(null);
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(
        service.login(
          { email: 'ghost@example.com', password: 'whatever-password' },
          metadata,
        ),
      ).rejects.toMatchObject({ message: GENERIC_LOGIN_FAILURE_MESSAGE });
    });

    it('usuário inativo falha com a mesma mensagem genérica', async () => {
      const prisma = buildPrismaMock();
      const passwordHash = await bcrypt.hash('correct-password-123', 4);
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ active: false, passwordHash }),
      );
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(
        service.login(
          { email: 'user@example.com', password: 'correct-password-123' },
          metadata,
        ),
      ).rejects.toMatchObject({ message: GENERIC_LOGIN_FAILURE_MESSAGE });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('senha incorreta falha com a mesma mensagem genérica', async () => {
      const prisma = buildPrismaMock();
      const passwordHash = await bcrypt.hash('correct-password-123', 4);
      prisma.user.findUnique.mockResolvedValue(buildUser({ passwordHash }));
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(
        service.login(
          { email: 'user@example.com', password: 'wrong-password-999' },
          metadata,
        ),
      ).rejects.toMatchObject({ message: GENERIC_LOGIN_FAILURE_MESSAGE });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('executa comparação bcrypt com hash dummy quando o usuário não existe', async () => {
      const prisma = buildPrismaMock();
      prisma.user.findUnique.mockResolvedValue(null);
      const compareSpy = jest.spyOn(bcrypt, 'compare');
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(
        service.login(
          { email: 'ghost@example.com', password: 'whatever-password' },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(compareSpy).toHaveBeenCalledWith(
        'whatever-password',
        DUMMY_PASSWORD_HASH,
      );
    });

    it('login válido cria uma sessão e retorna o usuário', async () => {
      const prisma = buildPrismaMock();
      const passwordHash = await bcrypt.hash('correct-password-123', 4);
      const user = buildUser({ passwordHash });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.session.create.mockResolvedValue({ id: 'session-1' });
      prisma.user.update.mockResolvedValue({
        ...user,
        lastLoginAt: new Date(),
      });
      const service = new AuthService(prisma as unknown as PrismaService);

      const result = await service.login(
        { email: 'user@example.com', password: 'correct-password-123' },
        metadata,
      );

      expect(typeof result.sessionToken).toBe('string');
      expect(result.sessionToken.length).toBeGreaterThan(0);
      expect(result.user.id).toBe('user-1');
      expect(prisma.session.create).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('persiste somente o tokenHash (sha256 do token), nunca o token bruto', async () => {
      const prisma = buildPrismaMock();
      const passwordHash = await bcrypt.hash('correct-password-123', 4);
      const user = buildUser({ passwordHash });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.session.create.mockResolvedValue({ id: 'session-1' });
      prisma.user.update.mockResolvedValue(user);
      const service = new AuthService(prisma as unknown as PrismaService);

      const result = await service.login(
        { email: 'user@example.com', password: 'correct-password-123' },
        metadata,
      );

      const createMock = prisma.session.create as jest.Mock<
        Promise<{ id: string }>,
        [{ data: Record<string, unknown> }]
      >;
      const createCallArgs = createMock.mock.calls[0][0];
      expect(createCallArgs.data.tokenHash).toBe(sha256(result.sessionToken));
      expect(Object.values(createCallArgs.data)).not.toContain(
        result.sessionToken,
      );
      expect(JSON.stringify(createCallArgs.data)).not.toContain(
        result.sessionToken,
      );
    });

    it('atualiza lastLoginAt somente quando o login é bem-sucedido', async () => {
      const prisma = buildPrismaMock();
      const passwordHash = await bcrypt.hash('correct-password-123', 4);
      const user = buildUser({ passwordHash });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.session.create.mockResolvedValue({ id: 'session-1' });
      prisma.user.update.mockResolvedValue(user);
      const service = new AuthService(prisma as unknown as PrismaService);

      await service.login(
        { email: 'user@example.com', password: 'correct-password-123' },
        metadata,
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) as Date },
      });
    });

    it('resposta segura não contém passwordHash', async () => {
      const prisma = buildPrismaMock();
      const passwordHash = await bcrypt.hash('correct-password-123', 4);
      const user = buildUser({ passwordHash });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.session.create.mockResolvedValue({ id: 'session-1' });
      prisma.user.update.mockResolvedValue(user);
      const service = new AuthService(prisma as unknown as PrismaService);

      const result = await service.login(
        { email: 'user@example.com', password: 'correct-password-123' },
        metadata,
      );

      expect(result.user).toEqual({
        id: 'user-1',
        organizationId: 'org-1',
        email: 'user@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        active: true,
        lastLoginAt: user.lastLoginAt,
      });
      expect(Object.keys(result.user)).not.toContain('passwordHash');
    });
  });

  describe('validateSession', () => {
    it('token ausente lança UnauthorizedException', async () => {
      const prisma = buildPrismaMock();
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(service.validateSession(undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.session.findUnique).not.toHaveBeenCalled();
    });

    it('sessão inexistente lança UnauthorizedException', async () => {
      const prisma = buildPrismaMock();
      prisma.session.findUnique.mockResolvedValue(null);
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(service.validateSession('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sha256('raw-token') },
        include: { user: true },
      });
    });

    it('sessão expirada por inatividade é rejeitada e excluída', async () => {
      const prisma = buildPrismaMock();
      const now = new Date('2026-01-10T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: sha256('raw-token'),
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        lastUsedAt: new Date('2026-01-10T00:00:00.000Z'),
        expiresAt: new Date('2026-01-10T11:00:00.000Z'),
        user: buildUser(),
      });
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(service.validateSession('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      jest.useRealTimers();
    });

    it('sessão expirada pelo limite absoluto de 30 dias é rejeitada e excluída', async () => {
      const prisma = buildPrismaMock();
      const now = new Date('2026-02-15T00:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      const createdAt = new Date(now.getTime() - (SESSION_ABSOLUTE_MS + 1));
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: sha256('raw-token'),
        createdAt,
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
        user: buildUser(),
      });
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(service.validateSession('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      jest.useRealTimers();
    });

    it('usuário inativo revoga todas as sessões do usuário', async () => {
      const prisma = buildPrismaMock();
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: sha256('raw-token'),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_IDLE_MS),
        user: buildUser({ active: false }),
      });
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(service.validateSession('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('sessão válida retorna o usuário seguro sem dados de Session', async () => {
      const prisma = buildPrismaMock();
      const now = new Date('2026-01-10T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: sha256('raw-token'),
        createdAt: now,
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
        user: buildUser(),
      });
      const service = new AuthService(prisma as unknown as PrismaService);

      const result = await service.validateSession('raw-token');

      expect(result).toEqual({
        id: 'user-1',
        organizationId: 'org-1',
        email: 'user@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        active: true,
        lastLoginAt: null,
      });
      expect(prisma.session.update).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('renova a sessão de forma deslizante após 5 minutos de inatividade', async () => {
      const prisma = buildPrismaMock();
      const now = new Date('2026-01-10T12:10:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      const lastUsedAt = new Date(now.getTime() - SESSION_REFRESH_THRESHOLD_MS);
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: sha256('raw-token'),
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        lastUsedAt,
        expiresAt: new Date(now.getTime() + 1_000),
        user: buildUser(),
      });
      const service = new AuthService(prisma as unknown as PrismaService);

      await service.validateSession('raw-token');

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          lastUsedAt: now,
          expiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
        },
      });
      jest.useRealTimers();
    });

    it('não renova a sessão antes de 5 minutos de inatividade', async () => {
      const prisma = buildPrismaMock();
      const now = new Date('2026-01-10T12:01:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      const lastUsedAt = new Date(now.getTime() - 60_000);
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: sha256('raw-token'),
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        lastUsedAt,
        expiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
        user: buildUser(),
      });
      const service = new AuthService(prisma as unknown as PrismaService);

      await service.validateSession('raw-token');

      expect(prisma.session.update).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('a expiração renovada nunca ultrapassa o limite absoluto de 30 dias', async () => {
      const prisma = buildPrismaMock();
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      const absoluteExpiresAt = new Date(
        createdAt.getTime() + SESSION_ABSOLUTE_MS,
      );
      const now = new Date(absoluteExpiresAt.getTime() - 60_000);
      jest.useFakeTimers().setSystemTime(now);
      const lastUsedAt = new Date(now.getTime() - SESSION_REFRESH_THRESHOLD_MS);
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: sha256('raw-token'),
        createdAt,
        lastUsedAt,
        expiresAt: new Date(now.getTime() + 1_000),
        user: buildUser(),
      });
      const service = new AuthService(prisma as unknown as PrismaService);

      await service.validateSession('raw-token');

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          lastUsedAt: now,
          expiresAt: absoluteExpiresAt,
        },
      });
      jest.useRealTimers();
    });
  });

  describe('logout', () => {
    it('token ausente é idempotente e não gera erro', async () => {
      const prisma = buildPrismaMock();
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    });

    it('calcula o sha256 do token e executa deleteMany pelo tokenHash', async () => {
      const prisma = buildPrismaMock();
      prisma.session.deleteMany.mockResolvedValue({ count: 1 });
      const service = new AuthService(prisma as unknown as PrismaService);

      await service.logout('raw-token');

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: sha256('raw-token') },
      });
    });
  });

  describe('hashPassword', () => {
    it('rejeita senha curta (menos de 12 caracteres)', async () => {
      const prisma = buildPrismaMock();
      const service = new AuthService(prisma as unknown as PrismaService);

      await expect(service.hashPassword('short1234')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejeita senha acima de 72 bytes em UTF-8', async () => {
      const prisma = buildPrismaMock();
      const service = new AuthService(prisma as unknown as PrismaService);
      const oversizedPassword = 'á'.repeat(40);
      const oversizedByteLength = Buffer.byteLength(oversizedPassword, 'utf8');
      expect(oversizedByteLength).toBeGreaterThan(72);

      await expect(
        service.hashPassword(oversizedPassword),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('produz um hash bcrypt válido para senha dentro dos limites', async () => {
      const prisma = buildPrismaMock();
      const service = new AuthService(prisma as unknown as PrismaService);
      const password = 'validPassword123';

      const hash = await service.hashPassword(password);

      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      await expect(bcrypt.compare(password, hash)).resolves.toBe(true);
    });
  });
});
