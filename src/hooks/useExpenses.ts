'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useExpenses(groupId?: string) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('expenses')
        .select(`
          *,
          paid_by:profiles!expenses_paid_by_id_fkey(name, avatar),
          expense_splits(amount, user_id),
          groups(name, emoji)
        `)
        .order('date', { ascending: false });

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [groupId]);

  const createExpense = async (expenseData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        ...expenseData,
        paid_by_id: session?.user.id
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Create splits
    const splitAmount = Number(expenseData.amount) / expenseData.splitWith.length;
    const splits = expenseData.splitWith.map((userId: string) => ({
      expense_id: expense.id,
      user_id: userId,
      amount: splitAmount
    }));

    const { error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splits);

    if (splitsError) throw splitsError;

    // Log analytics
    await supabase.from('analytics').insert({
      user_id: session?.user.id,
      group_id: expenseData.groupId,
      category: expenseData.category,
      amount: expenseData.amount,
      metadata: { expense_id: expense.id }
    });

    await fetchExpenses();
    return expense;
  };

  return { expenses, loading, error, createExpense, refetch: fetchExpenses };
}