import { useState, useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { getColorForName } from '../../lib/utils';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import { MessageSquare } from 'lucide-react';

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
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

export default function ChatModal({ isOpen, onClose, session, product }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const { getOrCreateConversation, fetchMessages, sendMessage, subscribeToMessages, markMessagesAsRead } = useChat();

  const isSelf = product?.user_id === session?.user?.id;

  useEffect(() => {
    if (!isOpen || !session || !product || isSelf) return;

    let unsubscribe = null;

    const init = async () => {
      setLoading(true);
      const convId = await getOrCreateConversation(session.user.id, product.user_id, product.id);
      if (!convId) { setLoading(false); return; }

      setConversationId(convId);
      const msgs = await fetchMessages(convId);
      setMessages(msgs);
      await markMessagesAsRead(convId, session.user.id);
      setLoading(false);

      unsubscribe = subscribeToMessages(convId, (newMsg) => {
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
          return [...prev, newMsg];
        });
        markMessagesAsRead(convId, session.user.id);
      });
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, session?.user?.id, product?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !conversationId || sending) return;

    setSending(true);
    setInputValue('');

    // Optimistic update
    const optimistic = {
      id: `opt_${Date.now()}`,
      conversation_id: conversationId,
      sender_id: session.user.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages(prev => [...prev, optimistic]);

    await sendMessage(conversationId, session.user.id, content);
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
        .custom-scroll:hover::-webkit-scrollbar-thumb { background: #10b981; }
        .custom-scroll { scrollbar-width: thin; scrollbar-color: #e5e7eb transparent; }
        .custom-scroll:hover { scrollbar-color: #10b981 transparent; }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[580px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 uppercase"
              style={{ background: getColorForName(product?.seller_name || '') }}
            >
              {(product?.seller_name || '?').charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{product?.seller_name || 'Vânzător'}</p>
              <p className="text-xs text-gray-400 truncate">{product?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition flex-shrink-0 ml-2"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Body */}
        {isSelf ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageSquare size={40} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Nu poți trimite mesaje la propriul tău anunț.</p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Metronome size="30" speed="1.6" color="#059669" />
          </div>
        ) : (
          <>
            {/* Messages list */}
            <div className="flex-1 overflow-y-auto custom-scroll px-4 py-4 space-y-1">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare size={36} className="text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm font-medium">Niciun mesaj încă</p>
                  <p className="text-gray-300 text-xs mt-1">Trimite primul mesaj!</p>
                </div>
              )}

              {messages.map((msg, idx) => {
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
                      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
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
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 flex-shrink-0">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scrie un mesaj..."
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
  );
}
