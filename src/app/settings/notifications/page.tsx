'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Mail, MessageSquare, AlertCircle } from 'lucide-react';

export default function NotificationSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    expenseAdded: true,
    expenseUpdated: true,
    paymentReceived: true,
    groupInvites: true,
    reminders: true,
    weeklyDigest: false,
    marketingEmails: false
  });

  const handleToggle = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const handleSave = () => {
    // TODO: Save to backend
    alert('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
      </div>

      <header className="sticky top-0 bg-black/50 backdrop-blur-xl border-b border-white/10 z-40">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
              <p className="text-sm text-gray-400">Manage how you receive notifications</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8">
          
          {/* Notification Channels */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Channels
            </h2>
            
            <SettingToggle
              icon={<Mail className="w-5 h-5" />}
              title="Email Notifications"
              description="Receive notifications via email"
              checked={settings.emailNotifications}
              onChange={() => handleToggle('emailNotifications')}
            />
            
            <SettingToggle
              icon={<MessageSquare className="w-5 h-5" />}
              title="Push Notifications"
              description="Receive push notifications on your device"
              checked={settings.pushNotifications}
              onChange={() => handleToggle('pushNotifications')}
            />
          </div>

          {/* Activity Notifications */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Activity Notifications
            </h2>
            
            <SettingToggle
              title="New Expense Added"
              description="Get notified when someone adds an expense to your group"
              checked={settings.expenseAdded}
              onChange={() => handleToggle('expenseAdded')}
            />
            
            <SettingToggle
              title="Expense Updated"
              description="Get notified when an expense is modified"
              checked={settings.expenseUpdated}
              onChange={() => handleToggle('expenseUpdated')}
            />
            
            <SettingToggle
              title="Payment Received"
              description="Get notified when someone settles up with you"
              checked={settings.paymentReceived}
              onChange={() => handleToggle('paymentReceived')}
            />
            
            <SettingToggle
              title="Group Invites"
              description="Get notified when you're added to a new group"
              checked={settings.groupInvites}
              onChange={() => handleToggle('groupInvites')}
            />
            
            <SettingToggle
              title="Payment Reminders"
              description="Get reminded about pending payments"
              checked={settings.reminders}
              onChange={() => handleToggle('reminders')}
            />
          </div>

          {/* Digest & Marketing */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Digest & Updates</h2>
            
            <SettingToggle
              title="Weekly Digest"
              description="Receive a weekly summary of your expenses"
              checked={settings.weeklyDigest}
              onChange={() => handleToggle('weeklyDigest')}
            />
            
            <SettingToggle
              title="Marketing Emails"
              description="Receive updates about new features and tips"
              checked={settings.marketingEmails}
              onChange={() => handleToggle('marketingEmails')}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Save Settings
          </button>
        </div>
      </main>
    </div>
  );
}

function SettingToggle({ icon, title, description, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all mb-2">
      <div className="flex items-start gap-3 flex-1">
        {icon && <div className="text-gray-400 mt-1">{icon}</div>}
        <div>
          <h3 className="font-medium text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-all ${
          checked ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/10'
        }`}
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}