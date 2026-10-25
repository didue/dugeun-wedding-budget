import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoneyInput from '../../components/MoneyInput';
import PageHeader from '../../components/PageHeader';
import { ErrorState, Loading } from '../../components/States';
import { summarize } from '../../lib/aggregate';
import { manwon, won } from '../../lib/format';
import { goBack } from '../../lib/nav';
import { useBootstrap, useSettingsMutations } from '../../lib/queries';
import type { Bootstrap } from '../../lib/types';

export default function BudgetPage() {
  const { data, isLoading, error, refetch } = useBootstrap();
  if (isLoading) return <Loading />;
  if (!data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return <BudgetForm data={data} />;
}

function BudgetForm({ data }: { data: Bootstrap }) {
  const navigate = useNavigate();
  const { saveSettings, saving } = useSettingsMutations();
  const [total, setTotal] = useState<number | null>(data.settings.totalBudget);
  const [budgets, setBudgets] = useState<Record<string, number | null>>(() => ({ ...data.settings.budgets }));

  const spent = useMemo(() => new Map(summarize(data).categories.map((c) => [c.name, c.amount])), [data]);
  const categories = data.lists.category.filter((c) => c.inBudget);
  const catSum = categories.reduce((a, c) => a + (budgets[c.value] ?? 0), 0);

  const save = async () => {
    const clean: Record<string, number> = {};
    Object.entries(budgets).forEach(([k, v]) => {
      if (v && v > 0) clean[k] = v;
    });
    try {
      await saveSettings({ totalBudget: total, budgets: clean });
      goBack(navigate, '/settings');
    } catch {
      // 오류 토스트는 mutation에서 표시
    }
  };

  return (
    <div>
      <PageHeader
        title="예산 설정"
        back="/settings"
        right={
          <button type="button" className="text-[15px] font-medium" disabled={saving} onClick={() => void save()}>
            {saving ? '저장 중…' : '저장'}
          </button>
        }
      />
      <div className="space-y-5 px-4 pb-6">
        <section className="card">
          <label htmlFor="total-budget" className="label">
            총 예산
          </label>
          <MoneyInput id="total-budget" value={total} onChange={setTotal} />
          {total !== null && catSum > 0 && (
            <p className={`mt-2 text-xs ${catSum > total ? 'text-red-600' : 'text-stone-500'}`}>
              분류별 예산 합계 {won(catSum)} {catSum > total ? '· 총 예산보다 많아요' : ''}
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-1 text-sm font-semibold text-stone-500">분류별 예산</h2>
          <div className="card space-y-3">
            {categories.map((c) => (
              <div key={c.value}>
                <div className="mb-1 flex justify-between text-xs">
                  <label htmlFor={`b-${c.value}`} className="text-stone-700">
                    {c.value}
                  </label>
                  <span className="text-stone-400">지금까지 {manwon(spent.get(c.value) ?? 0)}원</span>
                </div>
                <MoneyInput id={`b-${c.value}`} value={budgets[c.value] ?? null} onChange={(v) => setBudgets((b) => ({ ...b, [c.value]: v }))} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-400">예산 집계에서 뺀 분류는 여기 나오지 않아요. 설정 &gt; 분류에서 바꿀 수 있어요.</p>
        </section>
      </div>
    </div>
  );
}
