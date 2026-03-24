import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays, faLocationDot, faChevronLeft, faArrowUpRightFromSquare,
  faClock, faSpinner, faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../i18n/LanguageContext';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
};

const toGCalDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export default function EventDetailsPage({ session, onNavigate }) {
  const { t } = useLanguage();
  const TYPE_CONFIG = {
    iarmaroc:     { label: t.events.typeFair,        color: 'bg-emerald-100 text-emerald-700' },
    curs_agricol: { label: t.events.typeAgriCourse,  color: 'bg-blue-100 text-blue-700' },
    piata_locala: { label: t.events.typeLocalMarket, color: 'bg-amber-100 text-amber-800' },
  };
  const { id: eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events').select('*').eq('id', eventId).single();
        if (error) throw error;
        setEvent(data);
      } catch {
        onNavigate('evenimente');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!event) return null;

  const type = TYPE_CONFIG[event.type] || TYPE_CONFIG.iarmaroc;

  const gcalUrl = (() => {
    const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams({
      text: event.title || '',
      dates: `${toGCalDate(event.event_date)}/${toGCalDate(event.end_date || event.event_date)}`,
      details: event.description || '',
      location: event.location_text || '',
    });
    return `${base}&${params.toString()}`;
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <button onClick={() => onNavigate('evenimente')}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-700 text-sm font-medium mb-6 transition">
          <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          {t.eventDetails.back}
        </button>

        {/* Hero Image */}
        <div className="rounded-2xl overflow-hidden h-64 mb-8 bg-gradient-to-br from-emerald-400 to-emerald-600">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FontAwesomeIcon icon={faCalendarDays} className="text-white text-6xl opacity-50" />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Badge + Title */}
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${type.color}`}>{type.label}</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-3 mb-4">{event.title}</h1>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
            {event.event_date && (
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-600" />
                {formatDate(event.event_date)}
                {event.end_date && event.end_date !== event.event_date && (
                  <> — {formatDate(event.end_date)}</>
                )}
              </span>
            )}
            {event.location_text && (
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600" />
                {event.location_text}
              </span>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="mb-8">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">{event.description}</p>
            </div>
          )}

          {/* Schedule */}
          {event.schedule && (
            <div className="mb-8 bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="text-emerald-600" />
                {t.events.schedule}
              </h2>
              <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{event.schedule}</p>
            </div>
          )}

          {/* Map */}
          {event.latitude && event.longitude && (
            <div className="mb-8">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-emerald-600" />
                {t.eventDetails.location}
              </h2>
              <div className="rounded-2xl overflow-hidden h-64 border border-gray-200">
                <iframe
                  title="Event location"
                  width="100%" height="100%" style={{ border: 0 }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${event.latitude},${event.longitude}&z=15&output=embed`}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
            <a href={gcalUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-md">
              <FontAwesomeIcon icon={faCalendarDays} />
              Add to Google Calendar
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
            </a>
            {event.latitude && event.longitude && (
              <a href={`https://maps.google.com/?q=${event.latitude},${event.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-emerald-600" />
                Open in Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
