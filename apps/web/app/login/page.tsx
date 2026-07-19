import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
              <svg
                className="h-5 w-5 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold text-foreground">
              i<span className="text-accent">Guard</span>
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <div className="mb-6 space-y-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Acessar o iGuard
            </h1>
            <p className="text-sm text-muted">
              Acesso restrito a usuários autorizados da plataforma.
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="text-center text-sm text-muted">
          <Link href="/" className="hover:text-foreground hover:underline">
            ← Voltar à página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
