import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  category: string;
  paid_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount: number;
  created_at: string;
}

export interface Balance {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  updated_at: string;
}

// API Functions

// Auth
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });

  if (error) throw error;

  // Create profile
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      name
    });
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Groups
export async function createGroup(name: string, emoji: string, description?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      emoji,
      description,
      created_by: user.id
    })
    .select()
    .single();

  if (groupError) throw groupError;

  // Add creator as member
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id
    });

  if (memberError) throw memberError;

  return group;
}

export async function getUserGroups() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      groups (
        id,
        name,
        emoji,
        description,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id);

  if (error) throw error;
  return data.map(item => item.groups).filter(Boolean);
}

export async function getGroupDetails(groupId: string) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) throw error;
  return data;
}

export async function addMemberToGroup(groupId: string, userEmail: string) {
  // Find user by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (profileError) throw new Error('User not found');

  // Add to group
  const { error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: profile.id
    });

  if (error) throw error;
}

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      user_id,
      profiles (
        id,
        name,
        email,
        avatar_url
      )
    `)
    .eq('group_id', groupId);

  if (error) throw error;
  return data.map(item => item.profiles).filter(Boolean);
}

// Expenses
export async function addExpense(
  groupId: string,
  title: string,
  amount: number,
  category: string,
  splitBetween: string[]
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Create expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      group_id: groupId,
      title,
      amount,
      paid_by: user.id,
      category
    })
    .select()
    .single();

  if (expenseError) throw expenseError;

  // Calculate split amount
  const shareAmount = amount / splitBetween.length;

  // Create expense splits
  const splits = splitBetween.map(userId => ({
    expense_id: expense.id,
    user_id: userId,
    share_amount: shareAmount
  }));

  const { error: splitsError } = await supabase
    .from('expense_splits')
    .insert(splits);

  if (splitsError) throw splitsError;

  // Update balances
  await updateBalances(groupId);

  return expense;
}

export async function getGroupExpenses(groupId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_splits (
        user_id,
        share_amount
      ),
      profiles!expenses_paid_by_fkey (
        name,
        email
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteExpense(expenseId: string) {
  const { data: expense } = await supabase
    .from('expenses')
    .select('group_id')
    .eq('id', expenseId)
    .single();

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;

  if (expense) {
    await updateBalances(expense.group_id);
  }
}

// Balances
async function updateBalances(groupId: string) {
  // Get all expenses for this group
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_splits (
        user_id,
        share_amount
      )
    `)
    .eq('group_id', groupId);

  if (expensesError) throw expensesError;

  // Calculate balances
  const balanceMap = new Map<string, number>();

  expenses.forEach(expense => {
    const paidBy = expense.paid_by;
    const splits = expense.expense_splits || [];

    splits.forEach((split: any) => {
      if (split.user_id !== paidBy) {
        const key = `${split.user_id}-${paidBy}`;
        const reverseKey = `${paidBy}-${split.user_id}`;
        
        const current = balanceMap.get(key) || 0;
        const reverse = balanceMap.get(reverseKey) || 0;

        if (reverse > split.share_amount) {
          balanceMap.set(reverseKey, reverse - split.share_amount);
        } else {
          balanceMap.set(key, current + split.share_amount - reverse);
          balanceMap.delete(reverseKey);
        }
      }
    });
  });

  // Delete existing balances
  await supabase
    .from('balances')
    .delete()
    .eq('group_id', groupId);

  // Insert new balances
  const balancesToInsert = Array.from(balanceMap.entries())
    .filter(([_, amount]) => amount > 0.01)
    .map(([key, amount]) => {
      const [from_user_id, to_user_id] = key.split('-');
      return {
        group_id: groupId,
        from_user_id,
        to_user_id,
        amount
      };
    });

  if (balancesToInsert.length > 0) {
    const { error } = await supabase
      .from('balances')
      .insert(balancesToInsert);

    if (error) throw error;
  }
}

export async function getGroupBalances(groupId: string) {
  const { data, error } = await supabase
    .from('balances')
    .select(`
      *,
      from_profile:profiles!balances_from_user_id_fkey (
        name,
        email
      ),
      to_profile:profiles!balances_to_user_id_fkey (
        name,
        email
      )
    `)
    .eq('group_id', groupId);

  if (error) throw error;
  return data;
}

export async function getUserBalances() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('balances')
    .select(`
      *,
      groups (
        name,
        emoji
      ),
      from_profile:profiles!balances_from_user_id_fkey (
        name,
        email
      ),
      to_profile:profiles!balances_to_user_id_fkey (
        name,
        email
      )
    `)
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

  if (error) throw error;
  return data;
}

// Analytics
export async function getGroupAnalytics(groupId: string) {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('group_id', groupId);

  if (error) throw error;

  // Group by category
  const categoryTotals = expenses.reduce((acc: any, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + parseFloat(expense.amount);
    return acc;
  }, {});

  return Object.entries(categoryTotals).map(([category, total]) => ({
    category,
    total
  }));
}

export async function getUserSpendingStats() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('amount, category, created_at')
    .eq('paid_by', user.id);

  if (error) throw error;

  const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  
  // Top spending category
  const categoryTotals = expenses.reduce((acc: any, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + parseFloat(expense.amount);
    return acc;
  }, {});

  const topCategory = Object.entries(categoryTotals)
    .sort(([, a]: any, [, b]: any) => b - a)[0];

  return {
    totalSpent,
    topCategory: topCategory ? topCategory[0] : null,
    topCategoryAmount: topCategory ? topCategory[1] : 0,
    expenseCount: expenses.length
  };
}