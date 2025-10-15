'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useBalances(groupId?: string) {
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('Not authenticated');

      if (groupId) {
        const { data, error } = await supabase
          .rpc('calculate_group_balances', { p_group_id: groupId });

        if (error) throw error;
        setBalances(data || []);
      } else {
        // Get overall balances
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_splits(*),
            paid_by:profiles!expenses_paid_by_id_fkey(id, name, avatar, upi_id)
          `);

        if (expensesError) throw expensesError;

        // Calculate net balances
        const balanceMap = new Map();

        expenses?.forEach((expense: any) => {
          expense.expense_splits?.forEach((split: any) => {
            if (split.user_id !== expense.paid_by_id) {
              const key = [split.user_id, expense.paid_by_id].sort().join('-');
              const current = balanceMap.get(key) || { 
                amount: 0, 
                fromUser: null, 
                toUser: null 
              };
              
              if (split.user_id === session.user.id) {
                current.amount -= Number(split.amount);
                current.fromUser = session.user.id;
                current.toUser = expense.paid_by;
                current.type = 'you-owe';
              } else if (expense.paid_by_id === session.user.id) {
                current.amount += Number(split.amount);
                current.fromUser = expense.paid_by;
                current.toUser = session.user.id;
                current.type = 'owes-you';
              }
              
              balanceMap.set(key, current);
            }
          });
        });

        const balancesArray = Array.from(balanceMap.values())
          .filter(b => Math.abs(b.amount) > 0.01)
          .map(b => ({
            ...b,
            amount: Math.abs(b.amount)
          }));

        setBalances(balancesArray);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [groupId]);

  return { balances, loading, error, refetch: fetchBalances };
}