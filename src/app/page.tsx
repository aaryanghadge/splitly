'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Users, Zap, ArrowRight, CircleDollarSign, PieChart, Check, TrendingUp, Receipt, Shield } from 'lucide-react';

export default function SplitlyLanding() {
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        ></div>
        <div 
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${-scrollY * 0.3}px)` }}
        ></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzRjMWQ5NSIgc3Ryb2tlLXdpZHRoPSIuNSIgb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-black/50 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div 
            onClick={() => router.push('/')}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:shadow-purple-500/80 transition-all group-hover:rotate-12">
              <CircleDollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Splitly
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105"
            >
              Get Started →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-32 px-6 relative">
        <div className="max-w-7xl mx-auto text-center">
         
          
          {/* Main Headline */}
          <h1 className="text-7xl md:text-8xl font-black mb-8 leading-tight tracking-tight">
            <span className="block text-white mb-2">One Tap.</span>
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-gradient">
              All Settled.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            The most aesthetic way to track shared expenses. 
            <br />
            <span className="text-gray-500">No awkward conversations. No math. Just vibes.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-20">
            <button 
              onClick={() => router.push('/dashboard')}
              className="group px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-105 flex items-center gap-2"
            >
              Start for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-white/5 backdrop-blur-sm text-white rounded-2xl font-semibold hover:bg-white/10 transition-all border border-white/10 hover:border-white/20">
              Watch Demo
            </button>
          </div>

          {/* Hero Dashboard Preview */}
          <div className="relative max-w-6xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-orange-500/30 blur-3xl -z-10 animate-pulse"></div>
            
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl">
              {/* Mini Navbar */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
                  <span className="text-sm text-gray-400">Aaryan's Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs text-gray-500">Live</span>
                </div>
              </div>

              {/* Dashboard Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <GlassDashboardCard 
                  emoji="🏖️"
                  title="Trip to Goa"
                  amount="₹15,240"
                  members={4}
                  trend="+12%"
                  color="from-blue-500 to-cyan-500"
                  featured={false}
                />
                <GlassDashboardCard 
                  emoji="🏠"
                  title="Flat Rent"
                  amount="₹32,000"
                  members={3}
                  trend="±0%"
                  color="from-purple-500 to-pink-500"
                  featured={true}
                />
                <GlassDashboardCard 
                  emoji="🍕"
                  title="Food Squad"
                  amount="₹8,450"
                  members={5}
                  trend="+28%"
                  color="from-orange-500 to-red-500"
                  featured={false}
                />
              </div>

              {/* Balance Summary */}
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">You're owed</p>
                      <p className="text-lg font-bold text-green-400">₹2,450</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-medium transition-all">
                    Settle Up
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Built different
            </h2>
            <p className="text-gray-400 text-xl">
              Everything you need. Nothing you don't.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <BentoCard 
              icon={<Zap className="w-7 h-7" />}
              title="Instant Split"
              description="Add an expense, we handle the math. See who owes what in real-time."
              gradient="from-yellow-500 to-orange-500"
              size="normal"
            />
            <BentoCard 
              icon={<Receipt className="w-7 h-7" />}
              title="Smart Categories"
              description="Track where money goes with emoji categories. 🍕 🏠 ✈️"
              gradient="from-purple-500 to-pink-500"
              size="normal"
            />
            <BentoCard 
              icon={<PieChart className="w-7 h-7" />}
              title="Visual Insights"
              description="Beautiful charts that actually make sense of your spending."
              gradient="from-cyan-500 to-blue-500"
              size="normal"
            />
            <BentoCard 
              icon={<Shield className="w-7 h-7" />}
              title="Privacy First"
              description="Your data stays yours. No tracking, no selling, no BS."
              gradient="from-green-500 to-emerald-500"
              size="wide"
            />
            <BentoCard 
              icon={<Users className="w-7 h-7" />}
              title="Group Magic"
              description="Create unlimited groups. Invite friends instantly."
              gradient="from-pink-500 to-rose-500"
              size="normal"
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-3xl border border-white/10 p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 -z-10"></div>
            
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-6">
                {[...Array(7)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold border-2 border-black shadow-lg -ml-4 first:ml-0 hover:scale-110 transition-transform cursor-pointer"
                    style={{ zIndex: 7 - i }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Join the movement
              </h3>
              <p className="text-gray-400 text-lg">
                10,000+ people already splitting smarter
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'No hidden fees', icon: Check },
                { label: 'Works offline', icon: Check },
                { label: 'Open source', icon: Check }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-white font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 blur-3xl -z-10"></div>
          
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 p-16 shadow-2xl">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Ready to vibe?
            </h2>
            <p className="text-gray-300 text-xl mb-10">
              Start splitting expenses in under 60 seconds
            </p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="group px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white text-lg rounded-2xl font-bold hover:shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-105 flex items-center gap-3 mx-auto"
            >
              Create Your First Group
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <CircleDollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Splitly</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2025 Splitly. Made with 💜 for gen-z
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

interface GlassDashboardCardProps {
  emoji: string;
  title: string;
  amount: string;
  members: number;
  trend: string;
  color: string;
  featured?: boolean;
}

function GlassDashboardCard({ 
  emoji, 
  title, 
  amount, 
  members, 
  trend, 
  color, 
  featured = false 
}: GlassDashboardCardProps) {
  return (
    <div className={`relative group cursor-pointer ${featured ? 'md:scale-105' : ''}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 rounded-2xl blur-xl group-hover:opacity-30 transition-all`}></div>
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all hover:scale-105">
        <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg`}>
          {emoji}
        </div>
        <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
        <p className="text-3xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
          {amount}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Users className="w-4 h-4" />
            <span>{members}</span>
          </div>
          <span className={`text-sm font-medium ${trend.includes('+') ? 'text-green-400' : trend.includes('-') ? 'text-red-400' : 'text-gray-400'}`}>
            {trend}
          </span>
        </div>
      </div>
    </div>
  );
}

interface BentoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  size: string;
}

function BentoCard({ icon, title, description, gradient, size }: BentoCardProps) {
  return (
    <div className={`group cursor-pointer ${size === 'wide' ? 'md:col-span-2' : ''}`}>
      <div className="relative h-full">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 rounded-3xl blur-xl group-hover:opacity-20 transition-all`}></div>
        <div className="relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all h-full hover:scale-105">
          <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
          <p className="text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}