'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const useGroups = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from('groups')
          .select(`
            id,
            name,
            emoji,
            description,
            color,
            created_by,
            group_members!inner(role, user_id),
            expenses (id)
          `)
          .eq('group_members.user_id', user.id);

        if (error) throw error;
        setGroups(data || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  return { groups, loading, error };
};