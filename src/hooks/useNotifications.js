import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export function useNotifications(session) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!session) { setNotifications([]); return; }
    setLoading(true);
    try {
      const [{ data: evNotifs }, { data: annonceNotifs }] = await Promise.all([
        supabase
          .from('notifications')
          .select('id, type, title, body, link_id, link_type, is_read, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('annonce_notifications')
          .select('id, type, title, content, id_produit, is_read, created_at')
          .eq('id_profiles', session.user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const mapped = [
        ...(evNotifs || []).map(n => ({ ...n, _source: 'notifications' })),
        ...(annonceNotifs || []).map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.content,
          link_id: n.id_produit,
          link_type: 'product',
          is_read: n.is_read,
          created_at: n.created_at,
          _source: 'annonce_notifications',
        })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setNotifications(mapped);
    } catch (err) {
      console.error('useNotifications fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) { setNotifications([]); return; }

    fetchAll();

    const channel = supabase
      .channel('notifs_unified_' + session.user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, () => fetchAll())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'annonce_notifications',
        filter: `id_profiles=eq.${session.user.id}`,
      }, () => fetchAll())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, fetchAll]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id, source) => {
    const table = source === 'notifications' ? 'notifications' : 'annonce_notifications';
    await supabase.from(table).update({ is_read: true }).eq('id', id);
    setNotifications(prev =>
      prev.map(n => (n.id === id && n._source === source) ? { ...n, is_read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!session) return;
    await Promise.all([
      supabase.from('notifications').update({ is_read: true })
        .eq('user_id', session.user.id).eq('is_read', false),
      supabase.from('annonce_notifications').update({ is_read: true })
        .eq('id_profiles', session.user.id).eq('is_read', false),
    ]);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, loading };
}
