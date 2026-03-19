import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays, faLocationDot, faMapMarkerAlt, faArrowRight, faSpinner
} from '@fortawesome/free-solid-svg-icons';

const TYPE_CONFIG = {
  iarmaroc:     { label: 'Fair',               color: 'bg-emerald-100 text-emerald-700' },
  curs_agricol: { label: 'Agricultural Course', color: 'bg-blue-100 text-blue-700' },
  piata_locala: { label: 'Local Market',        color: 'bg-amber-100 text-amber-800' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function EventsPage({ session, onNavigate }) {
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [evRes, mRes] = await Promise.all([
          supabase.from('events').select('*')
            .in('type', ['iarmaroc', 'curs_agricol'])
            .eq('is_published', true)
            .order('event_date', { ascending: true }),
          supabase.from('events').select('*')
            .eq('type', 'piata_locala')
            .eq('is_published', true)
            .order('event_date', { ascending: true }),
        ]);
        setEvents(evRes.data || []);
        setMarkets(mRes.data || []);
      } catch { }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <FontAwesomeIcon icon={faCalendarDays} className="text-5xl mb-3 text-emerald-6s00" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Events & Local Markets</h1>
          <p className="text-gray-500">Fairs, agricultural courses and local markets from the community.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'events', label: 'Fairs & Events' },
            { key: 'markets', label: 'Local Markets' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === t.key
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-600 animate-spin" />
          </div>
        ) : activeTab === 'events' ? (
          events.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FontAwesomeIcon icon={faCalendarDays} className="text-5xl mb-3 opacity-30" />
              <p className="font-medium text-gray-500">No events available at the moment</p>
              <p className="text-sm mt-1">Check back soon for new fairs and courses!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(ev => {
                const type = TYPE_CONFIG[ev.type] || TYPE_CONFIG.iarmaroc;
                return (
                  <button key={ev.id} onClick={() => onNavigate('eveniment', ev.id)}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-emerald-300 transition-all text-left group">
                    <div className="h-44 overflow-hidden">
                      {ev.image_url ? (
                        <img src={ev.image_url} alt={ev.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                          <FontAwesomeIcon icon={faCalendarDays} className="text-white text-4xl opacity-60" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${type.color}`}>{type.label}</span>
                      <h3 className="font-bold text-gray-900 mt-2 mb-1 group-hover:text-emerald-700 transition-colors line-clamp-2">{ev.title}</h3>
                      <p className="text-xs text-emerald-600 font-medium mb-1">{formatDate(ev.event_date)}</p>
                      {ev.location_text && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                          <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                          {ev.location_text}
                        </p>
                      )}
                      {ev.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          markets.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FontAwesomeIcon icon={faLocationDot} className="text-5xl mb-3 opacity-30" />
              <p className="font-medium text-gray-500">No local markets available at the moment</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Market / Location</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Schedule</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Map</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {markets.map((m, i) => (
                    <tr key={m.id} className={`hover:bg-emerald-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">{m.title}</p>
                        {m.location_text && <p className="text-xs text-gray-500 mt-0.5">{m.location_text}</p>}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 hidden sm:table-cell whitespace-pre-line">{m.schedule || '—'}</td>
                      <td className="px-5 py-4 text-xs text-gray-500 hidden md:table-cell">{formatDate(m.event_date)}</td>
                      <td className="px-5 py-4">
                        {m.latitude && m.longitude ? (
                          <a href={`https://maps.google.com/?q=${m.latitude},${m.longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition w-fit">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px]" />
                            View map
                          </a>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
