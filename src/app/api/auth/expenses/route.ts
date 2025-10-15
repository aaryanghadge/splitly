import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, amount, category, groupId, splitWith, description } = await request.json();

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        title,
        amount,
        category: category || '🍕',
        description,
        group_id: groupId,
        paid_by_id: session.user.id
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Create splits
    const splitAmount = Number(amount) / splitWith.length;
    const splits = splitWith.map((userId: string) => ({
      expense_id: expense.id,
      user_id: userId,
      amount: splitAmount
    }));

    const { error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splits);

    if (splitsError) throw splitsError;

    // Log to analytics
    await supabase.from('analytics').insert({
      user_id: session.user.id,
      group_id: groupId,
      category,
      amount,
      metadata: { expense_id: expense.id }
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}