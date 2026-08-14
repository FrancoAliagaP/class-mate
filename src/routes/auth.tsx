import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso de evaluadores | Registro Académico" },
      {
        name: "description",
        content:
          "Inicia sesión o crea tu cuenta de evaluador para administrar tus ramos, alumnos y notas.",
      },
      { property: "og:title", content: "Acceso de evaluadores | Registro Académico" },
      {
        property: "og:description",
        content: "Inicia sesión para administrar tus ramos, alumnos y notas.",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  fullName: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const parsed = schema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/panel`,
            data: { full_name: parsed.data.fullName ?? "" },
          },
        });
        if (err) throw err;
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          navigate({ to: "/panel" });
          return;
        }
        setInfo("Cuenta creada. Revisa tu correo para confirmarla e ingresa.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (err) throw err;
        navigate({ to: "/panel" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la operación");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/panel" });
  }

  return (
    <main className="flex min-h-screen flex-col bg-secondary">
      <div className="bg-primary px-6 py-5 text-primary-foreground">
        <Link to="/" className="text-sm uppercase tracking-[0.2em] text-accent">
          Registro Académico
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-panel">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Acceso de evaluadores" : "Crear cuenta de evaluador"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada evaluador administra únicamente sus propios ramos y notas.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre del evaluador</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  maxLength={100}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Prof. Ana Rojas"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo institucional</Label>
              <Input
                id="email"
                type="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@institucion.cl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm font-medium text-danger">{error}</p>}
            {info && <p className="text-sm font-medium text-success">{info}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Procesando…"
                : mode === "login"
                  ? "Ingresar"
                  : "Crear cuenta"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continuar con Google
          </Button>

          <button
            type="button"
            className="mt-6 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </main>
  );
}