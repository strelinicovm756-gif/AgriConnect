import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays, faLocationDot, faChevronLeft, faArrowUpRightFromSquare,
  faClock, faSpinner, faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import { Users, Timer, BadgeCheck, UserPlus, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorForName } from '../lib/utils';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
};

const toGCalDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(eventDate, endDate) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const start = eventDate ? new Date(eventDate).getTime() : null;
  const end   = endDate   ? new Date(endDate).getTime()   : start;

  if (!start) return null;

  if (now < start) {
    const diffMs = start - now;
    const days  = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
    const mins  = Math.floor((diffMs % 3_600_000)  / 60_000);
    return { status: 'upcoming', days, hours, mins };
  }

  if (end && now >= start && now <= end) {
    const diffMs = end - now;
    const hours = Math.floor(diffMs / 3_600_000);
    const mins  = Math.floor((diffMs % 3_600_000) / 60_000);
    return { status: 'ongoing', hours, mins };
  }

  return { status: 'past' };
}

// ── Countdown banner ──────────────────────────────────────────────────────────
function CountdownBanner({ eventDate, endDate }) {
  const info = useCountdown(eventDate, endDate);
  if (!info || info.status === 'past') return null;

  if (info.status === 'ongoing') {
    return (
      <div className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl w-fit animate-pulse">
        <Timer size={15} className="text-orange-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-orange-700">
          Evenimentul este în desfășurare! Se termină în:{' '}
          <span className="font-bold">{info.hours}h {info.mins}m</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl w-fit">
      <Timer size={15} className="text-emerald-600 flex-shrink-0" />
      <span className="text-sm font-semibold text-emerald-800">
        Evenimentul începe în:{' '}
        <span className="font-bold">{info.days}z {info.hours}h {info.mins}m</span>
      </span>
    </div>
  );
}

// ── Producer avatar ───────────────────────────────────────────────────────────
function ProducerAvatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
      style={{ background: getColorForName(name) }}
    >
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
  const [participants, setParticipants] = useState([]);
  const [isProducer, setIsProducer] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events').select('*').eq('id', eventId).single();
        if (eventError) throw eventError;
        setEvent(eventData);

        const { data: parts } = await supabase
          .from('event_participants')
          .select('producer_id, profiles(id, full_name, avatar_url, is_verified)')
          .eq('event_id', eventId);

        setParticipants(
          (parts || []).map(p => p.profiles).filter(Boolean)
        );

        if (session?.user?.id) {
          // Check if user is a producer
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          setIsProducer(profile?.role === 'producer');

          // Check if already joined
          const joined = (parts || []).some(p => p.producer_id === session.user.id);
          setIsJoined(joined);
        }
      } catch {
        onNavigate('evenimente');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [eventId]);

  const handleJoinEvent = async () => {
    if (!session?.user?.id || joinLoading) return;
    setJoinLoading(true);
    try {
      const { error } = await supabase
        .from('event_participants')
        .insert({ event_id: eventId, producer_id: session.user.id, status: 'confirmed' });
      if (error) throw error;

      setIsJoined(true);

      // Fetch the current user's profile to add them to the participants list instantly
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_verified')
        .eq('id', session.user.id)
        .maybeSingle();
      if (myProfile) {
        setParticipants(prev => [...prev, myProfile]);
      }
    } catch (err) {
      console.error('Eroare la înregistrarea la eveniment:', err);
    } finally {
      setJoinLoading(false);
    }
  };

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
        

        {/* Hero Image */}
        <div className="rounded-2xl overflow-hidden h-64 mb-8 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover " />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FontAwesomeIcon icon={faCalendarDays} className="text-white text-6xl opacity-50" />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Badge + Title */}
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${type.color}`}>{type.label}</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-3 mb-2">{event.title}</h1>

          {/* Countdown timer */}
          <CountdownBanner eventDate={event.event_date} endDate={event.end_date} />

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-4 mb-6">
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

          {/* Participants — "Cine va fi acolo?" */}
          {participants.length > 0 && (
            <div className="mb-8">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                Cine va fi acolo?
                <span className="ml-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  {participants.length}
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onNavigate('producator', p.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100
                               bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200
                               transition-all group text-center"
                  >
                    <div className="relative">
                      <ProducerAvatar name={p.full_name} avatarUrl={p.avatar_url} />
                      {p.is_verified && (
                        <BadgeCheck
                          size={16}
                          className="absolute -bottom-0.5 -right-0.5 text-emerald-600 bg-white rounded-full"
                        />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 group-hover:text-emerald-700
                                  transition leading-tight line-clamp-2">
                      {p.full_name}
                    </p>
                    {p.is_verified && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600
                                       bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <BadgeCheck size={10} />
                        Verificat
                      </span>
                    )}
                  </button>
                ))}
              </div>
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
            {/* Join button — producers only */}
            {isProducer && (
              isJoined ? (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
                  <CheckCircle size={16} className="flex-shrink-0" />
                  Ești înscris la acest eveniment
                </div>
              ) : (
                <button
                  onClick={handleJoinEvent}
                  disabled={joinLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700
                             disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl
                             text-sm font-semibold transition shadow-md"
                >
                  {joinLoading
                    ? <Loader2 size={16} className="animate-spin flex-shrink-0" />
                    : <UserPlus size={16} className="flex-shrink-0" />
                  }
                  {joinLoading ? 'Se înregistrează...' : 'Vreau să particip'}
                </button>
              )
            )}

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

      {/* Floating join button — mobile only, producers only */}
      {isProducer && !isJoined && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 sm:hidden z-40">
          <button
            onClick={handleJoinEvent}
            disabled={joinLoading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700
                       disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl
                       text-sm font-bold shadow-2xl shadow-blue-600/40 transition w-full max-w-xs justify-center"
          >
            {joinLoading
              ? <Loader2 size={17} className="animate-spin flex-shrink-0" />
              : <UserPlus size={17} className="flex-shrink-0" />
            }
            {joinLoading ? 'Se înregistrează...' : 'Vreau să particip'}
          </button>
        </div>
      )}
    </div>
  );
}
