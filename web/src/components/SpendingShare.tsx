import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { breakdown, colorOf, type ShareBy, type ShareScope } from '../lib/aggregate';
import { manwon } from '../lib/format';
import { LIST_TYPES, type Bootstrap, type Lists } from '../lib/types';

type Filter = {
  by: ShareBy;
  scope: ShareScope;
  /** 기준별로 숨긴 항목. 기준을 바꿔도 각자 기억 */
  hidden: Record<ShareBy, string[]>;
};

const BYS: ShareBy[] = ['category', 'payer', 'status'];
const SCOPES: ShareScope[] = ['all', 'done', 'planned'];
const SCOPE_LABEL: Record<ShareScope, string> = { all: '전체', done: '지출 완료', planned: '지출 예정' };

/** 기본으로 숨길 분류. 이름이 '신혼집·이사'처럼 붙어 있어도 걸리도록 일부만 맞춤 */
const DEFAULT_HIDDEN_CATEGORY = /신혼집|이사|신혼여행/;

function defaultFilter(lists: Lists): Filter {
  return {
    by: 'category',
    scope: 'all',
    hidden: { category: lists.category.map((i) => i.value).filter((v) => DEFAULT_HIDDEN_CATEGORY.test(v)), payer: [], status: [] },
  };
}

const STORAGE_KEY = 'home-share-filter-v2';

function loadFilter(def: Filter): Filter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    const f = JSON.parse(raw) as Partial<Filter>;
    return {
      by: f.by && BYS.includes(f.by) ? f.by : def.by,
      scope: f.scope && SCOPES.includes(f.scope) ? f.scope : def.scope,
      hidden: { ...def.hidden, ...f.hidden },
    };
  } catch {
    return def;
  }
}

function saveFilter(f: Filter) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  } catch {
    // 저장 못 해도 이번 화면에서는 그대로 동작
  }
}

const sameFilter = (a: Filter, b: Filter) => JSON.stringify(a) === JSON.stringify(b);

/** 목록에서 해당 항목만 걸러 보는 주소. 여러 명이 함께 낸 결제자는 목록 필터가 없어서 이동 안 함 */
function expensesLink(by: ShareBy, name: string) {
  if (name === '미분류') return null;
  if (by === 'category') return `/expenses?cat=${encodeURIComponent(name)}`;
  if (by === 'status') return `/expenses?status=${encodeURIComponent(name)}`;
  return name.includes(',') ? null : `/expenses?payer=${encodeURIComponent(name)}`;
}

