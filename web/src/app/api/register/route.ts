import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const { email: rawEmail, password, name: rawName } = body as Record<
    string,
    unknown
  >;
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const pwd = typeof password === "string" ? password : "";
  const name =
    typeof rawName === "string" ? rawName.trim().slice(0, 120) : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  if (pwd.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(pwd);
    await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/register]", e);

    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("passwordHash") ||
      msg.includes("no such column") ||
      msg.includes("Unknown column")
    ) {
      return NextResponse.json(
        {
          error:
            "Database is missing the latest schema. In the web folder run: npx prisma db push",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Could not save your account. Check DATABASE_URL in .env (MongoDB Atlas) and run: npx prisma db push",
        ...(process.env.NODE_ENV === "development" && msg
          ? { detail: msg.slice(0, 800) }
          : {}),
      },
      { status: 500 },
    );
  }
}
