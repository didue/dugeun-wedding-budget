import { useNavigate, useParams } from 'react-router-dom';
import ExpenseForm from '../components/ExpenseForm';
import PageHeader from '../components/PageHeader';
import { ErrorState, Loading } from '../components/States';
import { expensesPath, goBack } from '../lib/nav';
import { useBootstrap, useExpenseMutations } from '../lib/queries';

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useBootstrap();
  const { update, remove } = useExpenseMutations();

  if (isLoading) return <Loading />;
  if (!data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const item = data.expenses.find((e) => e.id === id);
  if (!item) {
    return (
      <div>
        <PageHeader title="지출 상세" back={expensesPath()} />
        <p className="py-16 text-center text-sm text-stone-400">내역을 찾을 수 없어요</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="지출 상세" back={expensesPath()} />
      <div className="px-4 pb-6">
        <ExpenseForm
          key={item.id}
          initial={item}
          submitLabel="저장"
          onSubmit={(d) => {
            update(item.id, d);
            goBack(navigate, expensesPath());
          }}
          sideAction={
            <button
              type="button"
              className="btn-danger w-full"
              onClick={() => {
                if (!window.confirm(`'${item.title ?? ''}' 내역을 삭제할까요?\n「삭제기록」 시트에 보관돼요.`)) return;
                remove(item.id);
                goBack(navigate, expensesPath());
              }}
            >
              삭제
            </button>
          }
        />
      </div>
    </div>
  );
}
