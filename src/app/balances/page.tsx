'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  ArrowLeft,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Send,
  Copy,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function BalancesPage() {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadBalancesFromExpenses();
  }, []);

  const loadBalancesFromExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error('User error:', userError);
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // Get user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      // Get all groups where user is a member
      const { data: groupMembers, error: gmError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUser.id);

      console.log('Group members:', groupMembers);

      if (gmError) {
        console.error('Group members error:', gmError);
        setError('Error loading group memberships: ' + gmError.message);
        setLoading(false);
        return;
      }

      if (!groupMembers || groupMembers.length === 0) {
        console.log('No groups found for user');
        setDebugInfo({ message: 'No groups found', groupMembers });
        setLoading(false);
        return;
      }

      const groupIds = groupMembers.map(gm => gm.group_id);

      // Try simpler query first - just get expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      console.log('Expenses (simple query):', expenses);
      console.log('Expenses error:', expensesError);

      if (expensesError) {
        console.error('Expenses error details:', expensesError);
        setError('Error loading expenses: ' + expensesError.message);
        setDebugInfo({
          error: expensesError,
          groupIds,
          message: 'Failed to load expenses'
        });
        setLoading(false);
        return;
      }

      if (!expenses || expenses.length === 0) {
        console.log('No expenses found');
        setDebugInfo({ 
          message: 'No expenses found',
          groupIds,
          groupMembers 
        });
        setLoading(false);
        return;
      }

      // Now get expense splits for these expenses
      const expenseIds = expenses.map(e => e.id);
      
      const { data: expenseSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .select('*')
        .in('expense_id', expenseIds);

      console.log('Expense splits:', expenseSplits);

      if (splitsError) {
        console.error('Splits error:', splitsError);
        setError('Error loading expense splits: ' + splitsError.message);
        setLoading(false);
        return;
      }

      // Get all unique user IDs from splits
      const userIds = [...new Set(expenseSplits?.map(s => s.user_id) || [])];
      
      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);

      console.log('Profiles:', profiles);

      if (profilesError) {
        console.error('Profiles error:', profilesError);
      }

      // Get group names
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name')
        .in('id', groupIds);

      console.log('Groups:', groups);

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);
      const groupMap = new Map(groups?.map(g => [g.id, g.name]) || []);
      const splitsMap = new Map<string, any[]>();
      
      expenseSplits?.forEach(split => {
        if (!splitsMap.has(split.expense_id)) {
          splitsMap.set(split.expense_id, []);
        }
        splitsMap.get(split.expense_id)?.push(split);
      });

      // Calculate balances
      const balanceMap = new Map<string, {
        userId: string,
        userName: string,
        amount: number,
        groups: Set<string>,
        expenseCount: number
      }>();

      expenses.forEach(expense => {
        const paidByUserId = expense.paid_by;
        const splits = splitsMap.get(expense.id) || [];
        const groupName = groupMap.get(expense.group_id) || 'Unknown Group';
        
        if (!paidByUserId) return;

        // Process each split
        splits.forEach((split: any) => {
          const splitUserId = split.user_id;
          const splitAmount = Number(split.amount || 0);
          const splitUserName = profileMap.get(splitUserId) || 'Unknown';

          // Skip if split amount is 0
          if (splitAmount === 0) return;

          // If current user paid and someone else has a split
          if (paidByUserId === currentUser.id && splitUserId !== currentUser.id) {
            // Someone owes current user
            const key = splitUserId;
            
            if (!balanceMap.has(key)) {
              balanceMap.set(key, {
                userId: splitUserId,
                userName: splitUserName,
                amount: 0,
                groups: new Set(),
                expenseCount: 0
              });
            }
            
            const balance = balanceMap.get(key)!;
            balance.amount += splitAmount;
            balance.groups.add(groupName);
            balance.expenseCount++;
          } 
          // If someone else paid and current user has a split
          else if (paidByUserId !== currentUser.id && splitUserId === currentUser.id) {
            // Current user owes the payer
            const key = paidByUserId;
            const payerName = profileMap.get(paidByUserId) || 'Unknown';
            
            if (!balanceMap.has(key)) {
              balanceMap.set(key, {
                userId: paidByUserId,
                userName: payerName,
                amount: 0,
                groups: new Set(),
                expenseCount: 0
              });
            }
            
            const balance = balanceMap.get(key)!;
            balance.amount -= splitAmount; // Negative because user owes
            balance.groups.add(groupName);
            balance.expenseCount++;
          }
        });
      });

      console.log('Balance map:', balanceMap);

      // Convert balance map to array
      const balancesArray = Array.from(balanceMap.entries())
        .filter(([_, balance]) => Math.abs(balance.amount) >= 0.01)
        .map(([userId, balance]) => {
          const isOwed = balance.amount > 0;
          const colorPalette = [
            'from-orange-500 to-red-500',
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-purple-500 to-pink-500',
            'from-yellow-500 to-orange-500',
            'from-indigo-500 to-purple-500',
            'from-pink-500 to-rose-500',
            'from-teal-500 to-cyan-500'
          ];
          
          const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
          
          return {
            id: userId,
            userId: userId,
            name: balance.userName,
            avatar: balance.userName.charAt(0).toUpperCase(),
            amount: Math.abs(balance.amount),
            type: isOwed ? 'owes-you' : 'you-owe',
            color: randomColor,
            upiId: `${balance.userName.toLowerCase().replace(/\s+/g, '')}@paytm`,
            groups: Array.from(balance.groups),
            expenseCount: balance.expenseCount
          };
        })
        .sort((a, b) => b.amount - a.amount);

      console.log('Final balances array:', balancesArray);

      setBalances(balancesArray);
      setDebugInfo({
        totalExpenses: expenses.length,
        groupsCount: groupIds.length,
        balancesCount: balancesArray.length,
        expensesCount: expenses.length,
        splitsCount: expenseSplits?.length || 0
      });

    } catch (error: any) {
      console.error('Error loading balances:', error);
      setError(error.message || 'An unexpected error occurred');
      setDebugInfo({
        errorMessage: error.message,
        errorStack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
          <div className="text-white text-xl">Calculating balances...</div>
          <p className="text-gray-400 text-sm mt-2">Loading your expense data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-2xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          
          {debugInfo && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-left">
              <p className="text-xs text-gray-400 mb-2">Debug Info:</p>
              <pre className="text-xs text-gray-300 overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
          
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const youOwe = balances.filter(b => b.type === 'you-owe');
  const owedToYou = balances.filter(b => b.type === 'owes-you');
  
  const totalYouOwe = youOwe.reduce((sum, b) => sum + b.amount, 0);
  const totalOwedToYou = owedToYou.reduce((sum, b) => sum + b.amount, 0);
  const netBalance = totalOwedToYou - totalYouOwe;

  const handlePayNow = (balance: any) => {
    setSelectedPayment(balance);
    setShowPaymentModal(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 bg-black/50 backdrop-blur-xl border-b border-white/10 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Balances</h1>
              <p className="text-sm text-gray-400">Settle up with friends</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-gray-400 mb-2">Debug Info:</p>
            <pre className="text-xs text-gray-300 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Net Balance Card */}
        <div className="mb-8">
          <div className={`relative p-8 rounded-3xl border transition-all ${
            netBalance > 0 
              ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20' 
              : netBalance < 0
              ? 'bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/20'
              : 'bg-gradient-to-br from-white/5 to-white/0 border-white/10'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Net Balance</p>
                <p className={`text-4xl sm:text-5xl font-black ${
                  netBalance > 0 ? 'text-green-400' : netBalance < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {netBalance > 0 ? '+' : netBalance < 0 ? '-' : ''}₹{Math.abs(netBalance).toFixed(0)}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {netBalance > 0 
                    ? "You're getting back overall 🎉" 
                    : netBalance < 0 
                    ? "You owe overall 💸" 
                    : "All settled up! ✨"}
                </p>
              </div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                netBalance > 0 
                  ? 'bg-green-500/20' 
                  : netBalance < 0 
                  ? 'bg-red-500/20' 
                  : 'bg-white/10'
              }`}>
                {Math.abs(netBalance) < 1 ? (
                  <CheckCircle className="w-10 h-10 text-green-400" />
                ) : (
                  <TrendingUp className={`w-10 h-10 ${
                    netBalance > 0 ? 'text-green-400 rotate-0' : 'text-red-400 rotate-180'
                  }`} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-6 border border-red-500/20 hover:border-red-500/40 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">You Owe</p>
                <p className="text-3xl font-bold text-red-400">₹{totalYouOwe.toFixed(0)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {youOwe.length} {youOwe.length === 1 ? 'person' : 'people'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20 hover:border-green-500/40 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">You're Owed</p>
                <p className="text-3xl font-bold text-green-400">₹{totalOwedToYou.toFixed(0)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {owedToYou.length} {owedToYou.length === 1 ? 'person' : 'people'}
            </p>
          </div>
        </div>

        {/* You Owe Section */}
        {youOwe.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-red-400" />
              You Owe
            </h2>
            <div className="space-y-3">
              {youOwe.map(balance => (
                <BalanceCard 
                  key={balance.id} 
                  balance={balance} 
                  onPayNow={() => handlePayNow(balance)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Owed To You Section */}
        {owedToYou.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-green-400" />
              Owed To You
            </h2>
            <div className="space-y-3">
              {owedToYou.map(balance => (
                <BalanceCard 
                  key={balance.id} 
                  balance={balance}
                  onPayNow={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Settled */}
        {balances.length === 0 && (
          <div className="text-center py-20">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
              <CheckCircle className="relative w-20 h-20 text-green-400 mx-auto" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">All Settled Up!</h3>
            <p className="text-gray-400 mb-6">You don't owe anyone and nobody owes you.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <PaymentModal 
          balance={selectedPayment}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
}

function BalanceCard({ balance, onPayNow }: any) {
  const isOwed = balance.type === 'owes-you';

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02]">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${balance.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
            {balance.avatar}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{balance.name}</h3>
            <p className="text-sm text-gray-400">{balance.groups.join(', ')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {balance.expenseCount} {balance.expenseCount === 1 ? 'expense' : 'expenses'} • UPI: {balance.upiId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`text-3xl font-black ${isOwed ? 'text-green-400' : 'text-red-400'}`}>
              {isOwed ? '+' : '-'}₹{balance.amount.toFixed(0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isOwed ? 'owes you' : 'you owe'}
            </p>
          </div>

          {!isOwed && (
            <button
              onClick={onPayNow}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105 flex items-center gap-2 whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              Pay Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ balance, onClose }: any) {
  const [copied, setCopied] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);
  
  const upiLink = `upi://pay?pa=${balance.upiId}&pn=${encodeURIComponent(balance.name)}&am=${balance.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Splitly Settlement')}`;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(balance.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayWithUPI = () => {
    setPaymentSent(true);
    window.location.href = upiLink;
    
    setTimeout(() => {
      if (document.hasFocus()) {
        alert('Please open your UPI app and pay to: ' + balance.upiId);
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-md w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition text-2xl"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${balance.color} mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
            {balance.avatar}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Pay {balance.name}</h2>
          <p className="text-gray-400 text-sm">Settle your balance of</p>
          <p className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mt-2">
            ₹{balance.amount.toFixed(0)}
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
          <p className="text-xs text-gray-400 mb-2">UPI ID</p>
          <div className="flex items-center justify-between">
            <p className="text-white font-medium">{balance.upiId}</p>
            <button
              onClick={handleCopyUPI}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          {copied && <p className="text-xs text-green-400 mt-2">UPI ID copied!</p>}
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePayWithUPI}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            {paymentSent ? 'Opening UPI App...' : 'Pay with UPI'}
          </button>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-xs text-gray-400 text-center">
            💡 You'll be redirected to your UPI app to complete the payment
          </p>
        </div>
      </div>
    </div>
  );
}