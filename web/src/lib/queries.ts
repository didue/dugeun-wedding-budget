import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { call, errorMessage } from './api';
import { getMyEndpoint } from './push';
import { toast } from './toast';
import type { Bootstrap, ChecklistInput, ChecklistItem, Expense, ExpenseInput, ListItem, ListType, Settings } from './types';

/** 화면에 필요한 데이터는 bootstrap 한 번으로 받아서 이 캐시 하나로 관리 */
export const BOOT = ['bootstrap'];

export function useBootstrap() {
  return useQuery({
    queryKey: BOOT,
    queryFn: () => call<Bootstrap>('bootstrap'),
    staleTime: 60_000,
  });
}

type Options<V, R> = {
  fn: (v: V) => Promise<R>;
  /** 서버 응답 전에 화면에 먼저 반영 (실패하면 되돌림) */
  optimistic?: (d: Bootstrap, v: V) => Bootstrap;
  /** 서버 응답으로 캐시 정리 */
  settle?: (d: Bootstrap, r: R, v: V) => Bootstrap;
  /** 성공 후 bootstrap 다시 받기 */
  refetch?: boolean;
  done?: string;
};

function useBootMutation<V, R>(o: Options<V, R>) {
  const qc = useQueryClient();
  return useMutation<R, unknown, V, { prev?: Bootstrap }>({
    mutationFn: o.fn,
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: BOOT });
      const prev = qc.getQueryData<Bootstrap>(BOOT);
      if (prev && o.optimistic) qc.setQueryData(BOOT, o.optimistic(prev, v));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(BOOT, ctx.prev);
      toast(errorMessage(e));
    },
    onSuccess: (r, v) => {
      const cur = qc.getQueryData<Bootstrap>(BOOT);
      if (cur && o.settle) qc.setQueryData(BOOT, o.settle(cur, r, v));
      if (o.refetch) void qc.invalidateQueries({ queryKey: BOOT });
      if (o.done) toast(o.done);
    },
  });
}

const tmpId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function useExpenseMutations() {
  const create = useBootMutation<{ tmpId: string; data: ExpenseInput }, Expense>({
    // exclude: 이 기기의 푸시 구독 주소. 등록한 기기를 뺀 나머지에 알림이 감
    fn: async (v) => call<Expense>('expense.create', { data: v.data, exclude: await getMyEndpoint() }),
    optimistic: (d, v) => ({ ...d, expenses: [{ ...v.data, id: v.tmpId }, ...d.expenses] }),
    settle: (d, r, v) => ({ ...d, expenses: d.expenses.map((e) => (e.id === v.tmpId ? r : e)) }),
    done: '저장했어요',
  });
  const update = useBootMutation<{ id: string; data: ExpenseInput }, Expense>({
    fn: (v) => call<Expense>('expense.update', v),
    optimistic: (d, v) => ({ ...d, expenses: d.expenses.map((e) => (e.id === v.id ? { ...e, ...v.data } : e)) }),
    settle: (d, r) => ({ ...d, expenses: d.expenses.map((e) => (e.id === r.id ? r : e)) }),
    done: '수정했어요',
  });
  const remove = useBootMutation<string, { id: string }>({
    fn: (id) => call<{ id: string }>('expense.delete', { id }),
    optimistic: (d, id) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }),
    done: '삭제했어요',
  });

  return {
    create: (data: ExpenseInput) => create.mutate({ tmpId: tmpId(), data }),
    update: (id: string, data: ExpenseInput) => update.mutate({ id, data }),
    remove: (id: string) => remove.mutate(id),
  };
}

export function useChecklistMutations() {
  const create = useBootMutation<{ tmpId: string; data: ChecklistInput }, ChecklistItem>({
    fn: (v) => call<ChecklistItem>('checklist.create', { data: v.data }),
    optimistic: (d, v) => ({ ...d, checklist: [...d.checklist, { ...v.data, id: v.tmpId }] }),
    settle: (d, r, v) => ({ ...d, checklist: d.checklist.map((c) => (c.id === v.tmpId ? r : c)) }),
  });
  const createMany = useBootMutation<ChecklistInput[], ChecklistItem[]>({
    fn: (items) => call<ChecklistItem[]>('checklist.createMany', { items }),
    settle: (d, r) => ({ ...d, checklist: [...d.checklist, ...r] }),
    done: '기본 체크리스트를 불러왔어요',
  });
  const update = useBootMutation<{ id: string; data: Partial<ChecklistInput> }, ChecklistItem>({
    fn: (v) => call<ChecklistItem>('checklist.update', v),
    optimistic: (d, v) => ({ ...d, checklist: d.checklist.map((c) => (c.id === v.id ? { ...c, ...v.data } : c)) }),
    settle: (d, r) => ({ ...d, checklist: d.checklist.map((c) => (c.id === r.id ? r : c)) }),
  });
  const remove = useBootMutation<string, { id: string }>({
    fn: (id) => call<{ id: string }>('checklist.delete', { id }),
    optimistic: (d, id) => ({ ...d, checklist: d.checklist.filter((c) => c.id !== id) }),
    done: '삭제했어요',
  });

  return {
    create: (data: ChecklistInput) => create.mutate({ tmpId: tmpId(), data }),
    createMany: (items: ChecklistInput[]) => createMany.mutate(items),
    creatingMany: createMany.isPending,
    update: (id: string, data: Partial<ChecklistInput>) => update.mutate({ id, data }),
    remove: (id: string) => remove.mutate(id),
  };
}

export type ListSaveArgs = {
  type: ListType;
  items: ListItem[];
  renames: { from: string; to: string }[];
};

export function useSettingsMutations() {
  const saveList = useBootMutation<ListSaveArgs, ListItem[]>({
    fn: (v) => call<ListItem[]>('lists.save', v),
    settle: (d, r, v) => ({ ...d, lists: { ...d.lists, [v.type]: r } }),
    refetch: true, // 이름 변경이 지출 내역에도 반영되므로 전체를 다시 받음
    done: '저장했어요',
  });
  const saveSettings = useBootMutation<Partial<Settings>, Settings>({
    fn: (data) => call<Settings>('settings.save', { data }),
    optimistic: (d, v) => ({ ...d, settings: { ...d.settings, ...v } }),
    settle: (d, r) => ({ ...d, settings: r }),
    done: '저장했어요',
  });

  return {
    saveList: (args: ListSaveArgs) => saveList.mutateAsync(args),
    saveSettings: (data: Partial<Settings>) => saveSettings.mutateAsync(data),
    saving: saveList.isPending || saveSettings.isPending,
  };
}
