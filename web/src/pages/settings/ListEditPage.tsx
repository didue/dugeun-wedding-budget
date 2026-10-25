import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { ErrorState, Loading } from '../../components/States';
import { FALLBACK_COLORS } from '../../lib/aggregate';
import { goBack } from '../../lib/nav';
import { useBootstrap, useSettingsMutations } from '../../lib/queries';
import { toast } from '../../lib/toast';
import { isListType, LIST_TYPES, type Aggregate, type Bootstrap, type ListItem, type ListType } from '../../lib/types';

const AGG_OPTIONS: { value: Aggregate; label: string }[] = [
  { value: 'done', label: '지출 완료로 집계' },
  { value: 'planned', label: '지출 예정으로 집계' },
  { value: 'excluded', label: '집계 제외' },
];

export default function ListEditPage() {
  const { type } = useParams();
  const { data, isLoading, error, refetch } = useBootstrap();

  if (!isListType(type)) return <Navigate to="/settings" replace />;
  if (isLoading) return <Loading />;
  if (!data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return <ListEditor key={type} type={type} data={data} />;
}

type Draft = ListItem & { key: string; original: string | null };

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

function ListEditor({ type, data }: { type: ListType; data: Bootstrap }) {
  const navigate = useNavigate();
  const { saveList, saving } = useSettingsMutations();
  const [items, setItems] = useState<Draft[]>(() => data.lists[type].map((i) => ({ ...i, key: newKey(), original: i.value })));
  const [adding, setAdding] = useState('');

  // 지출 내역에서 각 값이 몇 건 쓰이는지
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of data.expenses) {
      const v = e[type];
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return m;
  }, [data.expenses, type]);

  const patch = (key: string, p: Partial<Draft>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const move = (idx: number, dir: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return list;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const remove = (it: Draft) => {
    const count = it.original ? usage.get(it.original) ?? 0 : 0;
    if (count > 0) {
      toast(`${count}건에서 쓰고 있어서 지울 수 없어요. 이름을 바꾸면 기존 내역도 함께 바뀌어요`);
      return;
    }
    setItems((list) => list.filter((i) => i.key !== it.key));
  };

  const add = () => {
    const v = adding.trim();
    if (!v) return;
    if (items.some((i) => i.value.trim() === v)) {
      toast('이미 있는 항목이에요');
      return;
    }
    setItems((list) => [...list, { value: v, color: null, aggregate: type === 'status' ? 'planned' : null, inBudget: true, key: newKey(), original: null }]);
    setAdding('');
  };

  const save = async () => {
    const values = items.map((i) => i.value.trim());
    if (values.some((v) => !v)) return toast('비어 있는 항목이 있어요');
    if (new Set(values).size !== values.length) return toast('같은 이름의 항목이 있어요');

    const renames = items.filter((i) => i.original && i.original !== i.value.trim()).map((i) => ({ from: i.original!, to: i.value.trim() }));
    const affected = renames.reduce((a, r) => a + (usage.get(r.from) ?? 0), 0);
    if (affected > 0 && !window.confirm(`이름을 바꾼 항목이 있어요. 기존 지출 내역 ${affected}건도 함께 바뀌어요. 저장할까요?`)) return;

    try {
      await saveList({
        type,
        items: items.map(({ value, color, aggregate, inBudget }) => ({ value: value.trim(), color, aggregate, inBudget })),
        renames,
      });
      goBack(navigate, '/settings');
    } catch {
      // 오류 토스트는 mutation에서 표시
    }
  };

  return (
    <div>
      <PageHeader
        title={LIST_TYPES[type]}
        back="/settings"
        right={
          <button type="button" className="text-[15px] font-medium" disabled={saving} onClick={() => void save()}>
            {saving ? '저장 중…' : '저장'}
          </button>
        }
      />
      <div className="px-4 pb-6">
        <p className="mb-3 text-xs text-stone-500">여기서 바꾸면 시트의 드롭다운(데이터 확인 규칙)도 같이 바뀌어요.</p>

        <div className="card space-y-3">
          {items.map((it, idx) => (
            <div key={it.key} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                {type === 'category' && (
                  <input
                    type="color"
                    aria-label="색상"
                    className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                    value={it.color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                    onChange={(e) => patch(it.key, { color: e.target.value })}
                  />
                )}
                <input className="field h-10" value={it.value} aria-label="항목 이름" onChange={(e) => patch(it.key, { value: e.target.value })} />
                <button type="button" aria-label="위로" className="p-1 text-stone-400" onClick={() => move(idx, -1)}>
                  <ArrowUp size={18} />
                </button>
                <button type="button" aria-label="아래로" className="p-1 text-stone-400" onClick={() => move(idx, 1)}>
                  <ArrowDown size={18} />
                </button>
                <button type="button" aria-label="삭제" className="p-1 text-stone-400" onClick={() => remove(it)}>
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-stone-500">
                <span>{it.original ? `${usage.get(it.original) ?? 0}건 사용 중` : '새 항목'}</span>
                {type === 'status' && (
                  <select
                    aria-label="집계 구분"
                    className="bg-transparent text-right"
                    value={it.aggregate ?? 'planned'}
                    onChange={(e) => patch(it.key, { aggregate: e.target.value as Aggregate })}
                  >
                    {AGG_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
                {type === 'category' && (
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" className="accent-stone-900" checked={it.inBudget} onChange={(e) => patch(it.key, { inBudget: e.target.checked })} />
                    예산 집계에 포함
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="field"
            placeholder="새 항목 이름"
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="btn-ghost shrink-0" onClick={add}>
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
