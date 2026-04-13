/**
 * ASTRAMIND — Neon PostgreSQL User Store
 * API route: POST /api/users/sync
 *
 * Syncs user sign-in events to Neon DB for analytics and history backup.
 * Set DATABASE_URL in Vercel env to your Neon connection string.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

// Neon serverless client — works in Vercel Edge & Node runtimes
// DATABASE_URL format: postgresql://user:pass@host.neon.tech/dbname?sslmode=require
let sql: ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) | null = null;

async function getSQL() {
  if (sql) return sql;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  try {
    const { neon } = await import("@neondatabase/serverless");
    sql = neon(dbUrl);
    return sql;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getSQL();
    if (!db) {
      // No DB configured — succeed silently (localStorage is the primary store)
      return NextResponse.json({ ok: true, backend: "localStorage-only" });
    }

    // Ensure users table exists (idempotent)
    await db`
      CREATE TABLE IF NOT EXISTS astramind_users (
        id         TEXT PRIMARY KEY,
        email      TEXT UNIQUE NOT NULL,
        name       TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Upsert user — update last_seen on repeated logins
    await db`
      INSERT INTO astramind_users (id, email, name)
      VALUES (${session.user.email}, ${session.user.email}, ${session.user.name ?? null})
      ON CONFLICT (email) DO UPDATE SET
        last_seen = NOW(),
        name = EXCLUDED.name
    `;

    return NextResponse.json({ ok: true, backend: "neon" });
  } catch (err) {
    console.error("[Neon sync error]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
