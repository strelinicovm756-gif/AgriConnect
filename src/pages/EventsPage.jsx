import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import toast from 'react-hot-toast';
import { useLanguage } from '../i18n/LanguageContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays, faLocationDot, faXmark,
  faChevronDown, faChevronUp,
  faLocationCrosshairs, faSpinner, faBell, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

function formatDateBadge(startStr, endStr) {
  if (!startStr) return null;
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : null;
  const dayS = start.getDate();
  const monS = start.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const curYear = new Date().getFullYear();
  const yearS = start.getFullYear() !== curYear ? start.getFullYear() : null;

  if (!end || end.toDateString() === start.toDateString()) {
    return { day: dayS, month: monS, year: yearS };
  }
  const dayE = end.getDate();
  const monE = end.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  if (monS === monE) return { range: `${dayS}–${dayE}`, month: monS };
  return { range: `${dayS} ${monS} – ${dayE} ${monE}` };
}

// ── EventCard ────────────────────────────────────────────────────────────────
function EventCard({ event, typeConfig, onNavigate, t }) {
  const type = typeConfig[event.type] || typeConfig.iarmaroc;
  const badge = formatDateBadge(event.event_date, event.end_date);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 flex flex-col">
      {/* Image / placeholder */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FontAwesomeIcon icon={faCalendarDays} className="text-white opacity-30 text-4xl" />
          </div>
        )}

        {/* Date badge */}
        {badge && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-center shadow-sm min-w-[44px]">
            {badge.range ? (
              <>
                <p className="text-[11px] font-black text-gray-900 leading-tight">{badge.range}</p>
                {badge.month && (
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">{badge.month}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xl font-black text-gray-900 leading-none">{badge.day}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">{badge.month}</p>
                {badge.year && <p className="text-[9px] text-gray-400">{badge.year}</p>}
              </>
            )}
          </div>
        )}

        {/* Type badge */}
        <span className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm ${type.color}`}>
          {type.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 line-clamp-2">
          {event.title}
        </h3>
        {event.location_text && (
          <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
            <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600 flex-shrink-0 text-[12px]" />
            <span className="truncate">{event.location_text}</span>
          </p>
        )}
        {event.schedule && !event.description && (
          <p className="text-xs text-gray-400 mb-1 line-clamp-1">{event.schedule}</p>
        )}
        <p className="text-sm text-gray-500 line-clamp-2 flex-1 mb-4">
          {event.description || 'Descoperă produsele locale la acest eveniment.'}
        </p>
        <button
          onClick={() => onNavigate('eveniment', event.id)}
          className="mt-auto w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 hover:text-white text-white font-semibold text-sm rounded-xl  duration-200 border border-emerald-600 hover:border-emerald-700">
          {t.events.learnMore}
        </button>
      </div>
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ t, session, onSubscribe, isMarkets, isSubscribed }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-14 text-center">
      <FontAwesomeIcon icon={faCalendarDays} className="text-gray-200 text-5xl block mx-auto mb-5" />
      <p className="text-xl font-bold text-gray-800 mb-2">
        {isMarkets ? t.events.noMarkets : t.events.noEvents}
      </p>
      <p className="text-sm text-gray-500 mb-7 max-w-xs mx-auto">
        {t.events.noEventsHint}
      </p>
      {isSubscribed ? (
        <span className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 font-semibold rounded-xl text-sm border border-emerald-200 cursor-default">
          <FontAwesomeIcon icon={faCircleCheck} />
          {t.events.notifySubscribed}
        </span>
      ) : (
        <button
          onClick={session ? onSubscribe : undefined}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-emerald-100">
          <FontAwesomeIcon icon={faBell} />
          {session ? t.events.notifyBtn : t.events.notifyLoginRequired}
        </button>
      )}
    </div>
  );
}

// ── EventsPage ───────────────────────────────────────────────────────────────
export default function EventsPage({ session, onNavigate }) {
  const { t } = useLanguage();

  const TYPE_CONFIG = {
    iarmaroc: { label: t.events.typeFair, color: 'bg-emerald-100 text-emerald-700' },
    curs_agricol: { label: t.events.typeAgriCourse, color: 'bg-blue-100 text-blue-700' },
    piata_locala: { label: t.events.typeLocalMarket, color: 'bg-amber-100 text-amber-800' },
  };

  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [mapIsExpanded, setMapIsExpanded] = useState(true);
  const [mapPeriodFilter, setMapPeriodFilter] = useState('all');
  const [locationStatus, setLocationStatus] = useState('idle');   // idle | loading | granted | denied
  const [userLocation, setUserLocation] = useState(null);     // { lat, lon }
  const [mapReady, setMapReady] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // ── Data fetch (unchanged queries) ──────────────────────────────────────
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

  // ── Subscription check ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    supabase
      .from('event_subscriptions')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsSubscribed(!!data));
  }, [session]);

  // ── Subscribe handler ────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    if (!session) { onNavigate('login'); return; }
    try {
      const { error } = await supabase
        .from('event_subscriptions')
        .upsert({
          user_id: session.user.id,
          email: session.user.email,
        }, { onConflict: 'user_id' });
      if (error) throw error;
      setIsSubscribed(true);
      toast.success(t.events.notifySuccess);
    } catch {
      toast.error(t.events.notifyError);
    }
  };

  // Reset filters and map selection when switching tabs
  useEffect(() => {
    setLocationFilter('');
    setPeriodFilter('all');
    setSelectedEvent(null);
  }, [activeTab]);

  // ── Computed ────────────────────────────────────────────────────────────
  const activeItems = activeTab === 'events' ? events : markets;

  const uniqueLocations = useMemo(() =>
    [...new Set(activeItems.map(e => e.location_text).filter(Boolean))].sort()
    , [activeItems]);

  const filteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activeItems.filter(ev => {
      // Location
      if (locationFilter && ev.location_text !== locationFilter) return false;

      // Period
      if (periodFilter !== 'all' && ev.event_date) {
        const start = new Date(ev.event_date);
        start.setHours(0, 0, 0, 0);
        const endRaw = ev.end_date ? new Date(ev.end_date) : null;
        if (endRaw) endRaw.setHours(0, 0, 0, 0);
        const effectiveEnd = endRaw || start;

        if (periodFilter === 'today') {
          if (!(start <= today && effectiveEnd >= today)) return false;
        } else if (periodFilter === 'weekend') {
          const d = today.getDay();
          const fri = new Date(today);
          if (d === 6) fri.setDate(today.getDate() - 1);
          else if (d === 0) fri.setDate(today.getDate() - 2);
          else fri.setDate(today.getDate() + (5 - d));
          const sun = new Date(fri);
          sun.setDate(fri.getDate() + 2);
          if (!(start <= sun && effectiveEnd >= fri)) return false;
        } else if (periodFilter === 'month') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          if (!(start <= monthEnd && effectiveEnd >= monthStart)) return false;
        }
      }
      return true;
    });
  }, [activeItems, periodFilter, locationFilter]);

  // Map has its own independent period filter (decoupled from the grid filter bar)
  const mapFilteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return activeItems.filter(ev => {
      if (!ev.latitude || !ev.longitude) return false;
      if (mapPeriodFilter === 'all') return true;
      if (!ev.event_date) return true;
      const start = new Date(ev.event_date);
      start.setHours(0, 0, 0, 0);
      const endRaw = ev.end_date ? new Date(ev.end_date) : null;
      if (endRaw) endRaw.setHours(0, 0, 0, 0);
      const effectiveEnd = endRaw || start;
      if (mapPeriodFilter === 'today') {
        return start <= today && effectiveEnd >= today;
      }
      if (mapPeriodFilter === 'weekend') {
        const d = today.getDay();
        const fri = new Date(today);
        if (d === 6) fri.setDate(today.getDate() - 1);
        else if (d === 0) fri.setDate(today.getDate() - 2);
        else fri.setDate(today.getDate() + (5 - d));
        fri.setHours(18, 0, 0, 0);
        const sun = new Date(fri);
        sun.setDate(fri.getDate() + (d === 0 ? 0 : 2));
        sun.setHours(23, 59, 59, 999);
        return start <= sun && effectiveEnd >= fri;
      }
      if (mapPeriodFilter === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return start <= monthEnd && effectiveEnd >= monthStart;
      }
      return true;
    });
  }, [activeItems, mapPeriodFilter]);

  // ── Map: initialize when location is granted ────────────────────────────
  useEffect(() => {
    if (locationStatus !== 'granted' || !userLocation || !mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [userLocation.lon, userLocation.lat],
      zoom: 8,
    });

    // Persistent user-location marker
    const userEl = document.createElement('div');
    userEl.innerHTML = '<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>';
    new mapboxgl.Marker({ element: userEl, anchor: 'center' })
      .setLngLat([userLocation.lon, userLocation.lat])
      .addTo(map);

    map.on('load', () => setMapReady(true));
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [locationStatus, userLocation]);

  // ── Map: resize after expand transition; clear selection on collapse ────
  useEffect(() => {
    if (!mapIsExpanded) { setSelectedEvent(null); return; }
    const timer = setTimeout(() => mapRef.current?.resize(), 50);
    return () => clearTimeout(timer);
  }, [mapIsExpanded]);

  // ── Map: update markers when map-filtered items change ──────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    setSelectedEvent(null);

    if (!mapFilteredItems.length) return;

    const bounds = new mapboxgl.LngLatBounds();

    mapFilteredItems.forEach(ev => {
      const el = document.createElement('div');
      el.style.cssText = [
        'width:36px', 'height:36px', 'background:#059669',
        'border:3px solid white', 'border-radius:50%',
        'box-shadow:0 4px 12px rgba(5,150,105,0.4)',
        'cursor:pointer',
        'transition:width 0.15s,height 0.15s,box-shadow 0.15s',
      ].join(';');
      el.addEventListener('mouseenter', () => {
        el.style.width = '44px'; el.style.height = '44px';
        el.style.boxShadow = '0 6px 20px rgba(5,150,105,0.6)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.width = '36px'; el.style.height = '36px';
        el.style.boxShadow = '0 4px 12px rgba(5,150,105,0.4)';
      });
      el.addEventListener('click', () => {
        setSelectedEvent(ev);
        map.flyTo({ center: [ev.longitude, ev.latitude], zoom: 13, duration: 800 });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([ev.longitude, ev.latitude])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([ev.longitude, ev.latitude]);
    });

    if (mapFilteredItems.length === 1) {
      map.flyTo({ center: [mapFilteredItems[0].longitude, mapFilteredItems[0].latitude], zoom: 11, duration: 1000 });
    } else {
      map.fitBounds(bounds, { padding: { top: 60, bottom: 100, left: 40, right: 40 }, maxZoom: 13, duration: 1000 });
    }
  }, [mapFilteredItems, mapReady]);

  // ── Geolocation: request user location ─────────────────────────────────
  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied'),
      { timeout: 10000 }
    );
  };

  // ── Period filter config ────────────────────────────────────────────────
  const PERIOD_FILTERS = [
    { key: 'all', label: t.events.filterAll },
    { key: 'today', label: t.events.filterToday },
    { key: 'weekend', label: t.events.filterWeekend },
    { key: 'month', label: t.events.filterMonth },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <Metronome size="40" speed="1.6" color="#059669" />
        <p className="text-gray-500 mt-3 text-sm">{t.events.pageTitle}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ─── Subscribe button (stays above map) ─── */}
        {!isSubscribed && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleSubscribe}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition shadow-sm">
              <FontAwesomeIcon icon={faBell} className="text-xs" />
              {t.events.notifyBtn}
            </button>
          </div>
        )}

        

        {/* ─── Map section header ─── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600" />
            <span className="font-bold text-gray-900 text-sm">Evenimente pe hartă</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${mapFilteredItems.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-gray-700 text-xs font-semibold">
                {mapFilteredItems.length} {mapFilteredItems.length === 1 ? 'eveniment' : 'evenimente'}
              </span>
            </div>
            <button
              onClick={() => setMapIsExpanded(e => !e)}
              className="text-gray-400 hover:text-gray-700 transition p-1">
              <FontAwesomeIcon icon={mapIsExpanded ? faChevronUp : faChevronDown} />
            </button>
          </div>
        </div>

        {/* ─── Map container ─── */}
        <div
          className="relative rounded-2xl border border-gray-100 shadow-md overflow-hidden mb-8 transition-all duration-500 ease-in-out"
          style={{
            height: mapIsExpanded ? '460px' : '0px',
            opacity: mapIsExpanded ? 1 : 0,
          }}
        >
          {/* idle */}
          {locationStatus === 'idle' && (
            <div className="absolute inset-0 z-10">
              {/* Blurred static map background */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/28.8638,47.0105,6,0/1200x460?access_token=${import.meta.env.VITE_MAPBOX_TOKEN})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(1px) brightness(0.97)',
                }}
              />
              {/* CTA overlay */}
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faLocationCrosshairs} className="text-emerald-600 text-3xl" />
                </div>
                <div className="text-center px-6">
                  <p className="text-gray-900 font-bold text-lg mb-1">Găsește evenimente lângă tine</p>
                  <p className="text-gray-500 text-sm">Activează localizarea pentru a vedea evenimentele din apropiere</p>
                </div>
                <button
                  onClick={requestLocation}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all hover:scale-105">
                  <FontAwesomeIcon icon={faLocationDot} className="mr-2" />
                  Activează localizarea
                </button>
              </div>
            </div>
          )}

          {/* loading */}
          {locationStatus === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white z-10">
              <FontAwesomeIcon icon={faSpinner} className="text-emerald-600 text-4xl animate-spin" />
              <p className="text-gray-600 font-medium">Se determină locația...</p>
            </div>
          )}

          {/* denied */}
          {locationStatus === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-50 to-white z-10 px-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faLocationCrosshairs} className="text-gray-400 text-2xl" />
              </div>
              <p className="text-gray-700 font-semibold">Localizare indisponibilă</p>
              <p className="text-gray-500 text-sm max-w-xs">Activează localizarea din setările browserului sau explorează toate evenimentele mai jos</p>
              <button
                onClick={requestLocation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-all">
                <FontAwesomeIcon icon={faLocationCrosshairs} className="mr-2" />
                Încearcă din nou
              </button>
            </div>
          )}

          {/* Map canvas */}
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ display: locationStatus === 'granted' ? 'block' : 'none' }}
          />

          {/* Filter pills — absolute top-left overlay */}
          {locationStatus === 'granted' && (
            <div className="absolute top-4 left-4 z-20" style={{ pointerEvents: 'none' }}>
              <div
                className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 px-3 py-2 flex gap-1.5"
                style={{ pointerEvents: 'auto' }}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                {[
                  { key: 'all', label: t.events.filterAll },
                  { key: 'today', label: t.events.filterToday },
                  { key: 'weekend', label: t.events.filterWeekend },
                  { key: 'month', label: t.events.filterMonth },
                ].map(pf => (
                  <button
                    key={pf.key}
                    onClick={() => setMapPeriodFilter(pf.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${mapPeriodFilter === pf.key
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                    {pf.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No-events overlay */}
          {locationStatus === 'granted' && mapReady && mapFilteredItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-2 pointer-events-none">
              <FontAwesomeIcon icon={faCalendarDays} className="text-gray-300 text-3xl" />
              <p className="text-gray-500 text-sm font-medium text-center px-6">
                Niciun eveniment pentru perioada selectată
              </p>
            </div>
          )}

          

          {/* Selected event — floating card bottom-left */}
          {locationStatus === 'granted' && selectedEvent && (
            <div
              className="absolute bottom-4 left-4 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-3"
              style={{ maxWidth: 'calc(100% - 2rem)', pointerEvents: 'auto' }}
            >
              <div className="flex items-center gap-3">
                {selectedEvent.image_url ? (
                  <img
                    src={selectedEvent.image_url}
                    alt={selectedEvent.title}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm line-clamp-1">{selectedEvent.title}</p>
                  {selectedEvent.location_text && (
                    <p className="flex items-center gap-1 text-xs text-emerald-600 mt-0.5">
                      <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                      {selectedEvent.location_text}
                    </p>
                  )}
                  {selectedEvent.event_date && (
                    <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <FontAwesomeIcon icon={faCalendarDays} className="text-[10px]" />
                      {formatDate(selectedEvent.event_date)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onNavigate('eveniment', selectedEvent.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition">
                    Vezi
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-400 hover:text-gray-600 p-1.5">
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* ─── Main container ─── */}
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden mt-6">

          {/* Row 1: Tabs */}
          <div className="flex border-b border-gray-100">
            {[
              { key: 'events', label: t.events.tabEvents },
              { key: 'markets', label: t.events.tabMarkets },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-sm font-semibold transition-all relative ${
                  activeTab === tab.key
                    ? 'text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Row 2: Filter bar */}
          <div className="flex items-center justify-between gap-4 px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex-col sm:flex-row">
            {/* Left: segmented period control */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 w-full sm:w-auto">
              {PERIOD_FILTERS.map(pf => (
                <button
                  key={pf.key}
                  onClick={() => setPeriodFilter(pf.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none ${
                    periodFilter === pf.key
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {pf.label}
                </button>
              ))}
            </div>

            {/* Right: location dropdown + results count */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {(periodFilter !== 'all' || locationFilter) && (
                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                  {filteredItems.length} {filteredItems.length === 1 ? t.events.eventSingular : t.events.eventPlural}
                </span>
              )}
              {uniqueLocations.length > 0 && (
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faLocationDot}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
                  />
                  <select
                    value={locationFilter}
                    onChange={e => setLocationFilter(e.target.value)}
                    className="pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 hover:border-emerald-300 focus:ring-2 focus:ring-emerald-200 focus:outline-none appearance-none cursor-pointer transition-all font-medium">
                    <option value="">{t.events.allLocations}</option>
                    {uniqueLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Card grid or empty state */}
          <div className="p-5 sm:p-6">
            {filteredItems.length === 0 ? (
              <EmptyState
                t={t}
                session={session}
                onSubscribe={handleSubscribe}
                isMarkets={activeTab === 'markets'}
                isSubscribed={isSubscribed}
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(ev => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    typeConfig={TYPE_CONFIG}
                    onNavigate={onNavigate}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

        </div>


      </main>

    </div>
  );
}
