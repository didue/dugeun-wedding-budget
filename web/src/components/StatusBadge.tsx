import { kindOf } from '../lib/aggregate';
import type { Aggregate, Lists } from '../lib/types';

const STYLE: Record<Aggregate, string> = {
  done: 'bg-emerald-50 text-emerald-700',
  planned: 'bg-amber-50 text-amber-700',
  excluded: 'bg-sky-50 text-sky-700',
};

export default function StatusBadge({ lists, status }: { lists: Lists; status: string | null }) {
  if (!status) return null;
  return <span className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] ${STYLE[kindOf(lists, status)]}`}>{status}</span>;
}
