'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  ArrowLeft,
  Users,
  Plus,
  DollarSign,
  Calendar,
  UserPlus,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Percent,
  DivideSquare
} from 'lucide-react';

export default function GroupDetails() {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const router = useRouter();
  const params = useParams();
  const groupId = params.id;
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId]);

  const calculateBalances = (expensesData: any[], membersData: any[]) => {
    console.log('💰 Calculating balances...');
    
    if (!expensesData.length || !membersData.length) {
      return [];
    }

    // Create a map of how much each person paid and owes
    const balanceMap: any = {};
    
    // Initialize balance map
    membersData.forEach(member => {
      balanceMap[member.user_id] = {
        user_id: member.user_id,
        name: member.profiles?.name || 'User',
        paid: 0,
        owes: 0,
        balance: 0
      };
    });

    // Process each expense
    expensesData.forEach(expense => {
      const payer = expense.paid_by_id;
      const amount = Number(expense.amount);
      const splits = expense.splits || [];

      // Add to what payer paid
      if (balanceMap[payer]) {
        balanceMap[payer].paid += amount;
      }

      // Add to what each person owes based on their split
      if (splits.length > 0) {
        splits.forEach((split: any) => {
          if (balanceMap[split.user_id]) {
            balanceMap[split.user_id].owes += Number(split.amount);
          }
        });
      } else {
        // If no splits defined, split equally among all members
        const perPerson = amount / membersData.length;
        membersData.forEach(member => {
          if (balanceMap[member.user_id]) {
            balanceMap[member.user_id].owes += perPerson;
          }
        });
      }
    });

    // Calculate net balance for each person
    Object.keys(balanceMap).forEach(userId => {
      balanceMap[userId].balance = balanceMap[userId].paid - balanceMap[userId].owes;
    });

    // Convert to array and sort by balance
    const balancesArray = Object.values(balanceMap).sort((a: any, b: any) => b.balance - a.balance);
    
    console.log('Calculated balances:', balancesArray);
    return balancesArray;
  };

  const loadGroupData = async () => {
    try {
      setLoading(true);
      
      console.log('=== LOADING GROUP DATA ===');
      console.log('Group ID:', groupId);

      // Get group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) {
        console.error('❌ Group error:', groupError);
        throw groupError;
      }
      
      console.log('✅ Group loaded:', groupData);
      setGroup(groupData);

      // Get expenses with splits
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*, splits:expense_splits(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (expensesError) {
        console.error('❌ Expenses error:', expensesError);
      } else {
        console.log('✅ Expenses loaded:', expensesData);
        
        if (expensesData && expensesData.length > 0) {
          const expensesWithPayers = await Promise.all(
            expensesData.map(async (expense) => {
              const { data: payerData } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', expense.paid_by_id)
                .single();
              
              return {
                ...expense,
                paid_by: payerData
              };
            })
          );
          
          setExpenses(expensesWithPayers);
        } else {
          setExpenses([]);
        }
      }

      // Get members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (membersError) {
        console.error('❌ Members error:', membersError);
      } else {
        console.log('✅ Members loaded:', membersData);
        
        if (membersData && membersData.length > 0) {
          const membersWithProfiles = await Promise.all(
            membersData.map(async (member) => {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('name, email')
                .eq('id', member.user_id)
                .single();
              
              return {
                ...member,
                profiles: profileData
              };
            })
          );
          setMembers(membersWithProfiles);
          
          // Calculate balances after loading members and expenses
          const calculatedBalances = calculateBalances(expensesData || [], membersWithProfiles);
          setBalances(calculatedBalances);
        } else {
          setMembers([]);
          setBalances([]);
        }
      }

    } catch (error: any) {
      console.error('❌ Error loading group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    loadGroupData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading group...</div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Group not found</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
      </div>

      <header className="sticky top-0 bg-black/50 backdrop-blur-xl border-b border-white/10 z-40">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 bg-gradient-to-br ${group.color || 'from-purple-500 to-pink-500'} rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>
                  {group.emoji || '💰'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                  <p className="text-sm text-gray-400">{group.description || 'No description'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-sm">Add Member</span>
              </button>
              <button 
                onClick={() => setShowAddExpense(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={<DollarSign className="w-5 h-5" />}
            label="Total Spent"
            value={`₹${totalSpent.toLocaleString()}`}
            color="text-purple-400"
            bgColor="from-purple-500/10 to-pink-500/10"
          />
          <StatCard 
            icon={<Users className="w-5 h-5" />}
            label="Members"
            value={members.length}
            color="text-blue-400"
            bgColor="from-blue-500/10 to-cyan-500/10"
          />
          <StatCard 
            icon={<Receipt className="w-5 h-5" />}
            label="Expenses"
            value={expenses.length}
            color="text-orange-400"
            bgColor="from-orange-500/10 to-red-500/10"
          />
          <StatCard 
            icon={<Calendar className="w-5 h-5" />}
            label="Created"
            value={new Date(group.created_at).toLocaleDateString()}
            color="text-green-400"
            bgColor="from-green-500/10 to-emerald-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Expenses */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  Expenses {expenses.length > 0 && `(${expenses.length})`}
                </h2>
                <button 
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition"
                >
                  🔄 Refresh
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400 mb-2">No expenses yet</p>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="mt-4 px-6 py-2 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition"
                  >
                    Add First Expense
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} members={members} />
                  ))}
                </div>
              )}
            </div>

            {/* Balances Section */}
            {balances.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Balances</h2>
                <div className="space-y-3">
                  {balances.map((balance: any) => (
                    <BalanceCard key={balance.user_id} balance={balance} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Members</h2>
              <span className="text-sm text-gray-400">{members.length} people</span>
            </div>

            {members.length === 0 ? (
              <div className="text-center py-8 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10">
                <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-3">No members yet</p>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition text-sm"
                >
                  Add First Member
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddExpense && (
        <AddExpenseModal 
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => {
            setTimeout(() => loadGroupData(), 500);
          }}
          groupId={groupId as string}
          members={members}
        />
      )}

      {showAddMember && (
        <AddMemberModal 
          onClose={() => setShowAddMember(false)}
          onSuccess={() => {
            setTimeout(() => loadGroupData(), 500);
          }}
          groupId={groupId as string}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bgColor }: any) {
  return (
    <div className="relative group cursor-pointer">
      <div className={`relative bg-gradient-to-br ${bgColor} backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all`}>
        <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${color} mb-3`}>
          {icon}
        </div>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function ExpenseCard({ expense, members }: any) {
  const splits = expense.splits || [];
  const hasSplits = splits.length > 0;
  
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center text-2xl">
            {expense.category || '💰'}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">{expense.title}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>Paid by {expense.paid_by?.name || 'Someone'}</span>
              <span>•</span>
              <span>{new Date(expense.date || expense.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <p className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          ₹{Number(expense.amount).toLocaleString()}
        </p>
      </div>
      
      {hasSplits && (
        <div className="pt-3 border-t border-white/10">
          <p className="text-xs text-gray-500 mb-2">Split between:</p>
          <div className="flex flex-wrap gap-2">
            {splits.map((split: any) => {
              const member = members.find((m: any) => m.user_id === split.user_id);
              return (
                <div key={split.user_id} className="text-xs bg-white/5 px-2 py-1 rounded-lg">
                  <span className="text-gray-400">{member?.profiles?.name || 'User'}:</span>
                  <span className="text-purple-400 ml-1">₹{Number(split.amount).toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceCard({ balance }: any) {
  const isPositive = balance.balance > 0;
  const isZero = Math.abs(balance.balance) < 0.01;
  
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isZero ? 'bg-green-500/20' : isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {isZero ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : isPositive ? (
              <ArrowUpRight className="w-5 h-5 text-green-400" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div>
            <p className="font-semibold text-white">{balance.name}</p>
            <p className="text-xs text-gray-400">
              Paid ₹{balance.paid.toFixed(0)} • Owes ₹{balance.owes.toFixed(0)}
            </p>
          </div>
        </div>
        <div className="text-right">
          {isZero ? (
            <p className="text-sm text-green-400 font-medium">Settled up ✓</p>
          ) : isPositive ? (
            <div>
              <p className="text-lg font-bold text-green-400">+₹{Math.abs(balance.balance).toFixed(0)}</p>
              <p className="text-xs text-gray-400">gets back</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-red-400">-₹{Math.abs(balance.balance).toFixed(0)}</p>
              <p className="text-xs text-gray-400">owes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member }: any) {
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          {member.profiles?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">{member.profiles?.name || 'User'}</p>
          <p className="text-xs text-gray-400">{member.profiles?.email || member.role || 'member'}</p>
        </div>
      </div>
    </div>
  );
}

function AddExpenseModal({ onClose, onSuccess, groupId, members }: any) {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '🍕',
    splitType: 'equal' // 'equal', 'custom', 'percentage'
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initialize selected members and custom splits
    if (members.length > 0) {
      const allMemberIds = members.map((m: any) => m.user_id);
      setSelectedMembers(allMemberIds);
      
      const initialSplits: {[key: string]: string} = {};
      allMemberIds.forEach((id: string) => {
        initialSplits[id] = '';
      });
      setCustomSplits(initialSplits);
    }
  }, [members]);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const calculateSplits = () => {
    const amount = parseFloat(formData.amount);
    if (!amount || selectedMembers.length === 0) return [];

    if (formData.splitType === 'equal') {
      const perPerson = amount / selectedMembers.length;
      return selectedMembers.map(userId => ({
        user_id: userId,
        amount: perPerson
      }));
    } else if (formData.splitType === 'custom') {
      return selectedMembers.map(userId => ({
        user_id: userId,
        amount: parseFloat(customSplits[userId]) || 0
      }));
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      if (selectedMembers.length === 0) {
        throw new Error('Please select at least one member');
      }

      const splits = calculateSplits();
      const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
      const expenseAmount = parseFloat(formData.amount);

      // Validate custom splits add up to total
      if (formData.splitType === 'custom' && Math.abs(totalSplit - expenseAmount) > 0.01) {
        throw new Error(`Splits (₹${totalSplit.toFixed(2)}) must equal total amount (₹${expenseAmount})`);
      }

      console.log('💾 Creating expense with splits:', splits);

      // Insert expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          title: formData.title,
          amount: expenseAmount,
          category: formData.category,
          group_id: groupId,
          paid_by_id: user.id,
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Insert splits
      const splitsToInsert = splits.map(split => ({
        expense_id: expenseData.id,
        user_id: split.user_id,
        amount: split.amount
      }));

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitsToInsert);

      if (splitsError) throw splitsError;

      console.log('✅ Expense and splits created successfully');
      
      onClose();
      alert('Expense added successfully!');
      onSuccess();

    } catch (err: any) {
      console.error('❌ Error adding expense:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['🍕', '🚗', '🏠', '🎬', '🛒', '✈️', '💊', '📱'];
  const amount = parseFloat(formData.amount) || 0;
  const perPerson = selectedMembers.length > 0 ? amount / selectedMembers.length : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-2xl w-full p-8 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition text-2xl">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
                placeholder="Dinner at restaurant"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
                placeholder="₹1000"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <div className="grid grid-cols-8 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`text-2xl p-2 rounded-xl border-2 transition-all ${
                    formData.category === cat
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Split Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Split Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, splitType: 'equal' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  formData.splitType === 'equal'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <DivideSquare className="w-4 h-4" />
                <span className="font-medium">Split Equally</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, splitType: 'custom' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  formData.splitType === 'custom'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span className="font-medium">Custom Amounts</span>
              </button>
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Split Between {selectedMembers.length > 0 && `(${selectedMembers.length} selected)`}
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((member: any) => {
                const isSelected = selectedMembers.includes(member.user_id);
                return (
                  <div
                    key={member.user_id}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMember(member.user_id)}
                        className="w-4 h-4 rounded border-gray-500 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                        {member.profiles?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-white font-medium">{member.profiles?.name || 'User'}</span>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2">
                        {formData.splitType === 'equal' ? (
                          <span className="text-purple-400 font-medium">
                            ₹{perPerson.toFixed(2)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            value={customSplits[member.user_id] || ''}
                            onChange={(e) => setCustomSplits({
                              ...customSplits,
                              [member.user_id]: e.target.value
                            })}
                            className="w-24 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
                            placeholder="₹0"
                            min="0"
                            step="0.01"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {formData.splitType === 'custom' && amount > 0 && (
              <div className="mt-3 p-3 bg-white/5 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total to split:</span>
                  <span className="text-white font-medium">₹{amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Currently allocated:</span>
                  <span className={`font-medium ${
                    Math.abs(Object.values(customSplits).reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0) - amount) < 0.01
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }`}>
                    ₹{Object.values(customSplits).reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedMembers.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ onClose, onSuccess, groupId }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !userData) {
        throw new Error('User not found with this email');
      }

      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userData.id)
        .single();

      if (existing) {
        throw new Error('User is already a member of this group');
      }

      const { error: insertError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userData.id,
          role: 'member'
        });

      if (insertError) throw insertError;

      onClose();
      alert('Member added successfully!');
      onSuccess();

    } catch (err: any) {
      console.error('Error adding member:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition text-2xl">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
              placeholder="friend@example.com"
              required
            />
            <p className="text-xs text-gray-500 mt-2">Enter the email of an existing user</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}