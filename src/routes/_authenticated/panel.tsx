import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel de notas | Registro Académico" },
      {
        name: "description",
        content:
          "Administra ramos, alumnos, evaluaciones con porcentaje y promedios finales de 1 a 7.",
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

type Subject = { id: string; name: string; code: string };
type Student = { id: string; full_name: string; subject_id: string };

function Panel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [evaluator, setEvaluator] = useState<{ name: string; email: string }>({
    name: "",
    email: "",
  });
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      setEvaluator({
        name:
          profile?.full_name ||
          (user.user_metadata as { full_name?: string })?.full_name ||
          user.email?.split("@")[0] ||
          "Evaluador",
        email: profile?.email || user.email || "",
      });
    })();
  }, []);

  const subjectsQ = useQuery({
    queryKey: ["subjects"],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!subjectId && subjectsQ.data && subjectsQ.data.length > 0) {
      setSubjectId(subjectsQ.data[0]!.id);
    }
  }, [subjectsQ.data, subjectId]);

  const studentsQ = useQuery({
    queryKey: ["students", subjectId],
    enabled: !!subjectId,
    queryFn: async (): Promise<Student[]> => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, subject_id")
        .eq("subject_id", subjectId!);
      if (error) throw error;
      return (data ?? []).slice().sort(byName);
    },
  });

  const studentIds = useMemo(
    () => (studentsQ.data ?? []).map((s) => s.id),
    [studentsQ.data],
  );

  const gradesQ = useQuery({
    queryKey: ["grades", subjectId, studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async (): Promise<Grade[]> => {
      const { data, error } = await supabase
        .from("grades")
        .select("id, student_id, title, score, weight")
        .in("student_id", studentIds)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((g) => ({
        ...g,
        score: Number(g.score),
        weight: Number(g.weight),
      }));
    },
  });

  const gradesByStudent = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of gradesQ.data ?? []) {
      map.set(g.student_id, [...(map.get(g.student_id) ?? []), g]);
    }
    return map;
  }, [gradesQ.data]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["students"] });
    void qc.invalidateQueries({ queryKey: ["grades"] });
  };

  const addSubject = useMutation({
    mutationFn: async (input: { name: string; code: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("subjects").insert({
        name: input.name,
        code: input.code,
        teacher_id: userData.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const addStudent = useMutation({
    mutationFn: async (fullName: string) => {
      const { error } = await supabase
        .from("students")
        .insert({ full_name: fullName, subject_id: subjectId! });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addGrade = useMutation({
    mutationFn: async (input: { title: string; score: number; weight: number }) => {
      const { error } = await supabase.from("grades").insert({
        student_id: selectedStudent!,
        title: input.title,
        score: input.score,
        weight: input.weight,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeGrade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const students = studentsQ.data ?? [];
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

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
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
              <p className="text-sm font-semibold">{evaluator.name}</p>
              <p className="text-xs text-primary-foreground/70">{evaluator.email}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr_320px]">
        <SubjectsColumn
          subjects={subjectsQ.data ?? []}
          subjectId={subjectId}
          onSelect={(id) => {
            setSubjectId(id);
            setSelectedStudent(null);
          }}
          onCreate={(name, code) => addSubject.mutate({ name, code })}
        />

        <section className="rounded-lg border border-border bg-card shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-lg font-bold">Lista de alumnos</h2>
            <span className="text-xs text-muted-foreground">Orden alfabético</span>
          </div>

          {!subjectId ? (
            <p className="p-6 text-sm text-muted-foreground">
              Crea un ramo para comenzar a registrar alumnos y notas.
            </p>
          ) : (
            <>
              <AddStudentForm onAdd={(n) => addStudent.mutate(n)} />
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
                onAdd={(v) => addGrade.mutate(v)}
                onRemove={(id) => removeGrade.mutate(id)}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
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
              {s.code && (
                <span className="block text-xs opacity-70">{s.code}</span>
              )}
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
            placeholder="% "
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