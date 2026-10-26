import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ExpenseRow from '../components/ExpenseRow';
import PageHeader from '../components/PageHeader';
import SpendingShare from '../components/SpendingShare';
import { ErrorState, Loading } from '../components/States';
import { summarize } from '../lib/aggregate';
import { dday, manwon } from '../lib/format';
import { useBootstrap } from '../lib/queries';

const pct = (part: number, whole: number) => `${Math.max(0, Math.min(100, (part / whole) * 100))}%`;

export default function HomePage() {
  const { data, isLoading, error, refetch } = useBootstrap();
  const s = useMemo(() => (data ? summarize(data) : null), [data]);

  if (isLoading) return <Loading />;
  if (!data || !s) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const d = dday(data.settings.weddingDate);

  return (
    <div>
      <PageHeader
        title="디두와 그니의 결혼 가계부💸"
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

      <div className="space-y-3 px-4 mt-4">
        {s.budget ? (
          <section className="card">
            <p className="text-xs text-stone-500">총 예산 대비 지출</p>
            <p className="mt-1 text-xl font-semibold">
              {manwon(s.total)} <span className="text-base font-normal text-stone-400">/ {manwon(s.budget)}원</span>
            </p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-brand-50">
              <div className="bg-brand-500" style={{ width: pct(s.done, s.budget) }} />
              <div className="bg-brand-200" style={{ width: pct(s.planned, Math.max(s.budget, s.total)) }} />
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
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="text-xs text-stone-500">지출 완료</p>
            <p className="mt-1 text-lg font-semibold">{manwon(s.done)}원</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="text-xs text-stone-500">지출 예정</p>
            <p className="mt-1 text-lg font-semibold">{manwon(s.planned)}원</p>
          </div>
        </div>

        <SpendingShare data={data} />

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">최근 7일간 지출</h2>
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
