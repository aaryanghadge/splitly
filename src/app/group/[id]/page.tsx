'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft,
  Users,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  UserPlus,
  TrendingUp,
  Receipt,
  Filter
} from 'lucide-react';
import {
  getGroupDetails,
  getGroupMembers,
  getGroupExpenses,
  getGroupBalances,
  addExpense,
  addMemberToGroup,
  deleteExpense,
  getCurrentUser
} from '@/lib/supabaseClient';

export default function GroupDetails() {
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  async function loadGroupData() {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const [groupData, membersData, expensesData, balancesData] = await Promise.all([
        getGroupDetails(groupId),
        getGroupMembers(groupId),
        getGroupExpenses(groupId),
        getGroupBalances(groupId)
      ]);

      setGroup(groupData);
      setMembers(membersData);
      setExpenses(expensesData);
      setBalances(balancesData);
    } catch (error) {
      console.error('Error loading group:', error);
      alert('Failed to load group data');
    } finally {
      setLoading(false);
    }
  }

  const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Group not found</h2>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-purple-400 hover:text-purple-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
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
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  {group.emoji}
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
            value={new Date(group.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            color="text-green-400"
            bgColor="from-green-500/10 to-emerald-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Expenses</h2>
            </div>

            {expenses.length === 0 ? (
              <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
                <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Expenses Yet</h3>
                <p className="text-gray-400 mb-6">Add your first expense to get started</p>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Add First Expense
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <ExpenseCard 
                    key={expense.id} 
                    expense={expense} 
                    members={members}
                    onDelete={async () => {
                      await deleteExpense(expense.id);
                      loadGroupData();
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Members</h2>
              <span className="text-sm text-gray-400">{members.length} people</span>
            </div>

            <div className="space-y-3">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>

            {balances.length > 0 && (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Balances</p>
                    <p className="text-lg font-bold text-white">{balances.length} pending</p>
                  </div>
                </div>
                <button 
                  onClick={() => router.push('/balances')}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  View All Balances
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddExpense && (
        <AddExpenseModal 
          onClose={() => setShowAddExpense(false)} 
          members={members}
          groupId={groupId}
          onSuccess={loadGroupData}
        />
      )}

      {showAddMember && (
        <AddMemberModal 
          onClose={() => setShowAddMember(false)}
          groupId={groupId}
          onSuccess={loadGroupData}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bgColor }: any) {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-br opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-all"></div>
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

function ExpenseCard({ expense, members, onDelete }: any) {
  const [showMenu, setShowMenu] = useState(false);
  const payer = members.find((m: any) => m.id === expense.paid_by);
  const splitCount = expense.expense_splits?.length || members.length;

  return (
    <div className="relative group">
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center text-2xl">
              {expense.category}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">{expense.title}</h3>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>Paid by {payer?.name || 'Unknown'}</span>
                <span>•</span>
                <span>{new Date(expense.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {splitCount}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                ₹{parseFloat(expense.amount).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">₹{(parseFloat(expense.amount) / splitCount).toFixed(0)} each</p>
            </div>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 transition-all relative"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
              {showMenu && (
                <div className="absolute right-0 top-10 w-40 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-2 shadow-xl z-10">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this expense?')) {
                        onDelete();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member }: any) {
  const colors = [
    'from-purple-500 to-pink-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500',
    'from-blue-500 to-cyan-500'
  ];
  
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold`}>
          {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">{member.name || 'User'}</p>
          <p className="text-xs text-gray-400">{member.email}</p>
        </div>
      </div>
    </div>
  );
}

function AddExpenseModal({ onClose, members, groupId, onSuccess }: any) {
  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('🍕');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map((m: any) => m.id));
  const [loading, setLoading] = useState(false);

  const categories = ['🍕', '🏠', '✈️', '🎬', '🚗', '⚡', '🏖️', '🛵', '🏄', '💊', '🎮', '☕'];

  async function handleSubmit() {
    if (!expenseName.trim() || !amount || parseFloat(amount) <= 0) {
      alert('Please fill all required fields');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('Please select at least one member to split with');
      return;
    }

    setLoading(true);
    try {
      await addExpense(
        groupId,
        expenseName,
        parseFloat(amount),
        selectedCategory,
        selectedMembers
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) ? prev.filter(m => m !== memberId) : [...prev, memberId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-2xl w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Expense Name</label>
            <input 
              type="text"
              placeholder="Beach dinner with friends"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
            <input 
              type="number"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <div className="grid grid-cols-6 gap-2">
              {categories.map((emoji) => (
                <button 
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedCategory(emoji)}
                  className={`p-4 text-2xl bg-white/5 hover:bg-white/10 border rounded-xl transition-all ${
                    selectedCategory === emoji ? 'border-purple-500/50 bg-white/10 scale-110' : 'border-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Split Between</label>
            <div className="grid grid-cols-2 gap-2">
              {members.map((member: any) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleMember(member.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedMembers.includes(member.id)
                      ? 'bg-purple-500/20 border-purple-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{member.name || member.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMemberModal({ onClose, groupId, onSuccess }: any) {
  const [memberEmail, setMemberEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!memberEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await addMemberToGroup(groupId, memberEmail);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding member:', error);
      alert(error.message || 'Failed to add member. Please try again.');
    } finally {
      setLoading(false);                                    
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-md w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input 
              type="email"
              placeholder="friend@example.com"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
            />
            <p className="text-xs text-gray-500 mt-2">User must have a Splitly account</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}