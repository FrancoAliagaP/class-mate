export type Grade = {
  id: string;
  student_id: string;
  title: string;
  score: number;
  weight: number;
};

export const PASSING = 4.0;

/** Promedio ponderado 1-7. Si no hay porcentajes definidos, usa promedio simple. */
export function finalAverage(grades: Grade[]): number | null {
  if (grades.length === 0) return null;
  const totalWeight = grades.reduce((acc, g) => acc + Number(g.weight ?? 0), 0);
  if (totalWeight > 0) {
    const weighted = grades.reduce(
      (acc, g) => acc + Number(g.score) * Number(g.weight ?? 0),
      0,
    );
    return weighted / totalWeight;
  }
  return grades.reduce((acc, g) => acc + Number(g.score), 0) / grades.length;
}

export function totalWeight(grades: Grade[]): number {
  return grades.reduce((acc, g) => acc + Number(g.weight ?? 0), 0);
}

export function isApproved(avg: number | null): boolean | null {
  if (avg === null) return null;
  return avg >= PASSING;
}

export function formatGrade(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(1);
}

export function byName<T extends { full_name: string }>(a: T, b: T): number {
  return a.full_name.localeCompare(b.full_name, "es", { sensitivity: "base" });
}