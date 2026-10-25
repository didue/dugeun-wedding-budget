import { useEffect, useState } from 'react';
import { Delete } from 'lucide-react';

function shuffled() {
  const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Props = {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  /** 값이 바뀔 때마다 숫자 배치를 다시 섞음 (틀렸을 때 등) */
  shuffleKey: number;
};

/** 금융앱 스타일 보안 키패드: 숫자 위치가 매번 랜덤 */
export default function NumPad({ onDigit, onDelete, disabled, shuffleKey }: Props) {
  const [order, setOrder] = useState(shuffled);

  useEffect(() => {
    setOrder(shuffled());
  }, [shuffleKey]);

  const key = 'h-16 rounded-2xl text-2xl font-medium text-stone-900 active:bg-stone-100 disabled:opacity-40';

  return (
    <div className="grid grid-cols-3 gap-2">
      {order.slice(0, 9).map((n) => (
        <button key={n} type="button" className={key} disabled={disabled} onClick={() => onDigit(String(n))}>
          {n}
        </button>
      ))}
      <button type="button" className={`${key} !text-sm !text-stone-500`} disabled={disabled} onClick={() => setOrder(shuffled())}>
        재배열
      </button>
      <button type="button" className={key} disabled={disabled} onClick={() => onDigit(String(order[9]))}>
        {order[9]}
      </button>
      <button type="button" aria-label="지우기" className={`${key} flex items-center justify-center !text-stone-600`} disabled={disabled} onClick={onDelete}>
        <Delete size={26} />
      </button>
    </div>
  );
}
