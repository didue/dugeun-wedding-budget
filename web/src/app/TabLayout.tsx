import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, ListChecks, Plus, Receipt, Settings } from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import ExpenseForm from '../components/ExpenseForm';
import OfflineBanner from '../components/OfflineBanner';
import { expensesPath } from '../lib/nav';
import { useExpenseMutations } from '../lib/queries';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-0.5 py-1.5 text-[11px] ${isActive ? 'text-brand-600' : 'text-stone-400'}`;

// 지출 탭은 마지막으로 보던 필터로 열림 (경로가 바뀔 때마다 다시 계산)
function ExpensesTab() {
  useLocation();
  return (
    <NavLink to={expensesPath()} className={tabClass}>
      <Receipt size={22} />지출
    </NavLink>
  );
}

export default function TabLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const { create } = useExpenseMutations();

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-white shadow-[0_0_24px_rgba(63,123,201,0.08)] pb-[calc(env(safe-area-inset-bottom)+72px)]">
      <OfflineBanner />
      <Outlet />

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-brand-100 bg-white/95 pb-safe backdrop-blur" aria-label="주요 메뉴">
        <div className="grid grid-cols-5">
          <NavLink to="/" end className={tabClass}>
            <Home size={22} />홈
          </NavLink>
          <ExpensesTab />
          <button type="button" aria-label="지출 등록" onClick={() => setAddOpen(true)} className="flex items-center justify-center">
            <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 active:scale-95">
              <Plus size={28} />
            </span>
          </button>
          <NavLink to="/checklist" className={tabClass}>
            <ListChecks size={22} />체크리스트
          </NavLink>
          <NavLink to="/settings" className={tabClass}>
            <Settings size={22} />설정
          </NavLink>
        </div>
      </nav>

      {/* (+)는 탭 이동이 아니라 지금 화면 위에 등록 시트를 띄움 */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="지출 등록">
        <ExpenseForm
          onSubmit={(data) => {
            create(data);
            setAddOpen(false);
          }}
        />
      </BottomSheet>
    </div>
  );
}
