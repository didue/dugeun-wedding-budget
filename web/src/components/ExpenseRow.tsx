import { Link } from 'react-router-dom';
import { amountOf } from '../lib/aggregate';
import { shortDate, won } from '../lib/format';
import type { Expense, Lists } from '../lib/types';
import StatusBadge from './StatusBadge';

export default function ExpenseRow({ e, lists }: { e: Expense; lists: Lists }) {
  const pending = e.id.startsWith('tmp-');
  const cls = 'flex items-center gap-3 border-b border-stone-100 py-3 last:border-0';
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px]">{e.title || '(내용 없음)'}</p>
        <p className="mt-0.5 truncate text-xs text-stone-500">{[shortDate(e.paidAt), e.category, e.payer].filter(Boolean).join(' · ')}</p>
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
