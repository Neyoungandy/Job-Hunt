import { LoginForm } from "./LoginForm";

function resolveCallbackUrl(from: string | undefined) {
  const raw = from ?? "/dashboard";
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/login")
    ? raw
    : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const initialMode = params.mode === "signup" ? "signup" : "signin";
  const callbackUrl = resolveCallbackUrl(params.from);

  return (
    <LoginForm callbackUrl={callbackUrl} initialMode={initialMode} />
  );
}
