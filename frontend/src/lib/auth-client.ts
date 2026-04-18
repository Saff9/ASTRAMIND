'use client';
import { createAuthClient } from '@neondatabase/auth/next';

/**
 * Neon Auth Client
 * Used for client-side authentication interactions (sign in, sign out, session).
 */
export const neonAuthClient = createAuthClient();