export default function SpendingShare({ data }: { data: Bootstrap }) {
  const navigate = useNavigate();
  const def = useMemo(() => defaultFilter(data.lists), [data.lists]);
  const [filter, setFilterState] = useState(() => loadFilter(def));
  const isDefault = sameFilter(filter, def);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const setFilter = (f: Filter) => {
    setFilterState(f);
    saveFilter(f);
    setActive(null);
  };

  const hidden = filter.hidden[filter.by];
  const { total, items } = useMemo(() => breakdown(data, filter.by, filter.scope, hidden), [data, filter.by, filter.scope, hidden]);
  const color = (name: string) => colorOf(data.lists, filter.by, name);

  // 시트에 보여줄 항목: 목록 설정값 + 실제로 비어 있는 값이 있으면 '미분류'
  const options = useMemo(() => {
    const values = data.lists[filter.by].map((i) => i.value);
    if (data.expenses.some((e) => e[filter.by] === null)) values.push('미분류');
    return values;
  }, [data, filter.by]);

  const toggleHidden = (name: string) => {
    const next = hidden.includes(name) ? hidden.filter((x) => x !== name) : [...hidden, name];
    setFilter({ ...filter, hidden: { ...filter.hidden, [filter.by]: next } });
  };

  const sub = [filter.by !== 'category' && `${LIST_TYPES[filter.by]} 기준`, filter.scope !== 'all' && SCOPE_LABEL[filter.scope]].filter(Boolean).join(' · ');
  const activeItem = items.find((i) => i.name === active) ?? null;

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">항목별 지출 비중</h2>
          {sub && <p className="text-xs text-stone-500">{sub}</p>}
        </div>
        <button
          type="button"
          aria-label="차트 조건 설정"
          onClick={() => setOpen(true)}
          className="relative -mr-1 rounded-lg p-1.5 text-stone-500 active:bg-stone-100"
        >
          <SlidersHorizontal size={18} />
          {!isDefault && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-500" />}
        </button>
      </div>

      {items.length ? (
        <>
          <Donut
            items={items.map((i) => ({ ...i, color: color(i.name) }))}
            active={active}
            onSelect={(name) => setActive((a) => (a === name ? null : name))}
            center={
              activeItem ? (
                <>
                  <p className="max-w-[96px] truncate text-xs text-stone-500">{activeItem.name}</p>
                  <p className="text-lg font-semibold">{Math.round(activeItem.ratio * 100)}%</p>
                  <p className="text-xs text-stone-500">{manwon(activeItem.amount)}원</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-stone-500">합계</p>
                  <p className="text-base font-semibold">{manwon(total)}원</p>
                </>
              )
            }
          />
          <ul className="mt-3 space-y-1.5">
            {items.map((c) => {
              const to = expensesLink(filter.by, c.name);
              return (
                <li key={c.name}>
                  <button
                    type="button"
                    disabled={!to}
                    onClick={() => to && navigate(to)}
                    onMouseEnter={() => setActive(c.name)}
                    onMouseLeave={() => setActive(null)}
                    className={`flex w-full items-center gap-2 rounded-md text-left text-sm disabled:cursor-default ${active === c.name ? 'bg-brand-50' : ''}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-inset ring-black/5" style={{ background: color(c.name) }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-stone-500">{Math.round(c.ratio * 100)}%</span>
                    <span className="w-20 text-right font-medium">{manwon(c.amount)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-stone-400">{data.expenses.length ? '조건에 맞는 지출 내역이 없어요' : '아직 지출 내역이 없어요'}</p>
      )}
      {/* {hidden.length > 0 && <p className="mt-3 text-xs text-stone-400">{hidden.join(', ')}은(는) 차트에서 빠져 있어요</p>} */}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="차트 조건">
        <p className="label">보는 기준</p>
        <div className="grid grid-cols-3 gap-2">
          {BYS.map((b) => (
            <button
              key={b}
              type="button"
              className={`btn px-2 text-sm ${filter.by === b ? 'bg-brand-600 text-white' : 'border border-stone-200'}`}
              onClick={() => setFilter({ ...filter, by: b })}
            >
              {LIST_TYPES[b]}
            </button>
          ))}
        </div>

        <p className="label mt-4">집계 범위</p>
        <div className="grid grid-cols-3 gap-2">
          {SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn px-2 text-sm ${filter.scope === s ? 'bg-brand-600 text-white' : 'border border-stone-200'}`}
              onClick={() => setFilter({ ...filter, scope: s })}
            >
              {SCOPE_LABEL[s]}
            </button>
          ))}
        </div>

        <p className="label mt-4">보여줄 {LIST_TYPES[filter.by]}</p>
        <div className="space-y-1">
          {options.map((o) => (
            <label key={o} className="flex h-11 items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={!hidden.includes(o)} onChange={() => toggleHidden(o)} />
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-inset ring-black/5" style={{ background: color(o) }} />
              {o}
            </label>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn-ghost" disabled={isDefault} onClick={() => setFilter(def)}>
            기본값으로
          </button>
          <button type="button" className="btn-primary" onClick={() => setOpen(false)}>
            적용
          </button>
        </div>
      </BottomSheet>
    </section>
  );
}

type Slice = { name: string; amount: number; ratio: number; color: string };

const SIZE = 180;
const STROKE = 30;
// 선택된 조각이 굵어져도 잘리지 않게 여유를 둠
const R = (SIZE - STROKE - 8) / 2;
const C = 2 * Math.PI * R;
const GAP = 2;

/** 도넛형 파이. 조각 사이 2px 흰 틈, 누르면 가운데에 해당 항목 표시 */
function Donut({ items, active, onSelect, center }: { items: Slice[]; active: string | null; onSelect: (name: string) => void; center: ReactNode }) {
  const gap = items.length > 1 ? GAP : 0;
  let offset = 0;
  return (
    <div className="relative mx-auto mt-3" style={{ width: SIZE, height: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="-rotate-90" role="img" aria-label="항목별 지출 비중 원형 차트">
        {items.map((s) => {
          const len = s.ratio * C;
          const dash = Math.max(len - gap, 0.5);
          const el = (
            <circle
              key={s.name}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active === s.name ? STROKE + 6 : STROKE}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              opacity={active && active !== s.name ? 0.45 : 1}
              className="cursor-pointer transition-[opacity,stroke-width] duration-150"
              onClick={() => onSelect(s.name)}
            >
              <title>{`${s.name} ${Math.round(s.ratio * 100)}% · ${manwon(s.amount)}원`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  );
}
