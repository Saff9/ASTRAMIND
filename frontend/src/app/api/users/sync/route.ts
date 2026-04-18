/**
 * ASTRAMIND — Neon PostgreSQL User Store
 * POST /api/users/sync
 *
 * Syncs authenticated users to Neon DB (if DATABASE_URL is set).
 * Gracefully no-ops if no DB is configured — localStorage is primary.
 */

import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@/lib/neon-auth";

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

export async function POST(_request: NextRequest) {
  try {
    // Must pass authOptions so NextAuth can read the session correctly
    const session = await neonAuth.getSession({
      fetchOptions: {
        headers: _request.headers
      }
    });
    const user = session?.data?.user;

    if (!user?.email) {
      // Not logged in — not an error, just skip sync
      return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 200 });
    }

    const db = await getSQL();
    if (!db) {
      return NextResponse.json({ ok: true, backend: "localStorage-only" });
    }

    await db`
      CREATE TABLE IF NOT EXISTS astramind_users (
        id         TEXT PRIMARY KEY,
        email      TEXT UNIQUE NOT NULL,
        name       TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db`
      INSERT INTO astramind_users (id, email, name)
      VALUES (${user.email}, ${user.email}, ${user.name ?? null})
      ON CONFLICT (email) DO UPDATE SET
        last_seen = NOW(),
        name = EXCLUDED.name
    `;

    return NextResponse.json({ ok: true, backend: "neon" });
  } catch (err) {
    console.error("[Neon sync error]", err);
    // Never 500 — silently fail so it doesn't break chat
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
