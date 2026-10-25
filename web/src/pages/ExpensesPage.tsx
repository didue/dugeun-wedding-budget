import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownUp, ChevronDown, Search } from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import ExpenseRow from '../components/ExpenseRow';
import PageHeader from '../components/PageHeader';
import { ErrorState, Loading } from '../components/States';
import { amountOf } from '../lib/aggregate';
import { addDays, monthEnd, todayStr, won } from '../lib/format';
import { useBootstrap } from '../lib/queries';

type Period = 'all' | 'month' | '30d' | 'custom';
type SheetKind = 'cat' | 'period' | 'payer' | 'status' | null;

const PERIODS: Period[] = ['all', 'month', '30d', 'custom'];
const PERIOD_LABEL: Record<Period, string> = { all: '전체 기간', month: '이번 달', '30d': '최근 30일', custom: '직접 지정' };

function periodRange(p: Period, from: string | null, to: string | null): [string | null, string | null] {
  const today = todayStr();
  if (p === 'month') return [`${today.slice(0, 8)}01`, monthEnd(today)];
  if (p === '30d') return [addDays(today, -29), today];
  if (p === 'custom') return [from, to];
  return [null, null];
}

/** "정근, 지수"처럼 여러 명이 함께 낸 경우도 각자 필터에 걸리도록 */
const payersOf = (payer: string | null) => (payer ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export default function ExpensesPage() {
  const { data, isLoading, error, refetch } = useBootstrap();
  const [sp, setSp] = useSearchParams();
  const [sheet, setSheet] = useState<SheetKind>(null);

  // 필터는 URL에 저장 → 상세 화면에 갔다가 돌아와도 그대로
  const cats = useMemo(() => (sp.get('cat') ?? '').split(',').filter(Boolean), [sp]);
  const payer = sp.get('payer');
  const status = sp.get('status');
  const rawPeriod = sp.get('period') as Period | null;
  const period: Period = rawPeriod && PERIODS.includes(rawPeriod) ? rawPeriod : 'all';
  const from = sp.get('from');
  const to = sp.get('to');
  const q = sp.get('q') ?? '';
  const sort = sp.get('sort') === 'amount' ? 'amount' : 'date';

  const patch = (next: Record<string, string | null>) =>
    setSp(
      (prev) => {
        const p = new URLSearchParams(prev);
        Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
        return p;
      },
      { replace: true },
    );

  const list = useMemo(() => {
    if (!data) return [];
    const [start, end] = periodRange(period, from, to);
    const needle = q.trim().toLowerCase();
    return data.expenses
      .filter(
        (e) =>
          (!cats.length || cats.includes(e.category ?? '')) &&
          (!payer || payersOf(e.payer).includes(payer)) &&
          (!status || e.status === status) &&
          (!start || (e.paidAt !== null && e.paidAt >= start)) &&
          (!end || (e.paidAt !== null && e.paidAt <= end)) &&
          (!needle || [e.title, e.vendor, e.memo].some((t) => t?.toLowerCase().includes(needle))),
      )
      .sort((a, b) => (sort === 'amount' ? amountOf(b) - amountOf(a) : (b.paidAt ?? '').localeCompare(a.paidAt ?? '')));
  }, [data, cats, payer, status, period, from, to, q, sort]);

  if (isLoading) return <Loading />;
  if (!data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const L = data.lists;
  const total = list.reduce((a, e) => a + amountOf(e), 0);
  const filtered = cats.length > 0 || !!payer || !!status || period !== 'all' || !!q;
  const catLabel = cats.length === 0 ? '분류' : cats.length === 1 ? cats[0] : `분류 ${cats.length}`;

  const chip = (kind: Exclude<SheetKind, null>, label: string, on: boolean) => (
    <button type="button" className={`chip ${on ? 'chip-on' : ''}`} onClick={() => setSheet(kind)}>
      {label} <ChevronDown size={14} />
    </button>
  );

  return (
    <div>
      <PageHeader
        title="지출 내역"
        right={
          <button type="button" className="flex items-center gap-1 text-sm text-stone-600" onClick={() => patch({ sort: sort === 'date' ? 'amount' : null })}>
            <ArrowDownUp size={16} />
            {sort === 'date' ? '최신순' : '금액순'}
          </button>
        }
      />

      <div className="px-4">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="field pl-9" placeholder="내용, 업체, 메모 검색" value={q} onChange={(e) => patch({ q: e.target.value || null })} />
        </label>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {filtered && (
            <button type="button" className="chip" onClick={() => setSp(new URLSearchParams(), { replace: true })}>
              초기화
            </button>
          )}
          {chip('cat', catLabel, cats.length > 0)}
          {chip('period', period === 'all' ? '결제일' : PERIOD_LABEL[period], period !== 'all')}
          {chip('payer', payer ?? '결제자', !!payer)}
          {chip('status', status ?? '진행상황', !!status)}
        </div>

        <p className="mt-3 text-xs text-stone-500">
          {list.length}건 · 합계 {won(total)}
        </p>

        <div className="mt-1">
          {list.length ? list.map((e) => <ExpenseRow key={e.id} e={e} lists={L} />) : <p className="py-12 text-center text-sm text-stone-400">조건에 맞는 내역이 없어요</p>}
        </div>
      </div>

      <BottomSheet open={sheet === 'cat'} onClose={() => setSheet(null)} title="분류">
        <div className="space-y-1">
          {L.category.map((c) => {
            const on = cats.includes(c.value);
            return (
              <label key={c.value} className="flex h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-stone-900"
                  checked={on}
                  onChange={() => patch({ cat: (on ? cats.filter((x) => x !== c.value) : [...cats, c.value]).join(',') || null })}
                />
                {c.value}
              </label>
            );
          })}
        </div>
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => setSheet(null)}>
          적용
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'period'} onClose={() => setSheet(null)} title="결제일">
        <div className="grid grid-cols-2 gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={`btn ${period === p ? 'bg-stone-900 text-white' : 'border border-stone-200'}`}
              onClick={() => {
                patch({ period: p === 'all' ? null : p, ...(p === 'custom' ? {} : { from: null, to: null }) });
                if (p !== 'custom') setSheet(null);
              }}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <input type="date" className="field" aria-label="시작일" value={from ?? ''} onChange={(e) => patch({ from: e.target.value || null })} />
            <input type="date" className="field" aria-label="종료일" value={to ?? ''} onChange={(e) => patch({ to: e.target.value || null })} />
          </div>
        )}
      </BottomSheet>

      <OptionSheet
        open={sheet === 'payer'}
        title="결제한 사람"
        options={[...new Set(L.payer.flatMap((p) => payersOf(p.value)))]}
        value={payer}
        onPick={(v) => patch({ payer: v })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        open={sheet === 'status'}
        title="진행상황"
        options={L.status.map((s) => s.value)}
        value={status}
        onPick={(v) => patch({ status: v })}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}

type OptionSheetProps = {
  open: boolean;
  title: string;
  options: string[];
  value: string | null;
  onPick: (v: string | null) => void;
  onClose: () => void;
};

function OptionSheet({ open, title, options, value, onPick, onClose }: OptionSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-1">
        {[null, ...options].map((o) => (
          <button
            key={o ?? '__all'}
            type="button"
            className={`flex h-11 w-full items-center rounded-xl px-3 text-left ${value === o ? 'bg-stone-100 font-medium' : ''}`}
            onClick={() => {
              onPick(o);
              onClose();
            }}
          >
            {o ?? '전체'}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
