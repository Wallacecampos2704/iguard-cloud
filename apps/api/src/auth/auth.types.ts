import type { UserRole } from '@prisma/client';

export type LoginInput = {
  email: string;
  password: string;
};

export type SessionMetadata = {
  userAgent: string | null;
  ipAddress: string | null;
};

export type AuthenticatedUser = {
  id: string;
  organizationId: string | null;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: Date | null;
};

export type LoginResult = {
  sessionToken: string;
  user: AuthenticatedUser;
};
