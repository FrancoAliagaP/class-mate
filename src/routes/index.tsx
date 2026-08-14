import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Registro Académico | Gestión de notas institucional" },
      {
        name: "description",
        content:
          "Registra evaluaciones con porcentajes, obtén promedios finales de 1 a 7 y visualiza aprobados y reprobados por ramo.",
      },
      { property: "og:title", content: "Registro Académico | Gestión de notas" },
      {
        property: "og:description",
        content:
          "Registra evaluaciones con porcentajes, obtén promedios finales de 1 a 7 y visualiza aprobados y reprobados por ramo.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    title: "Promedio ponderado",
    text: "Cada evaluación lleva su porcentaje y el sistema calcula el promedio final en escala 1,0 a 7,0.",
  },
  {
    title: "División por ramo",
    text: "Cada evaluador administra sus propios ramos, con su lista de alumnos y evaluaciones.",
  },
  {
    title: "Aprobado o reprobado",
    text: "Verde sobre 4,0 y rojo bajo 4,0, visible de inmediato en la lista y en el panel fijo.",
  },
];

function Index() {
  return (
    <main className="min-h-screen">
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Plataforma institucional
          </p>
          <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">
            Registro Académico de Notas
          </h1>
          <p className="mt-5 max-w-2xl text-base text-primary-foreground/80">
            Sistema de gestión de evaluaciones para docentes: ingresa notas y porcentajes,
            obtén el promedio final de cada alumno y controla aprobación en un solo lugar.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Ingresar al sistema</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/auth" search={{ modo: "registro" }}>
                Crear cuenta de evaluador
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-lg border border-border bg-card p-6 shadow-panel"
            >
              <div className="h-1 w-10 rounded-full bg-accent" />
              <h2 className="mt-4 text-lg font-bold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Registro Académico · Escala de evaluación 1,0 – 7,0 · Aprobación desde 4,0
      </footer>
    </main>
  );
}
