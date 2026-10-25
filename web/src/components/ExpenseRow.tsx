import { Link } from 'react-router-dom';
import { amountOf, colorOf } from '../lib/aggregate';
import { shortDate, won } from '../lib/format';
import type { Expense, Lists } from '../lib/types';
import StatusBadge from './StatusBadge';

const badge = 'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] leading-none';

/** 설정에서 고른 색이 진하면 흰 글씨, 연하면 진한 글씨 */
function textOn(bg: string) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(bg.trim());
  if (!m) return '#1c1917';
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#1c1917' : '#ffffff';
}

export default function ExpenseRow({ e, lists }: { e: Expense; lists: Lists }) {
  const pending = e.id.startsWith('tmp-');
  const catColor = colorOf(lists, 'category', e.category);
  // "정근, 지수"처럼 함께 낸 경우는 사람마다 뱃지
  const payers = (e.payer ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const cls = 'flex items-center gap-3 border-b border-stone-100 py-3 last:border-0';
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px]">{e.title || '(내용 없음)'}</p>
        <div className="mt-1 flex items-center gap-1 overflow-hidden whitespace-nowrap text-xs text-stone-500">
          {e.paidAt && <span className="mr-0.5 shrink-0">{shortDate(e.paidAt)}</span>}
          {e.category && (
            <span className={badge} style={{ background: catColor, color: textOn(catColor) }}>
              {e.category}
            </span>
          )}
          {payers.map((p) => (
            <span key={p} className={`${badge} bg-stone-100 text-stone-600`}>
              {p}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[15px] font-medium">{won(amountOf(e))}</p>
        <StatusBadge lists={lists} status={e.status} />
      </div>
    </>
  );

  // 저장 중(임시 ID)인 행은 아직 열 수 없음
  if (pending) return <div className={`${cls} opacity-50`}>{body}</div>;
  return (
    <Link to={`/expenses/${e.id}`} className={cls}>
      {body}
    </Link>
  );
}
