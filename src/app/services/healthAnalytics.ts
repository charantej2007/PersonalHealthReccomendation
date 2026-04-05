import type { UserProfile, VitalsEntry } from './backendService';

export type AnalyticsRange = '7days' | '1month' | '3months';

export type DailyPoint = {
  date: string;
  label: string;
  bmi: number;
  systolic: number;
  diastolic: number;
  sugar: number;
};

export type SummaryStats = {
  avgBMI: number;
  avgSystolic: number;
  avgDiastolic: number;
  avgSugar: number;
  bmiChange: number;
  bpChange: number;
  sugarChange: number;
  activeDays: number;
};

type TimestampLike = {
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
  toDate?: () => Date;
};

function parseMeasuredAt(value?: string | Date | TimestampLike): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const seconds = value.seconds ?? value._seconds;
    const nanos = value.nanoseconds ?? value._nanoseconds ?? 0;
    if (typeof seconds === 'number') {
      const date = new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  if (typeof value !== 'string') return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatLabel(date: Date, range: AnalyticsRange): string {
  if (range === '7days') {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  if (range === '1month') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysForRange(range: AnalyticsRange): number {
  if (range === '7days') return 7;
  if (range === '1month') return 30;
  return 90;
}

function calculateBmi(heightCm: number, weightKg: number): number {
  const h = heightCm / 100;
  return Number((weightKg / (h * h)).toFixed(1));
}

export function buildRangeSeries(
  vitals: VitalsEntry[],
  profile: UserProfile,
  range: AnalyticsRange
): DailyPoint[] {
  const days = daysForRange(range);
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const grouped = new Map<string, { date: Date; values: VitalsEntry[] }>();

  for (const vital of vitals) {
    const measured = parseMeasuredAt(vital.measuredAt);
    if (!measured || measured < start || measured > now) continue;

    const key = toDayKey(measured);
    if (!grouped.has(key)) grouped.set(key, { date: measured, values: [] });
    grouped.get(key)!.values.push(vital);
  }

  const entries = Array.from(grouped.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

  return entries.map((entry) => {
    const count = entry.values.length;
    const systolic = entry.values.reduce((sum, v) => sum + v.systolic, 0) / count;
    const diastolic = entry.values.reduce((sum, v) => sum + v.diastolic, 0) / count;
    const sugar = entry.values.reduce((sum, v) => sum + v.sugarLevel, 0) / count;

    // Weight/height trends are not logged daily in current schema, so BMI uses profile baseline.
    const bmi = calculateBmi(profile.heightCm, profile.weightKg);

    return {
      date: toDayKey(entry.date),
      label: formatLabel(entry.date, range),
      bmi: Number(bmi.toFixed(1)),
      systolic: Number(systolic.toFixed(0)),
      diastolic: Number(diastolic.toFixed(0)),
      sugar: Number(sugar.toFixed(0)),
    };
  });
}

export function summarizeSeries(series: DailyPoint[]): SummaryStats {
  if (!series.length) {
    return {
      avgBMI: 0,
      avgSystolic: 0,
      avgDiastolic: 0,
      avgSugar: 0,
      bmiChange: 0,
      bpChange: 0,
      sugarChange: 0,
      activeDays: 0,
    };
  }

  const first = series[0];
  const last = series[series.length - 1];
  const count = series.length;

  const avgBMI = series.reduce((sum, p) => sum + p.bmi, 0) / count;
  const avgSystolic = series.reduce((sum, p) => sum + p.systolic, 0) / count;
  const avgDiastolic = series.reduce((sum, p) => sum + p.diastolic, 0) / count;
  const avgSugar = series.reduce((sum, p) => sum + p.sugar, 0) / count;

  return {
    avgBMI: Number(avgBMI.toFixed(1)),
    avgSystolic: Number(avgSystolic.toFixed(0)),
    avgDiastolic: Number(avgDiastolic.toFixed(0)),
    avgSugar: Number(avgSugar.toFixed(0)),
    bmiChange: Number((last.bmi - first.bmi).toFixed(1)),
    bpChange: Number((last.systolic - first.systolic).toFixed(0)),
    sugarChange: Number((last.sugar - first.sugar).toFixed(0)),
    activeDays: count,
  };
}
