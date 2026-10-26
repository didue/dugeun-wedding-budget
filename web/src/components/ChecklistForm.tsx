import { useState, type FormEvent } from 'react';
import { GROUP_OFFSET } from '../lib/checklistTemplate';
import { addDays } from '../lib/format';
import type { ChecklistInput, ChecklistItem } from '../lib/types';
import { Field, SelectField } from './Field';

type Props = {
  initial?: ChecklistItem;
  weddingDate: string | null;
  owners: string[];
  nextOrder: number;
  onSubmit: (data: ChecklistInput) => void;
  onDelete?: () => void;
};

export default function ChecklistForm({ initial, weddingDate, owners, nextOrder, onSubmit, onDelete }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? (weddingDate ? addDays(weddingDate, -GROUP_OFFSET['D-30']) : ''));
  const [owner, setOwner] = useState<string | null>(initial?.owner ?? null);
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('할 일을 입력하세요');
      return;
    }
    onSubmit({
      title: title.trim(),
      // 시기(그룹)는 더 이상 쓰지 않음. 예전에 저장된 값만 그대로 둠
      group: initial?.group ?? null,
      dueDate: dueDate || null,
      done: initial?.done ?? false,
      owner,
      memo: memo.trim() || null,
      order: initial?.order ?? nextOrder,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="할 일" htmlFor="ck-title" error={error}>
        <input
          id="ck-title"
          className="field"
          placeholder="청첩장 시안 확정"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError('');
          }}
        />
      </Field>
      <Field label="마감일" htmlFor="ck-due">
        <input id="ck-due" type="date" className="field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label="담당" htmlFor="ck-owner">
        <SelectField id="ck-owner" value={owner} options={owners} onChange={setOwner} placeholder="함께" />
      </Field>
      <Field label="메모" htmlFor="ck-memo">
        <textarea id="ck-memo" rows={2} className="field h-auto py-2" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </Field>
      <button type="submit" className="btn-primary w-full">
        저장
      </button>
      {onDelete && (
        <button type="button" className="btn-danger w-full" onClick={onDelete}>
          삭제
        </button>
      )}
    </form>
  );
}
