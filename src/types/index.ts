import { ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar?: string | null;
  upi_id?: string | null;
  updated_at?: string;
}

export interface Analytics {
  totalExpenses: number;
  totalGroups: number;
  expensesByCategory: Record<string, number>;
  expensesByMonth: Record<string, number>;
  recentTransactions: Transaction[];
  topSpenders: SpenderStats[];
  balances: BalanceSummary[];
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  group: string;
  paidBy: User;
}

export interface SpenderStats {
  user: User;
  totalSpent: number;
  percentage: number;
  name: string;
  spent: number;
  owed: number;
  avatar: string;
  color: string;
}

export interface BalanceSummary {
  user: User;
  owes: number;
  owed: number;
  net: number;
  total: number;
  available: number;
  blocked: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
  emoji: string;
  [key: string]: string | number; // For Recharts compatibility
}

export interface StatCardProps {
  icon?: ReactNode;
  label?: string;
  title?: string;
  value: string | number;
  change?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'purple' | 'blue' | 'green' | 'orange';
  type?: 'money' | 'number' | 'percent';
}

export interface InsightCardProps {
  insight: {
    type: 'warning' | 'tip' | 'info';
    icon: ReactNode;
    title: string;
    description: string;
    color: 'orange' | 'purple' | 'blue';
  };
}
