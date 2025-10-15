import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (groupId) {
      // Get balances for specific group
      const { data, error } = await supabase
        .rpc('calculate_group_balances', { p_group_id: groupId });

      if (error) throw error;

      return NextResponse.json({ balances: data });
    } else {
      // Get overall balances across all groups
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_splits(*)
        `)
        .or(`paid_by_id.eq.${session.user.id},expense_splits.user_id.eq.${session.user.id}`);

      if (expensesError) throw expensesError;

      // Calculate balances
      const balanceMap = new Map();

      expenses.forEach((expense: any) => {
        const splits = expense.expense_splits || [];
        splits.forEach((split: any) => {
          if (split.user_id !== expense.paid_by_id) {
            const key = [split.user_id, expense.paid_by_id].sort().join('-');
            const current = balanceMap.get(key) || { amount: 0, from: '', to: '' };
            
            if (split.user_id === session.user.id) {
              current.amount -= Number(split.amount);
              current.from = session.user.id;
              current.to = expense.paid_by_id;
            } else if (expense.paid_by_id === session.user.id) {
              current.amount += Number(split.amount);
              current.from = split.user_id;
              current.to = session.user.id;
            }
            
            balanceMap.set(key, current);
          }
        });
      });

      const balances = Array.from(balanceMap.values()).filter(b => Math.abs(b.amount) > 0.01);

      return NextResponse.json({ balances });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
