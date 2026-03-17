import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useChat } from '../hooks/useChat';
import { getColorForName } from '../lib/utils';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { MessageSquare, ChevronLeft } from 'lucide-react';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ChatPage({ session, onNavigate }) {
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const unsubRef = useRef(null);
  const selectedConvRef = useRef(null);
  const presenceChannelRef = useRef(null);

  const { fetchConversations, fetchMessages, sendMessage, subscribeToMessages, markMessagesAsRead } = useChat();

  useEffect(() => {
    if (!session) { onNavigate('login'); return; }
    loadConversations();
  }, [session]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    const data = await fetchConversations(session.user.id);
    setConversations(data);
    setLoadingConvs(false);
  };

  const selectConversation = async (conv) => {
    if (selectedConv?.id === conv.id) return;
    if (loadingMsgs) return;

    // Cleanup previous subscription BEFORE setting new state
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    setSelectedConv(conv);
    setShowMobileThread(true);
    setMessages([]);
    setLoadingMsgs(true);

    const msgs = await fetchMessages(conv.id);
    setMessages(msgs);
    await markMessagesAsRead(conv.id, session.user.id);
    setLoadingMsgs(false);

    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
    );

    // Subscribe with convId captured in closure — NOT selectedConv
    const convId = conv.id;
    unsubRef.current = subscribeToMessages(convId, (newMsg) => {
      setMessages(prev => {
        const hasOptimistic = prev.some(
          m => m.id.startsWith('opt_') &&
               m.sender_id === newMsg.sender_id &&
               m.content === newMsg.content
        );
        if (hasOptimistic) {
          return prev.map(m =>
            m.id.startsWith('opt_') &&
            m.sender_id === newMsg.sender_id &&
            m.content === newMsg.content
              ? newMsg
              : m
          );
        }
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      markMessagesAsRead(convId, session.user.id);
    });
  };

  useEffect(() => {
    selectedConvRef.current = selectedConv;
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedConv) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [selectedConv?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const channel = supabase.channel('online_users', {
      config: { presence: { key: session.user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set(Object.keys(state));
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleSend = async () => {
    const conv = selectedConvRef.current;
    const content = inputValue.trim();
    if (!content || !conv || sending) return;

    setSending(true);
    setInputValue('');

    const optimistic = {
      id: `opt_${Date.now()}`,
      conversation_id: conv.id,
      sender_id: session.user.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages(prev => [...prev, optimistic]);

    await sendMessage(conv.id, session.user.id, content);

    setConversations(prev =>
      prev.map(c => c.id === conv.id
        ? { ...c, last_message: content, last_message_at: new Date().toISOString() }
        : c
      ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
    );

    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!session) return null;

  // Determine the "other" participant name for a conversation
  const getOtherName = (conv) => {
    if (!conv) return '';
    if (conv.participant_1 === session.user.id) return conv.participant_2_name || 'User';
    return conv.participant_1_name || 'User';
  };

  const getOtherInitial = (conv) => getOtherName(conv).charAt(0).toUpperCase() || '?';

  const getOtherId = (conv) => {
    if (!conv) return null;
    return conv.participant_1 === session.user.id
      ? conv.participant_2
      : conv.participant_1;
  };

  return (
    <>
    <style>{`
      .chat-scroll::-webkit-scrollbar { width: 4px; }
      .chat-scroll::-webkit-scrollbar-track { background: transparent; }
      .chat-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
      .chat-scroll:hover::-webkit-scrollbar-thumb { background: #10b981; }
      .chat-scroll { scrollbar-width: thin; scrollbar-color: #e5e7eb transparent; }
      .chat-scroll:hover { scrollbar-color: #10b981 transparent; }
    `}</style>
    <div className="overflow-hidden h-[calc(100vh-64px)] bg-gray-50 flex flex-col overflow-hidden">
      <div className=" flex-1 max-w-6xl w-full mx-auto px-4 py-4 flex flex-col min-h-0">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-10">
          <div className="grid lg:grid-cols-3 h-full min-h-0 flex-1">

            {/* Sidebar */}
            <div className={`border-r border-gray-100 flex flex-col min-h-0 overflow-hidden ${showMobileThread ? 'hidden lg:flex' : 'flex'}`}>
              <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} className="text-emerald-600" />
                  My messages
                </h1>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 chat-scroll">
                {loadingConvs ? (
                  <div className="flex items-center justify-center py-16">
                    <Metronome size="30" speed="1.6" color="#059669" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <MessageSquare size={40} className="text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium text-sm">No conversations</p>
                    <p className="text-gray-400 text-xs mt-1">Your messages will appear here</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {conversations.map((conv) => {
                      const otherName = getOtherName(conv);
                      const isActive = selectedConv?.id === conv.id;
                      const unread = conv.unread_count || 0;

                      return (
                        <button
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className={`w-full px-4 py-3.5 flex items-start gap-3 transition text-left border-l-4 ${
                            isActive
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 uppercase"
                            style={{ background: getColorForName(getOtherId(conv)) }}
                          >
                            {otherName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                                {otherName}
                              </p>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(conv.last_message_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs text-emerald-600 truncate font-medium flex-1 min-w-0">{conv.product_name}</p>
                              {onlineUsers.has(getOtherId(conv)) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5 min-w-0">
                              <p className={`text-xs truncate flex-1 min-w-0 ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                {conv.last_message || 'New conversation'}
                              </p>
                              {unread > 0 && (
                                <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                                  {unread > 9 ? '9+' : unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Thread panel */}
            <div className={`col-span-2 flex flex-col min-h-0 overflow-hidden ${!showMobileThread ? 'hidden lg:flex' : 'flex'}`}>
              {!selectedConv ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <MessageSquare size={48} className="text-gray-200 mb-4" />
                  <p className="text-gray-500 font-medium">Select a conversation</p>
                  <p className="text-gray-400 text-sm mt-1">Choose a conversation from the list on the left</p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
                    {/* Contact row */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowMobileThread(false)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full transition"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 uppercase shadow-sm"
                        style={{ background: getColorForName(getOtherId(selectedConv)) }}
                      >
                        {getOtherInitial(selectedConv)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {getOtherName(selectedConv)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {onlineUsers.has(getOtherId(selectedConv)) ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                              <span className="text-xs text-emerald-500 font-medium">online</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 truncate">
                              {selectedConv.product_name || 'Direct conversation'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-1 chat-scroll">
                    {loadingMsgs ? (
                      <div className="flex items-center justify-center h-full">
                        <Metronome size="30" speed="1.6" color="#059669" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare size={36} className="text-gray-200 mb-3" />
                        <p className="text-gray-400 text-sm font-medium">No messages yet</p>
                        <p className="text-gray-300 text-xs mt-1">Send the first message!</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isOwn = msg.sender_id === session.user.id;
                        const prevMsg = messages[idx - 1];
                        const showDateSep = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);

                        return (
                          <div key={msg.id}>
                            {showDateSep && (
                              <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-gray-100" />
                                <span className="text-[11px] text-gray-400 font-medium px-2">{formatDateLabel(msg.created_at)}</span>
                                <div className="flex-1 h-px bg-gray-100" />
                              </div>
                            )}
                            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`} style={{ maxWidth: '65%' }}>
                                <div
                                  className={`px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm ${
                                    isOwn
                                      ? 'bg-emerald-500 text-white rounded-2xl rounded-tr-none'
                                      : 'bg-white text-gray-900 rounded-2xl rounded-tl-none border border-gray-100'
                                  }`}
                                  style={{ maxWidth: '100%' }}
                                >
                                  {msg.content}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 px-1">{formatTime(msg.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-white relative z-10">
                    <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                      <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a message..."
                        rows={1}
                        className="flex-1 resize-none bg-transparent text-sm text-gray-900 focus:outline-none placeholder-gray-400 max-h-28 overflow-y-auto py-1"
                        style={{ minHeight: '28px' }}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || sending}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl transition mb-0.5"
                      >
                        {sending
                          ? <Metronome size="12" speed="1.6" color="white" />
                          : <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                        }
                      </button>
                    </div>
                    <>
                    </>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
    </>
  );
}
