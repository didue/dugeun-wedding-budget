type Props = {
  id?: string;
  'aria-label'?: string;
  value: string;
  onChange: (v: string) => void;
};

/**
 * 날짜 입력. 브라우저 기본 표시는 기기 지역 설정을 따라서(아이폰은 dd/mm/yy 등) 글자는 숨기고
 * 그 위에 yyyy-MM-dd로 직접 그림. 누르면 기본 날짜 선택기가 그대로 열림
 */
export default function DateInput({ id, 'aria-label': ariaLabel, value, onChange }: Props) {
  return (
    <div className="relative min-w-0">
      <input id={id} aria-label={ariaLabel} type="date" className="field text-transparent" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className={`pointer-events-none absolute inset-y-0 left-3 flex items-center text-base ${value ? '' : 'text-stone-400'}`}>
        {value || '날짜 선택'}
      </span>
    </div>
  );
}
