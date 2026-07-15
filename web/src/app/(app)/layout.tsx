import { auth } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <AppShell>{children}</AppShell>;
}
