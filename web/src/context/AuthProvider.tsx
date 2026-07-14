"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setStatus(nextUser ? "authenticated" : "unauthenticated");
      });
      return unsub;
    } catch (err) {
      console.error("Firebase client init failed:", err);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    const auth = getFirebaseAuth();
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, signOut }),
    [status, user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Drop-in shape for components that previously used next-auth's useSession(). */
export function useSession() {
  const { status, user, signOut } = useAuth();
  return {
    data: user
      ? {
          user: {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            image: user.photoURL,
          },
        }
      : null,
    status,
    signOut,
  };
}
