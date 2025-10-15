'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  LayoutDashboard, 
  Users, 
  Plus, 
  TrendingUp, 
  PieChart,
  LogOut,
  Search,
  Bell,
  Settings,
  ChevronRight,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Shield
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadData();

    // Set timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading took too long, forcing UI render');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, []);

  const loadData = async () => {
    try {
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Load all data in parallel for faster loading
      const [profileData, groupsData, expensesData, balancesData, notificationsData] = await Promise.all([
        // Get profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(res => res.data),

        // Get groups with counts (optimized)
        supabase
          .from('groups')
          .select(`
            id,
            name,
            emoji,
            description,
            color,
            created_by,
            group_members!inner(role),
            expenses(amount)
          `)
          .eq('group_members.user_id', user.id)
          .limit(10)
          .then(res => res.data),

        // Get recent expenses
        supabase
          .from('expenses')
          .select(`
            id,
            title,
            amount,
            category,
            date,
            groups(name),
            paid_by:profiles!expenses_paid_by_id_fkey(name)
          `)
          .order('date', { ascending: false })
          .limit(5)
          .then(res => res.data),

        // Get balances
        supabase
          .from('balances')
          .select(`
            id,
            amount,
            from_user_id,
            to_user_id,
            toUser:profiles!balances_to_user_id_fkey(id, name),
            fromUser:profiles!balances_from_user_id_fkey(id, name)
          `)
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
          .limit(3)
          .then(res => res.data),

        // Get notifications
        supabase
          .from('reminders')
          .select('id, title, message, reminder_date, created_at')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('reminder_date', { ascending: true })
          .limit(5)
          .then(res => {
            // If table doesn't exist, return empty array
            if (res.error?.code === '42P01') {
              console.warn('Reminders table not found - skipping');
              return [];
            }
            return res.data;
          })
      ]);

      // Set profile immediately
      setProfile(profileData);
      setLoading(false); // Stop loading spinner early

      // Transform and set groups
      const transformedGroups = (groupsData || []).map(group => ({
        ...group,
        total: group.expenses?.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0,
        expenseCount: group.expenses?.length || 0,
        members: 1
      }));
      setGroups(transformedGroups);

      // Set expenses
      setExpenses(expensesData || []);

      // Transform and set balances
      const transformedBalances = (balancesData || []).map(balance => {
        const isFromUser = balance.from_user_id === user.id;
        // Handle both object and array cases
        const toUserData = Array.isArray(balance.toUser) ? balance.toUser[0] : balance.toUser;
        const fromUserData = Array.isArray(balance.fromUser) ? balance.fromUser[0] : balance.fromUser;
        const toUserName = toUserData?.name || 'User';
        const fromUserName = fromUserData?.name || 'User';
        return {
          ...balance,
          type: isFromUser ? 'you-owe' : 'owes-you',
          amount: Number(balance.amount || 0),
          name: isFromUser ? toUserName : fromUserName,
          avatar: (isFromUser ? toUserName : fromUserName)[0]?.toUpperCase() || 'U'
        };
      });
      setBalances(transformedBalances);

      // Set notifications
      setNotifications(notificationsData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load dashboard data');
      setLoading(false); // Always stop loading on error
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any local state
      setUser(null);
      setProfile(null);
      setGroups([]);
      setExpenses([]);
      setBalances([]);
      
      // Redirect to home page
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-purple-400 animate-pulse" />
            </div>
          </div>
          <div className="text-white text-xl font-medium">Loading your dashboard...</div>
          <div className="text-gray-400 text-sm mt-2">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadData();
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalOwed = balances.filter(b => b.type === 'owes-you').reduce((sum, b) => sum + b.amount, 0);
  const totalOwe = balances.filter(b => b.type === 'you-owe').reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = groups.reduce((sum, g) => sum + g.total, 0);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-white/5 to-white/0 backdrop-blur-xl border-r border-white/10 z-50">
        <div className="flex flex-col h-full p-6">
          <div 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-3 mb-10 cursor-pointer"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Splitly
            </span>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem 
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Dashboard"
              active={activeTab === 'dashboard'}
              onClick={() => {
                setActiveTab('dashboard');
                router.push('/dashboard');
              }}
            />
            <NavItem 
              icon={<Users className="w-5 h-5" />}
              label="Groups"
              active={activeTab === 'groups'}
              onClick={() => setActiveTab('groups')}
            />
            <NavItem 
              icon={<TrendingUp className="w-5 h-5" />}
              label="Balances"
              active={activeTab === 'balances'}
              onClick={() => {
                setActiveTab('balances');
                router.push('/balances');
              }}
            />
            <NavItem 
              icon={<PieChart className="w-5 h-5" />}
              label="Analytics"
              active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
            />

            <button 
              onClick={() => setShowAddExpense(true)}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </nav>

          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {profile?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{profile?.name || 'User'}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button onClick={handleSignOut}>
                <LogOut className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        <header className="sticky top-0 bg-black/50 backdrop-blur-xl border-b border-white/10 z-40">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-sm text-gray-400">Welcome back, {profile?.name || 'User'} 👋</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search expenses..."
                  className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition w-64"
                />
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <Bell className="w-5 h-5 text-gray-400" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full"></span>
                  )}
                </button>

                {showNotifications && (
                  <NotificationsDropdown 
                    notifications={notifications}
                    onClose={() => setShowNotifications(false)}
                    onAddReminder={() => {
                      setShowNotifications(false);
                      setShowAddReminder(true);
                    }}
                  />
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <Settings className="w-5 h-5 text-gray-400" />
                </button>

                {showSettings && (
                  <SettingsDropdown 
                    user={user}
                    profile={profile}
                    onClose={() => setShowSettings(false)}
                    onSignOut={handleSignOut}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard 
              icon={<ArrowDownRight className="w-5 h-5" />}
              label="You Owe"
              value={`₹${totalOwe.toFixed(0)}`}
              change="-12%"
              color="text-red-400"
              bgColor="from-red-500/10 to-pink-500/10"
            />
            <StatCard 
              icon={<ArrowUpRight className="w-5 h-5" />}
              label="You're Owed"
              value={`₹${totalOwed.toFixed(0)}`}
              change="+24%"
              color="text-green-400"
              bgColor="from-green-500/10 to-emerald-500/10"
            />
            <StatCard 
              icon={<DollarSign className="w-5 h-5" />}
              label="Total Spent"
              value={`₹${totalSpent.toFixed(0)}`}
              change="+8%"
              color="text-blue-400"
              bgColor="from-blue-500/10 to-cyan-500/10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Groups */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Your Groups</h2>
                <button 
                  onClick={() => setShowCreateGroup(true)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
                >
                  Create New
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {groups.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">No groups yet</p>
                  <button 
                    onClick={() => setShowCreateGroup(true)}
                    className="mt-4 px-6 py-2 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition"
                  >
                    Create Your First Group
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map(group => (
                    <GroupCard key={group.id} group={group} router={router} />
                  ))}
                </div>
              )}
            </div>

            {/* Balances */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Balances</h2>
                <button 
                  onClick={() => router.push('/balances')}
                  className="text-sm text-purple-400 hover:text-purple-300 transition"
                >
                  Settle Up
                </button>
              </div>

              <div className="space-y-3">
                {balances.length === 0 ? (
                  <div className="text-center py-8 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10">
                    <p className="text-gray-400 text-sm">All settled up! 🎉</p>
                  </div>
                ) : (
                  balances.map((balance, idx) => (
                    <BalanceItem key={idx} balance={balance} />
                  ))
                )}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                <p className="text-sm text-gray-400 mb-2">Net Balance</p>
                <p className={`text-2xl font-bold ${
                  totalOwed - totalOwe > 0 ? 'text-green-400' : totalOwed - totalOwe < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {totalOwed - totalOwe > 0 ? '+' : ''}₹{(totalOwed - totalOwe).toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Expenses */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Expenses</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10">
                <p className="text-gray-400">No expenses yet</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-white/10">
                      <tr>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Expense</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Group</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Paid By</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Date</th>
                        <th className="text-right px-6 py-4 text-xs font-medium text-gray-400 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{expense.category || '💰'}</span>
                              <span className="text-sm font-medium text-white">{expense.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">{expense.groups?.name || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{expense.paid_by?.name || 'You'}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-white">
                            ₹{Number(expense.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddExpense && (
        <AddExpenseModal 
          onClose={() => {
            setShowAddExpense(false);
            loadData();
          }} 
          groups={groups}
          userId={user?.id}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal 
          onClose={() => {
            setShowCreateGroup(false);
            loadData();
          }} 
          userId={user?.id}
        />
      )}

      {showAddReminder && (
        <AddReminderModal
          onClose={() => {
            setShowAddReminder(false);
            loadData();
          }}
          userId={user?.id}
        />
      )}
    </div>
  );
}

// Helper Components
function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, change, color, bgColor }: any) {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-br opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-all"></div>
      <div className={`relative bg-gradient-to-br ${bgColor} backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <span className={`text-sm font-medium ${color}`}>{change}</span>
        </div>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function GroupCard({ group, router }: any) {
  return (
    <div 
      className="relative group cursor-pointer"
      onClick={() => router.push(`/group/${group.id}`)}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${group.color || 'from-purple-500 to-pink-500'} opacity-20 rounded-2xl blur-xl group-hover:opacity-30 transition-all`}></div>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all hover:scale-105">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 bg-gradient-to-br ${group.color || 'from-purple-500 to-pink-500'} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
            {group.emoji || '💰'}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
        </div>
        <h3 className="font-bold text-white text-lg mb-2">{group.name}</h3>
        <p className="text-2xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
          ₹{group.total.toLocaleString()}
        </p>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span>{group.members || 0} members</span>
          </div>
          <span className="text-gray-400">{group.expenseCount || 0} expenses</span>
        </div>
      </div>
    </div>
  );
}

function BalanceItem({ balance }: any) {
  const isOwed = balance.type === 'owes-you';
  
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${isOwed ? 'from-green-500 to-emerald-500' : 'from-red-500 to-pink-500'} flex items-center justify-center text-white font-bold`}>
        {balance.avatar}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{balance.name}</p>
        <p className="text-xs text-gray-400">
          {isOwed ? 'owes you' : 'you owe'}
        </p>
      </div>
      <p className={`text-lg font-bold ${isOwed ? 'text-green-400' : 'text-red-400'}`}>
        {isOwed ? '+' : '-'}₹{balance.amount.toFixed(0)}
      </p>
    </div>
  );
}

// Notifications Dropdown
function NotificationsDropdown({ notifications, onClose, onAddReminder }: any) {
  return (
    <div className="absolute right-0 top-12 w-80 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-2xl z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Notifications</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No reminders yet</p>
          </div>
        ) : (
          notifications.map((notif: any) => (
            <div key={notif.id} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
              <p className="text-sm text-white font-medium">{notif.title}</p>
              <p className="text-xs text-gray-400 mt-1">{notif.message}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(notif.reminder_date).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onAddReminder}
        className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
      >
        + Set New Reminder
      </button>
    </div>
  );
}

// Settings Dropdown
function SettingsDropdown({ user, profile, onClose, onSignOut }: any) {
  const router = useRouter();

  return (
    <div className="absolute right-0 top-12 w-72 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-2xl z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Settings</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* User Profile Section */}
      <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
            {profile?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{profile?.name || 'User'}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            onClose();
            router.push('/profile');
          }}
          className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm transition-all"
        >
          View Profile
        </button>
      </div>

      {/* Settings Options */}
      <div className="space-y-2 mb-4">
        <button
          onClick={() => {
            onClose();
            router.push('/settings/account');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <Settings className="w-5 h-5 text-gray-400" />
          <span className="text-sm">Account Settings</span>
        </button>

        <button
          onClick={() => {
            onClose();
            router.push('/settings/notifications');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="text-sm">Notification Preferences</span>
        </button>

        <button
          onClick={() => {
            onClose();
            router.push('/settings/privacy');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <Shield className="w-5 h-5 text-gray-400" />
          <span className="text-sm">Privacy & Security</span>
        </button>
      </div>

      {/* Logout Button */}
      <button
        onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/20"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Logout</span>
      </button>
    </div>
  );
}

// Modals
function AddExpenseModal({ onClose, groups, userId }: any) {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '🍕',
    groupId: groups[0]?.id || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (!formData.title || !formData.amount || !formData.groupId) {
        throw new Error('Please fill in all required fields');
      }

      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          title: formData.title,
          amount: parseFloat(formData.amount),
          category: formData.category,
          group_id: formData.groupId,
          paid_by_id: userId,
          date: new Date().toISOString()
        });

      if (insertError) throw insertError;

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['🍕', '🚗', '🏠', '🎬', '🛒', '✈️', '💊', '📱'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-lg w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Expense Name</label>
            <input 
              type="text"
              placeholder="Dinner at restaurant"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
            <input 
              type="number"
              placeholder="₹1000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((emoji) => (
                <button 
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: emoji })}
                  className={`p-4 text-2xl bg-white/5 hover:bg-white/10 border rounded-xl transition-all ${
                    formData.category === emoji ? 'border-purple-500/50 bg-white/10' : 'border-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Group</label>
            <select
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition"
            >
              <option value="">Select a group</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>
                  {group.emoji} {group.name}
                </option>
              ))}
            </select>
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
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose, userId }: any) {
  const [formData, setFormData] = useState({
    name: '',
    emoji: '💰',
    description: '',
    color: 'from-purple-500 to-pink-500'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('=== Starting Group Creation ===');
      
      if (!formData.name.trim()) {
        throw new Error('Group name is required');
      }

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const groupData = {
        name: formData.name.trim(),
        emoji: formData.emoji,
        description: formData.description.trim() || null,
        color: formData.color,
        created_by: userId
      };

      console.log('1. Group data to insert:', groupData);

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert(groupData)
        .select()
        .single();

      console.log('2. Group creation response:', { group, error: groupError });

      if (groupError) {
        console.error('Group creation error:', groupError);
        throw new Error(groupError.message || 'Failed to create group');
      }

      if (!group) {
        throw new Error('Group created but no data returned');
      }

      console.log('3. Group created successfully:', group);

      // Add creator as admin member
      const memberData = {
        group_id: group.id,
        user_id: userId,
        role: 'admin'
      };

      console.log('4. Adding member with data:', memberData);

      const { error: memberError } = await supabase
        .from('group_members')
        .insert(memberData);

      console.log('5. Member addition response:', { error: memberError });

      if (memberError) {
        console.error('Member addition error:', memberError);
        // Try to delete the group if member addition fails
        await supabase.from('groups').delete().eq('id', group.id);
        throw new Error(`Failed to add you as group admin: ${memberError.message}`);
      }

      console.log('6. Group creation completed successfully!');
      
      // Success - close modal and refresh
      alert('Group created successfully!');
      onClose();
    } catch (err: any) {
      console.error('=== Group Creation Failed ===');
      console.error('Error:', err);
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const emojis = ['💰', '🏠', '✈️', '🎉', '🍕', '🎬', '🎓', '💼'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-md w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Group</h2>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Group Name</label>
            <input 
              type="text"
              placeholder="Trip to Goa"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Emoji</label>
            <div className="grid grid-cols-4 gap-2">
              {emojis.map((e) => (
                <button 
                  key={e}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji: e })}
                  className={`p-4 text-2xl bg-white/5 hover:bg-white/10 border rounded-xl transition-all ${
                    formData.emoji === e ? 'border-purple-500/50 bg-white/10' : 'border-white/10'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
            <textarea
              placeholder="Beach vacation with friends"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Theme Color</label>
            <select
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition"
            >
              <option value="from-purple-500 to-pink-500">Purple Pink</option>
              <option value="from-blue-500 to-cyan-500">Blue Cyan</option>
              <option value="from-green-500 to-emerald-500">Green Emerald</option>
              <option value="from-orange-500 to-red-500">Orange Red</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddReminderModal({ onClose, userId }: any) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    reminderDate: '',
    reminderTime: '12:00'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.title || !formData.reminderDate) {
        throw new Error('Title and date are required');
      }

      const reminderDateTime = new Date(`${formData.reminderDate}T${formData.reminderTime}`);

      const { error: insertError } = await supabase
        .from('reminders')
        .insert({
          user_id: userId,
          title: formData.title,
          message: formData.message,
          reminder_date: reminderDateTime.toISOString(),
          is_read: false
        });

      if (insertError) throw insertError;

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-md w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Set Reminder</h2>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input 
              type="text"
              placeholder="Pay rent to Riya"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Message (Optional)</label>
            <textarea
              placeholder="Don't forget to settle the balance"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
              <input 
                type="date"
                value={formData.reminderDate}
                onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
              <input 
                type="time"
                value={formData.reminderTime}
                onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition"
              />
            </div>
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
              {loading ? 'Setting...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}