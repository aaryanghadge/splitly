'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, BarChart3, Users } from 'lucide-react';

// Define TypeScript interfaces
interface SplitMember {
  user_id: string;
  amount: number;
}

interface GroupTransaction {
  id: string;
  amount: string;
  description: string;
  category: string;
  type: string;
  created_at: string;
  paid_by: string;
  split_members: SplitMember[];
}

interface Group {
  id: string;
  name: string;
  transactions: GroupTransaction[];
}

// Fix: groups is an array, not a single object
interface GroupMembership {
  group_id: string;
  groups: Group[]; // Changed from Group to Group[]
}

interface PersonalTransaction {
  id: string;
  user_id: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  description?: string;
  created_at: string;
}

interface ProcessedTransaction extends PersonalTransaction {
  is_group_transaction?: boolean;
  group_name?: string;
}

interface CategoryData {
  amount: number;
  count: number;
  type: 'income' | 'expense';
}

interface SourceData {
  amount: number;
  count: number;
  type: 'expense';
}

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  transactionCount: number;
}

interface AnalyticsData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  categoryBreakdown: Record<string, CategoryData>;
  sourceBreakdown: Record<string, SourceData>;
  monthlyTrends: MonthlyTrend[];
  transactionCount: number;
  averageTransaction: number;
  groupTransactionCount: number;
  personalTransactionCount: number;
}

