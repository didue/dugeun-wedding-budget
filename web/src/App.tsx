import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import TabLayout from './app/TabLayout';
import Toaster from './components/Toaster';
import UpdatePrompt from './components/UpdatePrompt';
import { useAuthed } from './lib/auth';
import { startAutoLock } from './lib/autoLock';
import { queryClient } from './lib/queryClient';
import ChecklistPage from './pages/ChecklistPage';
import ExpenseDetailPage from './pages/ExpenseDetailPage';
import ExpensesPage from './pages/ExpensesPage';
import HomePage from './pages/HomePage';
import PinPage from './pages/PinPage';
import SettingsPage from './pages/SettingsPage';
import BudgetPage from './pages/settings/BudgetPage';
import DdayPage from './pages/settings/DdayPage';
import ListEditPage from './pages/settings/ListEditPage';

export default function App() {
  const authed = useAuthed();

  useEffect(() => startAutoLock(), []);

  // 잠기면 메모리에 남은 지출 데이터도 비움
  useEffect(() => {
    if (!authed) queryClient.clear();
  }, [authed]);

  return (
    <>
      {authed ? (
        <Routes>
          <Route element={<TabLayout />}>
            <Route index element={<HomePage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="expenses/:id" element={<ExpenseDetailPage />} />
            <Route path="checklist" element={<ChecklistPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/lists/:type" element={<ListEditPage />} />
            <Route path="settings/budget" element={<BudgetPage />} />
            <Route path="settings/dday" element={<DdayPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <PinPage />
      )}
      <UpdatePrompt />
      <Toaster />
    </>
  );
}
