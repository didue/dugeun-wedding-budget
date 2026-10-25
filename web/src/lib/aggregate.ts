import type { Aggregate, Bootstrap, Expense, ListType, Lists } from './types';
import { addDays, sum, todayStr } from './format';

/** 파스텔 팔레트. 앞 6개는 기준 팔레트, 뒤 6개는 같은 톤으로 확장. 이웃한 색끼리 색상이 겹치지 않게 배치 */
export const FALLBACK_COLORS = [
  '#FBD5DB', // 핑크
  '#D0EADF', // 민트
  '#E4D4EE', // 라벤더
  '#FFF2B8', // 레몬
  '#CFE3F7', // 스카이
  '#FFD3C7', // 피치
  '#DDEBC9', // 세이지
  '#F3D0E6', // 로즈 라일락
  '#CBEBEE', // 아쿠아
  '#FFE2BC', // 살구
  '#D7DAF5', // 페리윙클
  '#EADBD0', // 베이지
];

export function amountOf(e: Expense) {
  return e.total ?? sum(e.deposit, e.middle, e.balance);
}

export function kindOf(lists: Lists, status: string | null): Aggregate {
  return lists.status.find((i) => i.value === status)?.aggregate ?? 'planned';
}

export function inBudget(lists: Lists, category: string | null) {
  return lists.category.find((i) => i.value === category)?.inBudget ?? true;
}

export function colorOf(lists: Lists, type: ListType, value: string | null) {
  const items = lists[type];
  const i = items.findIndex((x) => x.value === value);
  if (i < 0) return '#E7E2DD';
  return items[i].color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
}

/** 홈 대시보드 숫자. 예산포함이 꺼진 분류와 집계구분이 '제외'인 진행상황은 빠짐 */
export function summarize(d: Bootstrap) {
  let done = 0;
  let planned = 0;
  const byCategory = new Map<string, number>();

  for (const e of d.expenses) {
    if (!inBudget(d.lists, e.category)) continue;
    const kind = kindOf(d.lists, e.status);
    if (kind === 'excluded') continue;
    const amount = amountOf(e);
    if (kind === 'done') done += amount;
    else planned += amount;
    const name = e.category ?? '미분류';
    byCategory.set(name, (byCategory.get(name) ?? 0) + amount);
  }

  const total = done + planned;
  const categories = [...byCategory.entries()]
    .map(([name, amount]) => ({ name, amount, ratio: total ? amount / total : 0, budget: d.settings.budgets[name] ?? null }))
    .sort((a, b) => b.amount - a.amount);

  const today = todayStr();
  const from = addDays(today, -6);
  const recent = d.expenses
    .filter((e) => e.paidAt && e.paidAt >= from && e.paidAt <= today && kindOf(d.lists, e.status) === 'done')
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));

  return {
    done,
    planned,
    total,
    budget: d.settings.totalBudget,
    categories,
    recent,
    excludedCategories: d.lists.category.filter((i) => !i.inBudget).map((i) => i.value),
  };
}
