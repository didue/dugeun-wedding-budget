export const LIST_TYPES = {
  category: '분류',
  payer: '결제한 사람',
  status: '진행상황',
  cashReceiptStatus: '현금영수 처리상태',
} as const;

export type ListType = keyof typeof LIST_TYPES;

export function isListType(v: string | undefined): v is ListType {
  return !!v && v in LIST_TYPES;
}

/** 진행상황 값이 합계에서 어디로 들어가는지 */
export type Aggregate = 'done' | 'planned' | 'excluded';

export type ListItem = {
  value: string;
  color: string | null;
  aggregate: Aggregate | null;
  /** 분류 전용: false면 홈 예산 집계에서 제외 (예: 신혼집) */
  inBudget: boolean;
};

export type Lists = Record<ListType, ListItem[]>;

export type Expense = {
  id: string;
  category: string | null;
  paidAt: string | null;
  title: string | null;
  vendor: string | null;
  deposit: number | null;
  middle: number | null;
  balance: number | null;
  total: number | null;
  payer: string | null;
  status: string | null;
  contractAt: string | null;
  memo: string | null;
  contact: string | null;
  url: string | null;
  cashReceiptAmount: number | null;
  cashReceiptStatus: string | null;
};

export type ExpenseInput = Omit<Expense, 'id'>;

export type ChecklistItem = {
  id: string;
  title: string | null;
  group: string | null;
  dueDate: string | null;
  done: boolean;
  owner: string | null;
  memo: string | null;
  order: number | null;
};

export type ChecklistInput = Omit<ChecklistItem, 'id'>;

export type Settings = {
  weddingDate: string | null;
  totalBudget: number | null;
  budgets: Record<string, number>;
};

export type Bootstrap = {
  expenses: Expense[];
  lists: Lists;
  settings: Settings;
  checklist: ChecklistItem[];
};
