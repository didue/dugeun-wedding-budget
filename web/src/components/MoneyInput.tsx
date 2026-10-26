import { useState } from 'react';

type Props = {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
};

/** 숫자 키패드로 입력, 쉼표 자동 */
export default function MoneyInput({ id, value, onChange }: Props) {
  const [text, setText] = useState(value === null ? '' : value.toLocaleString('ko-KR'));
  const [prev, setPrev] = useState(value);

  // 바깥에서 값이 바뀌면(자동 합계 등) 입력칸도 따라감
  if (value !== prev) {
    setPrev(value);
    const raw = text.replace(/[^\d-]/g, '');
    const typed = raw === '' || raw === '-' ? null : Number(raw);
    if (typed !== value) setText(value === null ? '' : value.toLocaleString('ko-KR'));
  }

  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="field pr-8 text-right"
        placeholder="0"
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '');
          if (raw === '' || raw === '-') {
            setText(raw);
            onChange(null);
            return;
          }
          const n = Number(raw);
          setText(n.toLocaleString('ko-KR'));
          onChange(n);
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">원</span>
    </div>
  );
}
