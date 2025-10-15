'use client';

import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useGroups() {
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  const { data: groups, error, mutate } = useSWR(
    user ? ['groups', user.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          emoji,
          description,
          color,
          created_at,
          group_members!inner (role),
          expenses (id)
        `)
        .eq('group_members.user_id', user.id);

      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    groups: groups || [],
    loading: !error && !groups,
    error,
    mutate,
  };
}