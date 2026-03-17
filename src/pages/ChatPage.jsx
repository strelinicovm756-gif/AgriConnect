import { useState, useEffect, useRef } from 'react';
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
  if (d.toDateString() === today.toDateString()) return 'Astăzi';
  if (d.toDateString() === yesterday.toDateString()) return 'Ieri';
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1) return 'acum';
  if (m < 60) return `acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h}h`;
  return `acum ${Math.floor(h / 24)}z`;
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
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const unsubRef = useRef(null);
  const selectedConvRef = useRef(null);

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
    if (conv.participant_1 === session.user.id) return conv.participant_2_name || 'Utilizator';
    return conv.participant_1_name || 'Utilizator';
  };

  const getOtherInitial = (conv) => getOtherName(conv).charAt(0).toUpperCase() || '?';

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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 flex flex-col min-h-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="grid lg:grid-cols-3 h-full min-h-0 flex-1">

            {/* Sidebar */}
            <div className={`border-r border-gray-100 flex flex-col min-h-0 overflow-hidden ${showMobileThread ? 'hidden lg:flex' : 'flex'}`}>
              <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} className="text-emerald-600" />
                  Mesajele mele
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
                    <p className="text-gray-500 font-medium text-sm">Nicio conversație</p>
                    <p className="text-gray-400 text-xs mt-1">Mesajele tale vor apărea aici</p>
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
                          className={`w-full px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition text-left border-l-2 ${
                            isActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-transparent'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 uppercase"
                            style={{ background: getColorForName(otherName) }}
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
                            <p className="text-xs text-emerald-600 truncate font-medium">{conv.product_name}</p>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className={`text-xs truncate ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                {conv.last_message || 'Conversație nouă'}
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
                  <p className="text-gray-500 font-medium">Selectează o conversație</p>
                  <p className="text-gray-400 text-sm mt-1">Alege o conversație din lista din stânga</p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => setShowMobileThread(false)}
                      className="lg:hidden w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full transition"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 uppercase"
                      style={{ background: getColorForName(getOtherName(selectedConv)) }}
                    >
                      {getOtherInitial(selectedConv)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{getOtherName(selectedConv)}</p>
                      <p className="text-xs text-gray-400 truncate">{selectedConv.product_name}</p>
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
                        <p className="text-gray-400 text-sm font-medium">Niciun mesaj încă</p>
                        <p className="text-gray-300 text-xs mt-1">Trimite primul mesaj!</p>
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
                              <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                <div
                                  className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
                                    isOwn
                                      ? 'bg-emerald-500 text-white rounded-2xl rounded-br-sm'
                                      : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm'
                                  }`}
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
                  <div className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 flex-shrink-0 bg-white relative z-10">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Scrie un mesaj... (Enter pentru trimite)"
                      rows={1}
                      className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 max-h-28 overflow-y-auto"
                      style={{ minHeight: '42px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || sending}
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl transition"
                    >
                      {sending
                        ? <Metronome size="14" speed="1.6" color="white" />
                        : <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
                      }
                    </button>
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
