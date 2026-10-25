export function won(n: number | null | undefined) {
  return `${Math.round(n ?? 0).toLocaleString('ko-KR')}원`;
}

/** 24,830,000 → "2,483만", 530,000,000 → "5억 3,000만" */
export function manwon(n: number) {
  const m = Math.round(n / 10_000);
  if (Math.abs(m) < 10_000) return `${m.toLocaleString('ko-KR')}만`;
  const eok = Math.trunc(m / 10_000);
  const rest = Math.abs(m % 10_000);
  return rest ? `${eok}억 ${rest.toLocaleString('ko-KR')}만` : `${eok}억`;
}

export function sum(...ns: (number | null | undefined)[]) {
  return ns.reduce<number>((a, n) => a + (n ?? 0), 0);
}

export function todayStr(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parts(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

export function addDays(date: string, days: number) {
  const { y, m, d } = parts(date);
  return todayStr(new Date(y, m - 1, d + days));
}

export function monthEnd(date: string) {
  const { y, m } = parts(date);
  return todayStr(new Date(y, m, 0));
}

export function diffDays(from: string, to: string) {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

export function dday(target: string | null) {
  if (!target) return null;
  const n = diffDays(todayStr(), target);
  if (n === 0) return 'D-day';
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

export function shortDate(s: string | null) {
  if (!s) return '날짜 없음';
  const { m, d } = parts(s);
  return `${m}/${d}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function longDate(s: string) {
  const { y, m, d } = parts(s);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}
