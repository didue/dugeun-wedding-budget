import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useBootstrap } from '../lib/queries';
import { sum, todayStr, won } from '../lib/format';
import type { Expense, ExpenseInput, ListType } from '../lib/types';
import { Field, SelectField } from './Field';
import MoneyInput from './MoneyInput';
import { Loading } from './States';

const EMPTY: ExpenseInput = {
  category: null,
  paidAt: null,
  title: null,
  vendor: null,
  deposit: null,
  middle: null,
  balance: null,
  total: null,
  payer: null,
  status: null,
  contractAt: null,
  memo: null,
  contact: null,
  url: null,
  cashReceiptAmount: null,
  cashReceiptStatus: null,
};

function toInput(e: Expense): ExpenseInput {
  const copy: Partial<Expense> = { ...e };
  delete copy.id;
  return copy as ExpenseInput;
}

type TextKey = 'title' | 'vendor' | 'memo' | 'contact' | 'url';

type Props = {
  initial?: Expense;
  onSubmit: (data: ExpenseInput) => void;
  submitLabel?: string;
  disabled?: boolean;
  /** 저장 버튼 왼쪽에 반반으로 놓을 버튼 (예: 삭제) */
  sideAction?: ReactNode;
};

export default function ExpenseForm({ initial, onSubmit, submitLabel = '저장', disabled, sideAction }: Props) {
  const { data } = useBootstrap();
  const [f, setF] = useState<ExpenseInput>(() => (initial ? toInput(initial) : { ...EMPTY, paidAt: todayStr() }));
  const [error, setError] = useState('');
  const [more, setMore] = useState(() =>
    Boolean(initial && (initial.contractAt || initial.contact || initial.url || initial.cashReceiptAmount !== null || initial.cashReceiptStatus)),
  );

  if (!data) return <Loading />;

  const options = (t: ListType) => data.lists[t].map((i) => i.value);
  const set =
    <K extends keyof ExpenseInput>(k: K) =>
    (v: ExpenseInput[K]) =>
      setF((p) => ({ ...p, [k]: v }));
  const text = (k: TextKey) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setF((p) => ({ ...p, [k]: v || null }));
    if (k === 'title') setError('');
  };
  const total = sum(f.deposit, f.middle, f.balance);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = f.title?.trim();
    if (!title) {
      setError('내용을 입력하세요');
      return;
    }
    onSubmit({ ...f, title, total });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="분류" htmlFor="ex-category">
          <SelectField id="ex-category" value={f.category} options={options('category')} onChange={set('category')} />
        </Field>
        <Field label="결제일" htmlFor="ex-paidAt">
          <input id="ex-paidAt" type="date" className="field" value={f.paidAt ?? ''} onChange={(e) => set('paidAt')(e.target.value || null)} />
        </Field>
      </div>

      <Field label="내용" htmlFor="ex-title" error={error}>
        <input id="ex-title" className="field" placeholder="지출 내용 입력" value={f.title ?? ''} onChange={text('title')} />
      </Field>
      <Field label="업체" htmlFor="ex-vendor">
        <input id="ex-vendor" className="field" placeholder="결제 업체 입력" value={f.vendor ?? ''} onChange={text('vendor')} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="계약·예약금" htmlFor="ex-deposit">
          <MoneyInput id="ex-deposit" value={f.deposit} onChange={set('deposit')} />
        </Field>
        <Field label="추가·중도금" htmlFor="ex-middle">
          <MoneyInput id="ex-middle" value={f.middle} onChange={set('middle')} />
        </Field>
        <Field label="잔금" htmlFor="ex-balance">
          <MoneyInput id="ex-balance" value={f.balance} onChange={set('balance')} />
        </Field>
        <div>
          <span className="label">총 견적 (자동 계산)</span>
          <p className="flex h-11 items-center justify-end rounded-xl bg-brand-50 px-3 text-base font-medium">{won(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="결제한 사람" htmlFor="ex-payer">
          <SelectField id="ex-payer" value={f.payer} options={options('payer')} onChange={set('payer')} />
        </Field>
        <Field label="진행상황" htmlFor="ex-status">
          <SelectField id="ex-status" value={f.status} options={options('status')} onChange={set('status')} />
        </Field>
      </div>

      <Field label="메모" htmlFor="ex-memo">
        <textarea id="ex-memo" rows={3} className="field h-auto py-2" value={f.memo ?? ''} onChange={text('memo')} />
      </Field>

      <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-sm text-stone-500">
        추가 정보 <ChevronDown size={16} className={more ? 'rotate-180' : ''} />
      </button>
      {more && (
        <div className="space-y-3">
          <Field label="계약·예약일" htmlFor="ex-contractAt">
            <input id="ex-contractAt" type="date" className="field" value={f.contractAt ?? ''} onChange={(e) => set('contractAt')(e.target.value || null)} />
          </Field>
          <Field label="업체 연락처" htmlFor="ex-contact">
            <input id="ex-contact" type="tel" className="field" value={f.contact ?? ''} onChange={text('contact')} />
          </Field>
          <Field label="URL" htmlFor="ex-url">
            <input id="ex-url" type="url" className="field" placeholder="https://" value={f.url ?? ''} onChange={text('url')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="현금영수금액" htmlFor="ex-cra">
              <MoneyInput id="ex-cra" value={f.cashReceiptAmount} onChange={set('cashReceiptAmount')} />
            </Field>
            <Field label="현금영수 처리상태" htmlFor="ex-crs">
              <SelectField id="ex-crs" value={f.cashReceiptStatus} options={options('cashReceiptStatus')} onChange={set('cashReceiptStatus')} />
            </Field>
          </div>
        </div>
      )}

      <div className={sideAction ? '!mt-6 grid grid-cols-2 gap-2' : ''}>
        {sideAction}
        <button type="submit" className="btn-primary w-full" disabled={disabled}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
