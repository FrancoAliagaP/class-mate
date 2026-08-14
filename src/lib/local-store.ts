import { useCallback, useEffect, useState } from "react";
import type { Grade } from "@/lib/grades";

export type Subject = { id: string; name: string; code: string };
export type Student = { id: string; full_name: string; subject_id: string };

export type DemoData = {
  evaluator: string;
  subjects: Subject[];
  students: Student[];
  grades: (Grade & { subject_id: string })[];
};

const KEY = "registro-academico-demo";

const empty: DemoData = { evaluator: "", subjects: [], students: [], grades: [] };

export function loadData(): DemoData {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as Partial<DemoData>) };
  } catch {
    return empty;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useDemoData() {
  const [data, setData] = useState<DemoData>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  const update = useCallback((fn: (d: DemoData) => DemoData) => {
    setData((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* almacenamiento no disponible */
      }
      return next;
    });
  }, []);

  return { data, ready, update };
}
