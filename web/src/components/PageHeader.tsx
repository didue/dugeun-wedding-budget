import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { goBack } from '../lib/nav';

type Props = {
  title: string;
  /** 뒤로 가기 버튼을 보여줄 때, 바로 들어온 경우 돌아갈 경로 */
  back?: string;
  right?: ReactNode;
};

export default function PageHeader({ title, back, right }: Props) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 bg-white/95 pt-safe backdrop-blur">
      <div className="flex h-14 items-center gap-1 px-4">
        {back !== undefined && (
          <button type="button" aria-label="뒤로" onClick={() => goBack(navigate, back)} className="-ml-2 p-2">
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
        {right}
      </div>
    </header>
  );
}
