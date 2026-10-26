import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DateInput from '../../components/DateInput';
import PageHeader from '../../components/PageHeader';
import { ErrorState, Loading } from '../../components/States';
import { dday, longDate } from '../../lib/format';
import { goBack } from '../../lib/nav';
import { useBootstrap, useSettingsMutations } from '../../lib/queries';

export default function DdayPage() {
  const { data, isLoading, error, refetch } = useBootstrap();
  if (isLoading) return <Loading />;
  if (!data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return <DdayForm initial={data.settings.weddingDate} />;
}

function DdayForm({ initial }: { initial: string | null }) {
  const navigate = useNavigate();
  const { saveSettings, saving } = useSettingsMutations();
  const [date, setDate] = useState(initial ?? '');

  const save = async () => {
    try {
      await saveSettings({ weddingDate: date || null });
      goBack(navigate, '/settings');
    } catch {
      // 오류 토스트는 mutation에서 표시
    }
  };

  return (
    <div>
      <PageHeader
        title="Wedding Day"
        back="/settings"
        right={
          <button type="button" className="btn-header" disabled={saving} onClick={() => void save()}>
            {saving ? '저장 중…' : '저장'}
          </button>
        }
      />
      <div className="px-4">
        <section className="card">
          <label htmlFor="wedding-date" className="label">
            Wedding Day
          </label>
          <DateInput id="wedding-date" value={date} onChange={setDate} />
          {date && (
            <p className="mt-3 text-sm text-stone-600">
              {longDate(date)} · <span className="font-semibold text-blush-700">{dday(date)}</span>
            </p>
          )}
        </section>
        <p className="mt-2 text-xs text-stone-400">체크리스트의 D-day와 마감일 자동 제안에 쓰여요.</p>
      </div>
    </div>
  );
}
