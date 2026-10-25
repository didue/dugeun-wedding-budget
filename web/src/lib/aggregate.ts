import type { Aggregate, Bootstrap, Expense, ListType, Lists } from './types';
import { addDays, sum, todayStr } from './format';

export const FALLBACK_COLORS = ['#7F77DD', '#1D9E75', '#D4537E', '#378ADD', '#BA7517', '#D85A30', '#639922', '#993556', '#185FA5', '#888780'];

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
  if (i < 0) return '#A8A29E';
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
