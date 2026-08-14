import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  byName,
  finalAverage,
  formatGrade,
  isApproved,
  totalWeight,
  type Grade,
} from "@/lib/grades";
import { useDemoData, uid, type Student, type Subject } from "@/lib/local-store";

export const Route = createFileRoute("/panel")({
  head: () => ({
    meta: [
      { title: "Panel de notas | Registro Académico" },
      {
        name: "description",
        content:
          "Administra ramos, alumnos, evaluaciones con porcentaje y promedios finales de 1 a 7 desde el navegador.",
      },
      { property: "og:title", content: "Panel de notas | Registro Académico" },
      {
        property: "og:description",
        content: "Administra ramos, alumnos, evaluaciones y promedios finales.",
      },
    ],
  }),
  component: Panel,
});

function Panel() {
  const { data, ready, update } = useDemoData();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const activeSubject =
    data.subjects.find((s) => s.id === subjectId)?.id ?? data.subjects[0]?.id ?? null;

  const students = useMemo(
    () => data.students.filter((s) => s.subject_id === activeSubject).slice().sort(byName),
    [data.students, activeSubject],
  );

  const gradesByStudent = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of data.grades) {
      map.set(g.student_id, [...(map.get(g.student_id) ?? []), g]);
    }
    return map;
  }, [data.grades]);

  const current = students.find((s) => s.id === selectedStudent) ?? null;
  const currentGrades = current ? (gradesByStudent.get(current.id) ?? []) : [];

  const courseAverages = students
    .map((s) => finalAverage(gradesByStudent.get(s.id) ?? []))
    .filter((v): v is number => v !== null);
  const courseAvg =
    courseAverages.length > 0
      ? courseAverages.reduce((a, b) => a + b, 0) / courseAverages.length
      : null;
  const approvedCount = courseAverages.filter((v) => v >= 4).length;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (!data.evaluator) {
    return (
      <EvaluatorGate onSet={(name) => update((d) => ({ ...d, evaluator: name }))} />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              Registro Académico
            </p>
            <h1 className="text-xl font-bold">Panel de evaluación</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold">{data.evaluator}</p>
              <p className="text-xs text-primary-foreground/70">
                Datos guardados en este navegador
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => update((d) => ({ ...d, evaluator: "" }))}
            >
              Cambiar evaluador
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr_320px]">
        <SubjectsColumn
          subjects={data.subjects}
          subjectId={activeSubject}
          onSelect={(id) => {
            setSubjectId(id);
            setSelectedStudent(null);
          }}
          onCreate={(name, code) => {
            const s: Subject = { id: uid(), name, code };
            update((d) => ({ ...d, subjects: [...d.subjects, s] }));
            setSubjectId(s.id);
          }}
        />

        <section className="rounded-lg border border-border bg-card shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-lg font-bold">Lista de alumnos</h2>
            <span className="text-xs text-muted-foreground">Orden alfabético</span>
          </div>

          {!activeSubject ? (
            <p className="p-6 text-sm text-muted-foreground">
              Crea un ramo para comenzar a registrar alumnos y notas.
            </p>
          ) : (
            <>
              <AddStudentForm
                onAdd={(full_name) => {
                  const st: Student = { id: uid(), full_name, subject_id: activeSubject };
                  update((d) => ({ ...d, students: [...d.students, st] }));
                }}
              />
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-secondary text-left">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Alumno</th>
                      <th className="px-3 py-3 font-semibold">Notas</th>
                      <th className="px-3 py-3 text-right font-semibold">Promedio</th>
                      <th className="px-5 py-3 text-right font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const g = gradesByStudent.get(s.id) ?? [];
                      const avg = finalAverage(g);
                      const ok = isApproved(avg);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setSelectedStudent(s.id)}
                          className={`cursor-pointer border-t border-border transition-colors hover:bg-secondary ${
                            selectedStudent === s.id ? "bg-secondary" : ""
                          }`}
                        >
                          <td className="px-5 py-3 font-medium">{s.full_name}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {g.length === 0 ? (
                                <span className="text-muted-foreground">Sin notas</span>
                              ) : (
                                g.map((x) => (
                                  <span
                                    key={x.id}
                                    title={`${x.title} · ${x.weight}%`}
                                    className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                                      x.score >= 4
                                        ? "bg-success-soft text-success"
                                        : "bg-danger-soft text-danger"
                                    }`}
                                  >
                                    {formatGrade(Number(x.score))}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td
                            className={`px-3 py-3 text-right text-base font-bold ${
                              ok === null
                                ? "text-muted-foreground"
                                : ok
                                  ? "text-success"
                                  : "text-danger"
                            }`}
                          >
                            {formatGrade(avg)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {ok === null ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  ok
                                    ? "bg-success text-success-foreground"
                                    : "bg-danger text-danger-foreground"
                                }`}
                              >
                                {ok ? "Aprobado" : "Reprobado"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                          Aún no hay alumnos en este ramo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
            <h2 className="text-base font-bold">Resumen del ramo</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Alumnos</dt>
                <dd className="font-semibold">{students.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Promedio del curso</dt>
                <dd className="font-semibold">{formatGrade(courseAvg)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Aprobados</dt>
                <dd className="font-semibold text-success">{approvedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reprobados</dt>
                <dd className="font-semibold text-danger">
                  {courseAverages.length - approvedCount}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-card p-5 shadow-panel">
            {!current ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un alumno de la lista para ver y agregar sus notas.
              </p>
            ) : (
              <StudentPanel
                name={current.full_name}
                grades={currentGrades}
                onAdd={(v) =>
                  update((d) => ({
                    ...d,
                    grades: [
                      ...d.grades,
                      {
                        id: uid(),
                        student_id: current.id,
                        subject_id: activeSubject!,
                        title: v.title,
                        score: v.score,
                        weight: v.weight,
                      },
                    ],
                  }))
                }
                onRemove={(id) =>
                  update((d) => ({ ...d, grades: d.grades.filter((g) => g.id !== id) }))
                }
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function EvaluatorGate({ onSet }: { onSet: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-6">
      <form
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-panel"
        onSubmit={(e) => {
          e.preventDefault();
          const v = name.trim();
          if (v) onSet(v.slice(0, 60));
        }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Registro Académico
        </p>
        <h1 className="mt-2 text-2xl font-bold">¿Quién evalúa?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escribe tu nombre para identificar tus registros. Todo queda guardado en este
          navegador, sin correo ni contraseña.
        </p>
        <Label htmlFor="evaluator" className="mt-5 block text-xs">
          Nombre del evaluador
        </Label>
        <Input
          id="evaluator"
          className="mt-1"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prof. Ana Pérez"
        />
        <Button type="submit" className="mt-4 w-full">
          Entrar al panel
        </Button>
      </form>
    </main>
  );
}

function SubjectsColumn({
  subjects,
  subjectId,
  onSelect,
  onCreate,
}: {
  subjects: Subject[];
  subjectId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, code: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  return (
    <nav className="rounded-lg border border-border bg-card p-4 shadow-panel lg:sticky lg:top-8 lg:self-start">
      <h2 className="text-base font-bold">Mis ramos</h2>
      <ul className="mt-3 space-y-1">
        {subjects.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => onSelect(s.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                subjectId === s.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary"
              }`}
            >
              <span className="block font-medium">{s.name}</span>
              {s.code && <span className="block text-xs opacity-70">{s.code}</span>}
            </button>
          </li>
        ))}
        {subjects.length === 0 && (
          <li className="px-1 py-2 text-sm text-muted-foreground">Sin ramos aún.</li>
        )}
      </ul>
      <form
        className="mt-4 space-y-2 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          onCreate(n.slice(0, 80), code.trim().slice(0, 20));
          setName("");
          setCode("");
        }}
      >
        <Label htmlFor="subject-name" className="text-xs">
          Nuevo ramo
        </Label>
        <Input
          id="subject-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="Matemática III"
        />
        <Input
          value={code}
          maxLength={20}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Sigla (opcional)"
        />
        <Button type="submit" size="sm" className="w-full">
          Agregar ramo
        </Button>
      </form>
    </nav>
  );
}

function AddStudentForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2 border-b border-border px-5 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v) return;
        onAdd(v.slice(0, 100));
        setValue("");
      }}
    >
      <Input
        value={value}
        maxLength={100}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nombre del alumno"
      />
      <Button type="submit" size="sm">
        Agregar
      </Button>
    </form>
  );
}

function StudentPanel({
  name,
  grades,
  onAdd,
  onRemove,
}: {
  name: string;
  grades: Grade[];
  onAdd: (v: { title: string; score: number; weight: number }) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [score, setScore] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  const avg = finalAverage(grades);
  const ok = isApproved(avg);
  const weights = totalWeight(grades);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Alumno</p>
      <h2 className="text-lg font-bold">{name}</h2>

      <div
        className={`mt-3 rounded-md px-4 py-3 ${
          ok === null ? "bg-secondary" : ok ? "bg-success-soft" : "bg-danger-soft"
        }`}
      >
        <p className="text-xs text-muted-foreground">Promedio final</p>
        <p
          className={`text-3xl font-bold ${
            ok === null ? "text-foreground" : ok ? "text-success" : "text-danger"
          }`}
        >
          {formatGrade(avg)}
        </p>
        <p className="text-xs text-muted-foreground">
          Ponderación acumulada: {weights.toFixed(0)}%
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {grades.map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">
              {g.title}
              <span className="ml-1 text-xs text-muted-foreground">{g.weight}%</span>
            </span>
            <span
              className={`font-bold ${Number(g.score) >= 4 ? "text-success" : "text-danger"}`}
            >
              {formatGrade(Number(g.score))}
            </span>
            <button
              onClick={() => onRemove(g.id)}
              className="text-xs text-muted-foreground hover:text-danger"
              aria-label={`Eliminar ${g.title}`}
            >
              ✕
            </button>
          </li>
        ))}
        {grades.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin evaluaciones registradas.</li>
        )}
      </ul>

      <form
        className="mt-4 space-y-2 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const s = Number(score.replace(",", "."));
          const w = Number(weight.replace(",", "."));
          if (!title.trim()) return setError("Indica el nombre de la evaluación");
          if (!Number.isFinite(s) || s < 1 || s > 7) return setError("La nota debe ir de 1,0 a 7,0");
          if (!Number.isFinite(w) || w < 0 || w > 100) return setError("El porcentaje va de 0 a 100");
          setError(null);
          onAdd({ title: title.trim().slice(0, 80), score: s, weight: w });
          setTitle("");
          setScore("");
          setWeight("");
        }}
      >
        <Label className="text-xs">Nueva evaluación</Label>
        <Input
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Prueba 1"
        />
        <div className="flex gap-2">
          <Input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Nota 1-7"
            inputMode="decimal"
          />
          <Input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="%"
            inputMode="decimal"
          />
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <Button type="submit" size="sm" className="w-full">
          Registrar nota
        </Button>
      </form>
    </div>
  );
}
