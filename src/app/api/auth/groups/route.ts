import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface Group {
  id: string;
  expenses: { amount: number }[];
  group_members: { role: string }[];
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all groups user is a member of
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner(role),
        expenses(amount)
      `)
      .eq('group_members.user_id', session.user.id);

    if (error) throw error;

    // Calculate totals
    const groupsWithStats = groups.map((group: Group) => ({
      ...group,
      total: group.expenses.reduce((sum: number, e) => sum + Number(e.amount), 0),
      memberCount: group.group_members?.length || 0,
      expenseCount: group.expenses?.length || 0
    }));

    return NextResponse.json({ groups: groupsWithStats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, emoji, description, color } = await request.json();

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        emoji: emoji || '💰',
        description,
        color: color || 'from-purple-500 to-pink-500',
        created_by: session.user.id
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        user_id: session.user.id,
        group_id: group.id,
        role: 'admin'
      });

    if (memberError) throw memberError;

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
