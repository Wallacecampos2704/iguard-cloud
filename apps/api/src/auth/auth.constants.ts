export const AUTH_COOKIE_NAME = 'iguard_session';

export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
export const AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const BCRYPT_ROUNDS = 12;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72;

export const GENERIC_LOGIN_FAILURE_MESSAGE = 'E-mail ou senha inválidos.';

/**
 * Hash bcrypt de um valor fixo, não vinculado a nenhum usuário real.
 * Usado apenas para manter o tempo de resposta do login estável quando
 * o e-mail informado não corresponde a nenhum usuário.
 */
export const DUMMY_PASSWORD_HASH =
  '$2b$12$/912wK0d1Io.AwRRAUdeXuCx.t54ito5m4kJ6Sn9.grGzXiwjlMa.';
