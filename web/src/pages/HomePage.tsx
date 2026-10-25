import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ExpenseRow from '../components/ExpenseRow';
import PageHeader from '../components/PageHeader';
import { ErrorState, Loading } from '../components/States';
import { colorOf, summarize } from '../lib/aggregate';
import { dday, manwon } from '../lib/format';
import { useBootstrap } from '../lib/queries';

const pct = (part: number, whole: number) => `${Math.max(0, Math.min(100, (part / whole) * 100))}%`;

export default function HomePage() {
  const { data, isLoading, error, refetch } = useBootstrap();
  const navigate = useNavigate();
  const s = useMemo(() => (data ? summarize(data) : null), [data]);

  if (isLoading) return <Loading />;
  if (!data || !s) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const d = dday(data.settings.weddingDate);
  const over = s.categories.filter((c) => c.budget !== null && c.amount > c.budget);

  return (
    <div>
      <PageHeader
        title="우리 결혼 가계부"
        right={
          d ? (
            <Link to="/checklist" className="rounded-lg bg-violet-50 px-2 py-1 text-sm font-medium text-violet-700">
              {d}
            </Link>
          ) : (
            <Link to="/settings/dday" className="text-sm text-stone-500">
              결혼식 날짜 설정
            </Link>
          )
        }
      />

      <div className="space-y-3 px-4">
        {s.budget ? (
          <section className="card">
            <p className="text-xs text-stone-500">총 예산 대비 지출</p>
            <p className="mt-1 text-xl font-semibold">
              {manwon(s.total)} <span className="text-base font-normal text-stone-400">/ {manwon(s.budget)}원</span>
            </p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="bg-stone-900" style={{ width: pct(s.done, s.budget) }} />
              <div className="bg-stone-400" style={{ width: pct(s.planned, Math.max(s.budget, s.total)) }} />
            </div>
            <p className={`mt-2 text-xs ${s.total > s.budget ? 'text-red-600' : 'text-stone-500'}`}>
              {s.total > s.budget ? `예산 초과 ${manwon(s.total - s.budget)}원` : `남은 예산 ${manwon(s.budget - s.total)}원`} ·{' '}
              {Math.round((s.total / s.budget) * 100)}%
            </p>
          </section>
        ) : (
          <Link to="/settings/budget" className="card flex items-center justify-between text-sm text-stone-500">
            총 예산을 설정하면 남은 예산을 보여드려요 <ChevronRight size={16} />
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-stone-100 p-4">
            <p className="text-xs text-stone-500">지출 완료</p>
            <p className="mt-1 text-lg font-semibold">{manwon(s.done)}원</p>
          </div>
          <div className="rounded-2xl bg-stone-100 p-4">
            <p className="text-xs text-stone-500">지출 예정</p>
            <p className="mt-1 text-lg font-semibold">{manwon(s.planned)}원</p>
          </div>
        </div>

        <section className="card">
          <h2 className="text-sm font-semibold">분류별 지출 비율</h2>
          {s.categories.length ? (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full">
                {s.categories.map((c) => (
                  <div key={c.name} style={{ width: `${c.ratio * 100}%`, background: colorOf(data.lists, 'category', c.name) }} />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {s.categories.map((c) => (
                  <li key={c.name}>
                    <button
                      type="button"
                      onClick={() => navigate(`/expenses?cat=${encodeURIComponent(c.name)}`)}
                      className="flex w-full items-center gap-2 text-left text-sm"
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorOf(data.lists, 'category', c.name) }} />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-stone-500">{Math.round(c.ratio * 100)}%</span>
                      <span className="w-20 text-right font-medium">{manwon(c.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-400">아직 지출 내역이 없어요</p>
          )}
          {s.excludedCategories.length > 0 && <p className="mt-3 text-xs text-stone-400">{s.excludedCategories.join(', ')}은(는) 예산 집계에서 빠져 있어요</p>}
        </section>

        {over.length > 0 && (
          <section className="card ring-red-200">
            <h2 className="text-sm font-semibold text-red-600">예산을 넘은 분류</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {over.map((c) => (
                <li key={c.name} className="flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-red-600">+{manwon(c.amount - (c.budget ?? 0))}원</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">최근 7일 지출</h2>
            <Link to="/expenses" className="text-xs text-stone-500">
              전체 보기
            </Link>
          </div>
          {s.recent.length ? (
            s.recent.slice(0, 5).map((e) => <ExpenseRow key={e.id} e={e} lists={data.lists} />)
          ) : (
            <p className="mt-2 text-sm text-stone-400">최근 7일 동안 지출한 내역이 없어요</p>
          )}
        </section>
      </div>
    </div>
  );
}