interface Expense {
  id: string;
  amount: number;
  title: string;
  category: string;
  date: string;
  group_id: string;
  paid_by_id: string;
  expense_splits: SplitMember[];
  groups: {
    name: string;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'monthly' | 'sixMonths' | 'yearly'>('monthly');
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch expenses instead of transactions
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          title,
          category,
          date,
          group_id,
          paid_by_id,
          expense_splits (
            user_id,
            amount
          ),
          groups (
            name
          )
        `)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      // Process expenses into transactions format
      const processedTransactions: ProcessedTransaction[] = (expenses || []).map((expense) => {
        const userSplit = expense.expense_splits?.find(split => split.user_id === user.id);
        const isPayee = expense.paid_by_id === user.id;
        
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';

        if (isPayee) {
          // If user paid, they receive money from others
          const totalSplits = expense.expense_splits?.reduce((sum, split) => 
        split.user_id !== user.id ? sum + Number(split.amount) : sum, 0) || 0;
          amount = totalSplits;
          type = 'income';
        } else if (userSplit) {
          // If user is part of split but didn't pay, they owe money
          amount = Number(userSplit.amount);
          type = 'expense';
        }

        // Get the group name from the first group in the array
        const groupName = expense.groups && expense.groups[0]?.name;

        return {
          id: expense.id,
          user_id: user.id,
          amount: amount.toString(),
          type,
          category: expense.category || 'Uncategorized',
          description: expense.title,
          created_at: expense.date,
          is_group_transaction: true,
          group_name: groupName || 'Unknown Group'
        };
      });

      // Process analytics data with the transformed expenses
      const processedData = processAnalyticsData(processedTransactions, timeRange);
      setAnalyticsData(processedData);
      setLoading(false);

    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  };

  const processAnalyticsData = (transactions: ProcessedTransaction[], range: string): AnalyticsData | null => {
    if (!transactions || transactions.length === 0) {
      return null;
    }

    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'sixMonths':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Filter transactions by date range
    const filteredTransactions = transactions.filter(transaction => 
      new Date(transaction.created_at) >= startDate
    );

    if (filteredTransactions.length === 0) {
      return null;
    }

    // Calculate analytics
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum: number, t: ProcessedTransaction) => sum + parseFloat(t.amount), 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum: number, t: ProcessedTransaction) => sum + parseFloat(t.amount), 0);

    const netSavings = totalIncome - totalExpenses;

    // Category breakdown
    const categoryBreakdown = filteredTransactions.reduce((acc: Record<string, CategoryData>, transaction: ProcessedTransaction) => {
      const category = transaction.category || 'Uncategorized';
      const type = transaction.type || 'expense';
      
      if (!acc[category]) {
        acc[category] = { amount: 0, count: 0, type: type as 'income' | 'expense' };
      }
      acc[category].amount += parseFloat(transaction.amount);
      acc[category].count += 1;
      return acc;
    }, {});

    // Source breakdown (Personal vs Group)
    const sourceBreakdown = filteredTransactions.reduce((acc: Record<string, SourceData>, transaction: ProcessedTransaction) => {
      const source = transaction.is_group_transaction ? 'Group' : 'Personal';
      if (!acc[source]) {
        acc[source] = { amount: 0, count: 0, type: 'expense' };
      }
      acc[source].amount += parseFloat(transaction.amount);
      acc[source].count += 1;
      return acc;
    }, {});

    // Monthly trends
    const monthlyTrends = calculateMonthlyTrends(filteredTransactions, range);

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      categoryBreakdown,
      sourceBreakdown,
      monthlyTrends,
      transactionCount: filteredTransactions.length,
      averageTransaction: filteredTransactions.length > 0 ? 
        (totalIncome + totalExpenses) / filteredTransactions.length : 0,
      groupTransactionCount: filteredTransactions.filter(t => t.is_group_transaction).length,
      personalTransactionCount: filteredTransactions.filter(t => !t.is_group_transaction).length
    };
  };

  const calculateMonthlyTrends = (transactions: ProcessedTransaction[], range: string): MonthlyTrend[] => {
    const months: MonthlyTrend[] = [];
    const now = new Date();
    let monthCount = range === 'yearly' ? 12 : range === 'sixMonths' ? 6 : 2;

    for (let i = monthCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate.getFullYear() === date.getFullYear() && 
               transactionDate.getMonth() === date.getMonth();
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum: number, t: ProcessedTransaction) => sum + parseFloat(t.amount), 0);

      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum: number, t: ProcessedTransaction) => sum + parseFloat(t.amount), 0);

      months.push({
        month: monthName,
        income,
        expenses,
        savings: income - expenses,
        transactionCount: monthTransactions.length
      });
    }

    return months;
  };

  const getTrendIcon = (value: number) => {
    return value >= 0 ? 
      <TrendingUp className="w-4 h-4 text-green-400" /> : 
      <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  // Update currency format to use INR
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
      </div>

      <header className="sticky top-0 bg-black/50 backdrop-blur-xl border-b border-white/10 z-40">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics</h1>
              <p className="text-sm text-gray-400">Insights into your spending</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Time Range Selector */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'monthly' as const, label: 'Monthly' },
            { key: 'sixMonths' as const, label: '6 Months' },
            { key: 'yearly' as const, label: 'Yearly' }
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => setTimeRange(range.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeRange === range.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {analyticsData ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Debit</h3>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(analyticsData.totalIncome)}
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Credit</h3>
                </div>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(analyticsData.totalExpenses)}
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Net Savings</h3>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${
                    analyticsData.netSavings >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(analyticsData.netSavings)}
                  </p>
                  {getTrendIcon(analyticsData.netSavings)}
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Transactions</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold">{analyticsData.transactionCount} total</p>
                  <p className="text-sm text-gray-400">
                    {analyticsData.personalTransactionCount} personal • {analyticsData.groupTransactionCount} group
                  </p>
                </div>
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold">Spending by Source</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(analyticsData.sourceBreakdown)
                  .sort(([,a], [,b]) => (b as SourceData).amount - (a as SourceData).amount)
                  .map(([source, data]) => {
                    const sourceData = data as SourceData;
                    return (
                      <div key={source} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            source === 'Personal' ? 'bg-blue-500/20' : 'bg-green-500/20'
                          }`}>
                            <Users className={`w-4 h-4 ${
                              source === 'Personal' ? 'text-blue-400' : 'text-green-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{source}</p>
                            <p className="text-sm text-gray-400">
                              {sourceData.count} transaction{sourceData.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <p className="text-red-400 font-bold">
                          {formatCurrency(sourceData.amount)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <PieChart className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold">Category Breakdown</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(analyticsData.categoryBreakdown)
                  .sort(([,a], [,b]) => (b as CategoryData).amount - (a as CategoryData).amount)
                  .map(([category, data]) => {
                    const categoryData = data as CategoryData;
                    return (
                      <div key={category} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <div>
                          <p className="font-medium">{category}</p>
                          <p className="text-sm text-gray-400">
                            {categoryData.count} transaction{categoryData.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <p className={`font-bold ${
                          categoryData.type === 'income' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(categoryData.amount)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold">Monthly Trends</h2>
              </div>
              
              <div className="space-y-4">
                {analyticsData.monthlyTrends.map((month: MonthlyTrend, index: number) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{month.month}</p>
                      <p className="text-sm text-gray-400">
                        {month.transactionCount} transactions
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-green-400 text-sm">+{formatCurrency(month.income)}</p>
                      <p className="text-red-400 text-sm">-{formatCurrency(month.expenses)}</p>
                      <p className={`font-bold ${
                        month.savings >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(month.savings)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <PieChart className="w-20 h-20 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Data Available</h2>
            <p className="text-gray-400">Start adding transactions to see analytics</p>
          </div>
        )}
      </main>
    </div>
  );
}