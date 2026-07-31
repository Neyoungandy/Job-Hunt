import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/auth-server";

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(request: Request) {
  let idToken: string;
  try {
    const body = (await request.json()) as { idToken?: string };
    idToken = body.idToken?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_MS / 1000,
      path: "/",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/auth/session]", errMsg);
    console.error("[POST /api/auth/session] Full error:", err);
    const missingAdmin =
      errMsg.includes("Missing Firebase Admin credentials") ||
      errMsg.includes("FIREBASE_ADMIN");

    return NextResponse.json(
      {
        error: missingAdmin
          ? "Server session setup is incomplete. Firebase Admin credentials must be configured on the host (e.g. Vercel environment variables)."
          : "Could not create session. Please try signing in again.",
        details: process.env.NODE_ENV === "development" ? errMsg : undefined,
      },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
