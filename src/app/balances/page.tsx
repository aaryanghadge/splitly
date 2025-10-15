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
  Check
} from 'lucide-react';

export default function BalancesPage() {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      const { data: balancesData } = await supabase
        .from('balances')
        .select(`
          *,
          fromUser:profiles!balances_from_user_id_fkey(name),
          toUser:profiles!balances_to_user_id_fkey(name)
        `)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      const transformedBalances = (balancesData || []).map(balance => {
        const isFromUser = balance.from_user_id === user.id;
        return {
          ...balance,
          type: isFromUser ? 'you-owe' : 'owes-you',
          amount: Number(balance.amount || 0),
          name: isFromUser ? balance.toUser?.name : balance.fromUser?.name,
          avatar: isFromUser ? balance.toUser?.name?.[0] : balance.fromUser?.name?.[0],
          upiId: `${isFromUser ? balance.toUser?.name : balance.fromUser?.name}@upi`.toLowerCase().replace(/\s/g, '')
        };
      });

      setBalances(transformedBalances);
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading balances...</div>
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
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
      </div>

      <header className="sticky top-0 bg-black/50 backdrop-blur-xl border-b border-white/10 z-40">
        <div className="max-w-7xl mx-auto px-8 py-4">
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

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Net Balance Card */}
        <div className="mb-8">
          <div className={`relative p-8 rounded-3xl border ${
            netBalance > 0 
              ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20' 
              : netBalance < 0
              ? 'bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/20'
              : 'bg-gradient-to-br from-white/5 to-white/0 border-white/10'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Net Balance</p>
                <p className={`text-5xl font-black ${
                  netBalance > 0 ? 'text-green-400' : netBalance < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {netBalance > 0 ? '+' : netBalance < 0 ? '-' : ''}₹{Math.abs(netBalance).toFixed(0)}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {netBalance > 0 
                    ? "You're getting back overall" 
                    : netBalance < 0 
                    ? "You owe overall" 
                    : "All settled up!"}
                </p>
              </div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                netBalance > 0 
                  ? 'bg-green-500/20' 
                  : netBalance < 0 
                  ? 'bg-red-500/20' 
                  : 'bg-white/10'
              }`}>
                {netBalance === 0 ? (
                  <CheckCircle className="w-10 h-10 text-green-400" />
                ) : (
                  <TrendingUp className={`w-10 h-10 ${
                    netBalance > 0 ? 'text-green-400' : 'text-red-400'
                  }`} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">You Owe</p>
                <p className="text-3xl font-bold text-red-400">₹{totalYouOwe.toFixed(0)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{youOwe.length} people</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">You're Owed</p>
                <p className="text-3xl font-bold text-green-400">₹{totalOwedToYou.toFixed(0)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{owedToYou.length} people</p>
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
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">All Settled Up!</h3>
            <p className="text-gray-400">You don't owe anyone and nobody owes you.</p>
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
  const color = balance.color || (isOwed ? 'from-green-500 to-emerald-500' : 'from-red-500 to-pink-500');

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-xl`}>
            {balance.avatar || 'U'}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{balance.name || 'User'}</h3>
            <p className="text-xs text-gray-500 mt-1">UPI: {balance.upiId}</p>
          </div>
        </div>

        <div className="text-right flex items-center gap-4">
          <div>
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
              className="px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105 flex items-center gap-2"
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
  
  const upiLink = `upi://pay?pa=${balance.upiId}&pn=${balance.name}&am=${balance.amount}&cu=INR&tn=Splitly Settlement`;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(balance.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayWithUPI = () => {
    window.location.href = upiLink;
  };

  const color = balance.color || 'from-red-500 to-pink-500';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 max-w-md w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${color} mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl`}>
            {balance.avatar}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Pay {balance.name}</h2>
          <p className="text-gray-400 text-sm">Settle your balance of</p>
          <p className="text-4xl font-black text-purple-400 mt-2">₹{balance.amount.toFixed(0)}</p>
        </div>

        {/* UPI ID */}
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
        </div>

        {/* Payment Options */}
        <div className="space-y-3">
          <button
            onClick={handlePayWithUPI}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Pay with UPI
          </button>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          You'll be redirected to your UPI app to complete the payment
        </p>
      </div>
    </div>
  );
}