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
  const oauth = {
    github: Boolean(
      process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
    ),
    google: Boolean(
      process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
    ),
  };
  const appOrigin = (process.env.AUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const initialMode = params.mode === "signup" ? "signup" : "signin";
  const callbackUrl = resolveCallbackUrl(params.from);

  return (
    <LoginForm
      oauth={oauth}
      appOrigin={appOrigin}
      callbackUrl={callbackUrl}
      initialMode={initialMode}
    />
  );
}
