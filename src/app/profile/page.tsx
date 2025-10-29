'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, User, Mail, Calendar, Edit2, Save, X } from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    phone: ''
  });
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create one with data from auth metadata
      if (error || !profileData) {
        const newProfile = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString()
        };

        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        setProfile(createdProfile || newProfile);
        setFormData({
          name: createdProfile?.name || newProfile.name,
          bio: createdProfile?.bio || '',
          phone: createdProfile?.phone || ''
        });
      } else {
        setProfile(profileData);
        setFormData({
          name: profileData?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          bio: profileData?.bio || '',
          phone: profileData?.phone || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          bio: formData.bio,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      await loadProfile();
      setEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-white">Profile</h1>
              <p className="text-sm text-gray-400">Manage your account</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8">
          {/* Profile Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-4xl">
                {profile?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">{profile?.name || 'User'}</h2>
                <p className="text-gray-400">{user?.email}</p>
              </div>
            </div>
            
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: profile?.name || '',
                      bio: profile?.bio || '',
                      phone: profile?.phone || ''
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
                />
              ) : (
                <p className="text-lg text-white">{profile?.name || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <p className="text-lg text-gray-400">{user?.email}</p>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
                />
              ) : (
                <p className="text-lg text-white">{profile?.phone || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              {editing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
                />
              ) : (
                <p className="text-lg text-white">{profile?.bio || 'No bio yet'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Member Since
              </label>
              <p className="text-lg text-white">
                {new Date(user?.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl border border-red-500/20 p-8">
          <h3 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h3>
          <p className="text-gray-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                alert('Account deletion coming soon');
              }
            }}
            className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-all border border-red-500/20"
          >
            Delete Account
          </button>
        </div>
      </main>
    </div>
  );
}