import { createNeonAuth } from '@neondatabase/auth/next/server';

/**
 * Neon Auth Instance (Server-side)
 * Handles sessions, middleware, and Google OAuth proxying for the Neon database.
 */
export const neonAuth = createNeonAuth({
  /**
   * The base URL of your Neon Auth project.
   * Example: https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
   */
  baseUrl: process.env.NEON_AUTH_BASE_URL || 'https://ep-dark-pine-a11yyzrz.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth',
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || 'a-very-secret-string-at-least-32-chars-long-astramind',
  },
});
