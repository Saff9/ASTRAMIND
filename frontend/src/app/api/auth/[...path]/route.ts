import { neonAuth } from "@/lib/neon-auth";

/**
 * Neon Auth API Route Handler
 * Proxies auth requests (social login, session checks) to the Neon managed service.
 */
export const { GET, POST } = neonAuth.handler();
