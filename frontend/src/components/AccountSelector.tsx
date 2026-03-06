import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '../services/api';
import { cn } from '../lib/utils';

interface AccountSelectorProps {
  value: number | null;
  onChange: (accountId: number | null) => void;
  showAllOption?: boolean;
  className?: string;
}

export default function AccountSelector({
  value,
  onChange,
  showAllOption = true,
  className = '',
}: AccountSelectorProps) {
  const { data: accounts } = useQuery({
    queryKey: ['accounts', 'active'],
    queryFn: async () => {
      const response = await accountsApi.getAll(true);
      return response.data;
    },
  });

  return (
    <select
      value={value === null ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? null : parseInt(e.target.value))}
      aria-label="Select account"
      className={cn(
        'flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors cursor-pointer',
        className
      )}
    >
      {showAllOption && <option value="">All</option>}
      {accounts?.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  );
}
