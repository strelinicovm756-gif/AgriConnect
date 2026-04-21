import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export function useFollow(session, producerId) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!producerId) return;

    // Get followers count
    const { count } = await supabase
      .from('producer_follows')
      .select('*', { count: 'exact', head: true })
      .eq('producer_id', producerId);
    setFollowersCount(count || 0);

    // Check if current user follows
    if (!session) return;
    const { data } = await supabase
      .from('producer_follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('producer_id', producerId)
      .maybeSingle();
    setIsFollowing(!!data);
  }, [session, producerId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const toggleFollow = async () => {
    if (!session) return false; // caller should redirect to login
    setLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('producer_follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('producer_id', producerId);
        setIsFollowing(false);
        setFollowersCount(c => Math.max(0, c - 1));
      } else {
        await supabase.from('producer_follows')
          .insert({ follower_id: session.user.id, producer_id: producerId });
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
      }
      return true;
    } catch (err) {
      console.error('toggleFollow error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, followersCount, loading, toggleFollow };
}
