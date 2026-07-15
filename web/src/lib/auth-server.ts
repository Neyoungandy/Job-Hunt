import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "session";

export type AppSession = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
  };
};

export async function auth(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    return {
      user: {
        id: decoded.uid,
        email: decoded.email ?? null,
        name: decoded.name ?? null,
        image: decoded.picture ?? null,
      },
    };
  } catch {
    return null;
  }
}
