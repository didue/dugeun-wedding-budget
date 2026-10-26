import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Plus, Square } from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import ChecklistForm from '../components/ChecklistForm';
import PageHeader from '../components/PageHeader';
import { ErrorState, Loading } from '../components/States';
import { buildTemplate } from '../lib/checklistTemplate';
import { dday, longDate, shortDate, todayStr } from '../lib/format';
import { useBootstrap, useChecklistMutations } from '../lib/queries';
import type { ChecklistItem } from '../lib/types';

export default function ChecklistPage() {
  const { data, isLoading, error, refetch } = useBootstrap();
  const m = useChecklistMutations();
  const [editing, setEditing] = useState<ChecklistItem | 'new' | null>(null);

  const groups = useMemo(() => {
    if (!data) return [];
    // 마감일이 같은 달끼리 묶음. 키는 'YYYY-MM', 마감일 없으면 빈 키라 정렬 시 맨 앞
    const NO_DUE = '';
    const by = new Map<string, ChecklistItem[]>();
    for (const it of data.checklist) {
      const key = it.dueDate ? it.dueDate.slice(0, 7) : NO_DUE;
      by.set(key, [...(by.get(key) ?? []), it]);
    }
    return [...by.keys()].sort().map((key) => ({
      name: key === NO_DUE ? '마감일 없음' : `${key.slice(0, 4)}년 ${Number(key.slice(5, 7))}월`,
      items: by.get(key)!.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || (a.order ?? 0) - (b.order ?? 0)),
    }));
  }, [data]);

  if (isLoading) return <Loading />;
  if (!data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const { weddingDate } = data.settings;
  const doneCount = data.checklist.filter((c) => c.done).length;
  const today = todayStr();
  const nextOrder = data.checklist.reduce((a, c) => Math.max(a, c.order ?? 0), 0) + 1;
  const owners = [...new Set(data.lists.payer.flatMap((p) => p.value.split(',').map((s) => s.trim())))].filter(Boolean);

  return (
    <div>
      <PageHeader
        title="체크리스트"
        right={
          <button type="button" aria-label="할 일 추가" className="-mr-2 p-2" onClick={() => setEditing('new')}>
            <Plus size={24} />
          </button>
        }
      />

      <div className="space-y-4 px-4">
        {weddingDate ? (
          <section className="card mt-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-stone-500">{longDate(weddingDate)}</p>
                <p className="mt-1 text-2xl font-semibold">{dday(weddingDate)}</p>
              </div>
              <p className="text-sm text-stone-500">
                완료 <span className="font-semibold text-stone-900">{doneCount}</span> / {data.checklist.length}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-50">
              <div className="h-full bg-brand-500" style={{ width: `${data.checklist.length ? (doneCount / data.checklist.length) * 100 : 0}%` }} />
            </div>
          </section>
        ) : (
          <Link to="/settings/dday" className="card block text-sm text-stone-500">
            결혼식 날짜를 설정하면 D-day와 마감일을 맞춰 드려요 →
          </Link>
        )}

        {data.checklist.length === 0 && (
          <section className="card text-center">
            <p className="text-sm text-stone-600">준비할 일을 정리해 보세요</p>
            <p className="mt-1 text-xs text-stone-400">스드메, 청첩장, 신혼여행 등 기본 항목 20개를 한 번에 넣을 수 있어요</p>
            <button type="button" className="btn-primary mt-4" disabled={m.creatingMany} onClick={() => m.createMany(buildTemplate(weddingDate))}>
              {m.creatingMany ? '불러오는 중…' : '기본 체크리스트 불러오기'}
            </button>
          </section>
        )}

        {groups.map((g) => (
          <section key={g.name}>
            <h2 className="mb-1 text-sm font-semibold text-stone-500">{g.name}</h2>
            <div className="card py-1">
              {g.items.map((it) => {
                const overdue = !it.done && it.dueDate !== null && it.dueDate < today;
                const pending = it.id.startsWith('tmp-');
                return (
                  <div key={it.id} className={`flex items-center gap-3 border-b border-stone-100 py-2.5 last:border-0 ${pending ? 'opacity-50' : ''}`}>
                    <button
                      type="button"
                      aria-label={it.done ? '완료 취소' : '완료'}
                      disabled={pending}
                      onClick={() => m.update(it.id, { done: !it.done })}
                      className={it.done ? 'text-emerald-600' : 'text-stone-300'}
                    >
                      {it.done ? <CheckSquare size={22} /> : <Square size={22} />}
                    </button>
                    <button type="button" disabled={pending} className="min-w-0 flex-1 text-left" onClick={() => setEditing(it)}>
                      <p className={`truncate text-[15px] ${it.done ? 'text-stone-400 line-through' : ''}`}>{it.title}</p>
                      <p className={`text-xs ${overdue ? 'text-red-600' : 'text-stone-400'}`}>
                        {[it.dueDate ? `${shortDate(it.dueDate)}까지${overdue ? ' (지남)' : ''}` : null, it.owner].filter(Boolean).join(' · ') || '마감일 없음'}
                      </p>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <BottomSheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? '할 일 추가' : '할 일 수정'}>
        {editing !== null && (
          <ChecklistForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            owners={owners}
            nextOrder={nextOrder}
            onSubmit={(d) => {
              if (editing === 'new') m.create(d);
              else m.update(editing.id, d);
              setEditing(null);
            }}
            onDelete={
              editing === 'new'
                ? undefined
                : () => {
                    if (!window.confirm('이 할 일을 삭제할까요?')) return;
                    m.remove(editing.id);
                    setEditing(null);
                  }
            }
          />
        )}
      </BottomSheet>
    </div>
  );
}
