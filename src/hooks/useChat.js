import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

export function useChat() {
  const getOrCreateConversation = async (currentUserId, otherUserId, productId) => {
    try {
      // Try to find existing conversation between these two users for this product
      const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${currentUserId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${currentUserId})`
        )
        .eq('product_id', productId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing.id;

      // Create new conversation
      const { data: created, error: insertError } = await supabase
        .from('conversations')
        .insert({
          participant_1: currentUserId,
          participant_2: otherUserId,
          product_id: productId,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return created.id;
    } catch (err) {
      toast.error('Eroare la deschiderea conversației');
      console.error(err);
      return null;
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      toast.error('Eroare la încărcarea mesajelor');
      console.error(err);
      return [];
    }
  };

  const sendMessage = async (conversationId, senderId, content) => {
    try {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: senderId, content });

      if (msgError) throw msgError;

      const { error: convError } = await supabase
        .from('conversations')
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (convError) throw convError;
    } catch (err) {
      toast.error('Eroare la trimiterea mesajului');
      console.error(err);
    }
  };

  const subscribeToMessages = (conversationId, callback) => {
    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => callback(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const fetchConversations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('conversations_with_profiles')
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const convs = data || [];
      if (convs.length === 0) return [];

      // Single query for all unread counts instead of one per conversation
      const convIds = convs.map(c => c.id);
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .neq('sender_id', userId)
        .is('read_at', null);

      const unreadMap = {};
      (unreadMsgs || []).forEach(m => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      });

      return convs.map(conv => ({ ...conv, unread_count: unreadMap[conv.id] || 0 }));
    } catch (err) {
      toast.error('Eroare la încărcarea conversațiilor');
      return [];
    }
  };

  const markMessagesAsRead = async (conversationId, userId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (error) throw error;
    } catch (err) {
      console.error('Eroare la marcarea mesajelor ca citite:', err);
    }
  };

  const getUnreadCount = async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_unread_count', { user_id: userId });
      if (error) throw error;
      return data || 0;
    } catch (err) {
      console.error('Eroare la obținerea numărului de mesaje necitite:', err);
      return 0;
    }
  };

  return {
    getOrCreateConversation,
    fetchMessages,
    sendMessage,
    subscribeToMessages,
    fetchConversations,
    markMessagesAsRead,
    getUnreadCount,
  };
}
