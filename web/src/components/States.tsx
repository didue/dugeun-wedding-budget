import { errorMessage } from '../lib/api';

export function Loading() {
  return <p className="py-16 text-center text-sm text-stone-400">불러오는 중…</p>;
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm text-stone-600">{errorMessage(error)}</p>
      <button type="button" className="btn-ghost mt-4" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}
