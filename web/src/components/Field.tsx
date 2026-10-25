import type { ReactNode } from 'react';

export function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

type SelectProps = {
  id?: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  placeholder?: string;
};

/** 휴대폰에서는 기본 선택기(휠/목록)가 떠서 따로 만들지 않음 */
export function SelectField({ id, value, options, onChange, placeholder = '선택' }: SelectProps) {
  // 목록에서 빠진 예전 값도 그대로 보이도록
  const opts = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select id={id} className="field appearance-none" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{placeholder}</option>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
