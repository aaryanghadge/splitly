'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, PieChart as PieChartIcon, DollarSign, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getUserSpendingStats, getUserGroups } from '@/lib/supabaseClient';

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const [userStats, groups] = await Promise.all([
        getUserSpendingStats(),
        getUserGroups()
      ]);

      setStats(userStats);

      // Get all expenses across all groups for category analysis
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: user } = await supabase.auth.getUser();
      
      if (user.user) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('category, amount')
          .eq('paid_by', user.user.id);

        if (expenses) {
          const categoryTotals = expenses.reduce((acc: any, exp) => {
            const cat = exp.category || '🍕';
            acc[cat] = (acc[cat] || 0) + parseFloat(exp.amount);
            return acc;
          }, {});

          const chartData = Object.entries(categoryTotals).map(([category, total]: any) => ({
            name: category,
            value: total
          }));

          setCategoryData(chartData);
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const COLORS = ['#a855f7', '#ec4899', '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const topCategoryPercentage = stats?.topCategoryAmount && stats?.totalSpent 
    ? ((stats.topCategoryAmount / stats.totalSpent) * 100).toFixed(0)
    : 0;

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
              <h1 className="text-2xl font-bold text-white">Analytics</h1>
              <p className="text-sm text-gray-400">Your spending insights</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={<DollarSign className="w-5 h-5" />}
            label="Total Spent"
            value={`₹${stats?.totalSpent?.toLocaleString() || 0}`}
            color="text-purple-400"
            bgColor="from-purple-500/10 to-pink-500/10"
          />
          <StatCard 
            icon={<Receipt className="w-5 h-5" />}
            label="Total Expenses"
            value={stats?.expenseCount || 0}
            color="text-blue-400"
            bgColor="from-blue-500/10 to-cyan-500/10"
          />
          <StatCard 
            icon={<TrendingUp className="w-5 h-5" />}
            label="Top Category"
            value={stats?.topCategory || 'N/A'}
            color="text-orange-400"
            bgColor="from-orange-500/10 to-red-500/10"
          />
          <StatCard 
            icon={<PieChartIcon className="w-5 h-5" />}
            label="Categories"
            value={categoryData.length}
            color="text-green-400"
            bgColor="from-green-500/10 to-emerald-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Spending by Category Chart */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Spending by Category</h2>
            
            {categoryData.length === 0 ? (
              <div className="text-center py-12">
                <PieChartIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No expense data yet</p>
                <p className="text-sm text-gray-500 mt-2">Start adding expenses to see insights</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    }}
                    formatter={(value: any) => `₹${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">AI Insights 🤖</h2>
            
            <div className="space-y-4">
              {stats?.topCategory && topCategoryPercentage > 0 && (
                <InsightCard 
                  emoji="📊"
                  title="Top Spending Category"
                  description={`You're spending ${topCategoryPercentage}% on ${stats.topCategory} — that's your biggest expense category!`}
                  color="from-purple-500/20 to-pink-500/20"
                />
              )}

              {stats?.totalSpent > 10000 && (
                <InsightCard 
                  emoji="💰"
                  title="High Spending Alert"
                  description={`You've spent ₹${stats.totalSpent.toLocaleString()} total. Consider tracking your expenses more closely.`}
                  color="from-orange-500/20 to-red-500/20"
                />
              )}

              {stats?.expenseCount > 20 && (
                <InsightCard 
                  emoji="🎯"
                  title="Active User"
                  description={`You've logged ${stats.expenseCount} expenses! You're great at tracking your spending.`}
                  color="from-green-500/20 to-emerald-500/20"
                />
              )}

              {categoryData.length > 5 && (
                <InsightCard 
                  emoji="🌈"
                  title="Diverse Spending"
                  description={`You're spending across ${categoryData.length} different categories. Nice variety!`}
                  color="from-blue-500/20 to-cyan-500/20"
                />
              )}

              {stats?.expenseCount === 0 && (
                <InsightCard 
                  emoji="🚀"
                  title="Get Started"
                  description="Start adding expenses to unlock personalized insights about your spending habits!"
                  color="from-purple-500/20 to-pink-500/20"
                />
              )}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Category Breakdown</h2>
            
            <div className="space-y-3">
              {categoryData
                .sort((a, b) => b.value - a.value)
                .map((category, index) => {
                  const percentage = ((category.value / stats.totalSpent) * 100).toFixed(1);
                  return (
                    <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.name}</span>
                          <span className="text-white font-semibold">Category {index + 1}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">₹{category.value.toLocaleString()}</p>
                          <p className="text-sm text-gray-400">{percentage}% of total</p>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>
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

function InsightCard({ emoji, title, description, color }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} backdrop-blur-xl rounded-2xl p-5 border border-white/10`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{emoji}</span>
        <div>
          <h3 className="font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-300">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Receipt({ className }: any) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}