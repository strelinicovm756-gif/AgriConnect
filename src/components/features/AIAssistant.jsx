import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot, faXmark, faChevronDown, faPaperPlane,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { useAIAssistant } from '../../hooks/useAIAssistant';

const SUGGESTIONS = [
  'Ce produse sunt disponibile acum?',
  'Sunt evenimente agricole în curând?',
  'Caută producători din Chișinău',
  'Ce servicii agricole există?',
];

export default function AIAssistant({ session }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { messages, loading, sendMessage, clearHistory } = useAIAssistant(session);
  const location = useLocation();

  // Hide on /chat page
  if (location.pathname === '/chat') return null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(msg);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Fixed floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700
                   text-white rounded-full shadow-2xl shadow-emerald-600/40
                   flex items-center justify-center transition-all duration-300
                   hover:scale-110 active:scale-95"
        aria-label="AI Assistant">
        <FontAwesomeIcon
          icon={isOpen ? faXmark : faRobot}
          className={`text-xl transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
        />
        {!isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full
                           border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-0 left-0 mx-3 sm:left-auto sm:right-6 sm:mx-0 sm:w-[350px]
                    z-50 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden
                    transition-all duration-300 origin-bottom-right flex flex-col
                    ${isOpen
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                    }`}
        style={{ height: '520px' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faRobot} className="text-white text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Asistent Sezon</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
              <p className="text-emerald-200 text-xs">Activ acum · GitHub Models</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition text-xs"
                title="Șterge conversația">
                <FontAwesomeIcon icon={faRotateRight} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
              <FontAwesomeIcon icon={faChevronDown} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll"
          style={{ minHeight: 0 }}>

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                <FontAwesomeIcon icon={faRobot} className="text-emerald-600 text-2xl" />
              </div>
              <p className="font-bold text-gray-900 mb-1">Bună! Sunt asistentul Sezon</p>
              <p className="text-gray-500 text-xs mb-5">
                Îți pot ajuta să găsești produse, producători și evenimente de pe platformă.
              </p>
              <div className="flex flex-col gap-2 w-full">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-xs bg-gray-50 hover:bg-emerald-50 border border-gray-200
                               hover:border-emerald-300 text-gray-700 hover:text-emerald-700
                               px-3 py-2 rounded-xl transition-all font-medium">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                      <FontAwesomeIcon icon={faRobot} className="text-emerald-600 text-[10px]" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : msg.isError
                        ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i, arr) => (
                      <span key={i}>
                        {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                        )}
                        {i < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <FontAwesomeIcon icon={faRobot} className="text-emerald-600 text-[10px]" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-100 p-3 bg-white flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrie un mesaj..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5
                         text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300
                         transition placeholder-gray-400 disabled:opacity-50 max-h-24"
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40
                         disabled:cursor-not-allowed text-white rounded-xl flex items-center
                         justify-center transition-all flex-shrink-0">
              <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Powered by GitHub Models · Datele sunt în timp real
          </p>
        </div>
      </div>
    </>
  );
}
