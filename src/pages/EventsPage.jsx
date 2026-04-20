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
  faLocationCrosshairs, faSpinner, faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { Bell } from 'lucide-react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// ── EventCard ────────────────────────────────────────────────────────────────
function EventCard({ event, typeConfig, onNavigate, t, formatDate }) {
  const type = typeConfig[event.type] || typeConfig.iarmaroc;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onNavigate('eveniment', event.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden
                 hover:border-emerald-200 transition-all text-left group w-full"
      style={{
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.10)'
          : '0 1px 6px rgba(0,0,0,0.05)',
      }}>

      {/* Image — aspect ratio 16/9 */}
      <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 40%, #6ee7b7 100%)' }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")` }}>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-600 text-3xl opacity-50" />
              <span className="text-xs font-medium text-emerald-700 opacity-60">{t.events.eventLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col h-full">
        {/* Date badge + Type badge */}
        <div className="flex items-center flex-wrap gap-2 mb-3">
          {event.event_date && (
            <span className="inline-block text-xs font-semibold text-emerald-700
                             bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
              {formatDate(event.event_date)}
            </span>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${type.color}`}>
            {type.label}
          </span>
        </div>

        <h3 className="font-bold text-gray-900 text-base leading-snug mt-3 mb-1.5
                       group-hover:text-emerald-700 transition-colors line-clamp-2 min-h-[2.5rem]">
          {event.title}
        </h3>

        {event.location_text ? (
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
            <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
            {event.location_text}
          </p>
        ) : (
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3 invisible">
            placeholder
          </p>
        )}

        {event.description ? (
          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        ) : (
          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed invisible">
            placeholder placeholder placeholder placeholder placeholder placeholder
          </p>
        )}

        {/* "Află mai mult" link */}
        <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold
                        text-emerald-600 group-hover:gap-2.5 transition-all">
          {t.events.learnMore}
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </div>
      </div>
    </button>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ isMarkets, t }) {
  if (isMarkets) {
    return (
      <div className="text-center py-24">
        <div className="inline-flex items-center justify-center w-16 h-16
                        rounded-2xl bg-amber-50 border border-amber-100 mb-5">
          <FontAwesomeIcon icon={faLocationDot} className="text-2xl text-amber-400" />
        </div>
        <p className="font-bold text-gray-800 text-lg mb-2">
          {t.events.noMarkets}
        </p>
      </div>
    );
  }
  return (
    <div className="text-center py-24">
      <div className="inline-flex items-center justify-center w-16 h-16
                      rounded-2xl bg-emerald-50 border border-emerald-100 mb-5">
        <FontAwesomeIcon icon={faCalendarDays} className="text-2xl text-emerald-400" />
      </div>
      <p className="font-bold text-gray-800 text-lg mb-2">
        {t.events.noEvents}
      </p>
      <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
        {t.events.noEventsHint}
      </p>
    </div>
  );
}

// ── EventsPage ───────────────────────────────────────────────────────────────
export default function EventsPage({ session, onNavigate }) {
  const { t, lang } = useLanguage();

  const localeMap = { ro: 'ro-RO', en: 'en-GB', fr: 'fr-FR' };
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(localeMap[lang] || 'ro-RO', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

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
  const [notifyActive, setNotifyActive] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

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

  // ── Notify preference from profiles ─────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('notify_events')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setNotifyActive(data.notify_events ?? false);
      });
  }, [session]);

  // ── Notify button handler ────────────────────────────────────────────────
  const handleNotify = async () => {
    if (!session) { onNavigate('login'); return; }
    setNotifyLoading(true);
    const newValue = !notifyActive;
    const { error } = await supabase
      .from('profiles')
      .update({ notify_events: newValue })
      .eq('id', session.user.id);
    if (!error) {
      setNotifyActive(newValue);
      toast.success(newValue ? 'Vei fi notificat despre evenimente noi!' : 'Notificări dezactivate');
    } else {
      toast.error('Eroare la salvarea preferinței');
    }
    setNotifyLoading(false);
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
      if (locationFilter && ev.location_text !== locationFilter) return false;

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

      {/* ─── Page header ─── */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">{t.events.pageTitle}</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-8 pb-12">

        {/* ─── Map card ─── */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >

          {/* Map card header */}
          <div className="relative z-20 bg-emerald-600 flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faLocationDot} className="text-white" />
              <span className="font-bold text-white text-sm">{t.events.showMap}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${mapFilteredItems.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-gray-700 text-xs font-semibold">
                  {mapFilteredItems.length} {mapFilteredItems.length === 1 ? t.events.eventSingular : t.events.eventPlural}
                </span>
              </div>
              <button
                onClick={() => setMapIsExpanded(e => !e)}
                className="text-white p-2 flex items-center justify-center"
              >
                <div className={`transition-transform duration-700 ${mapIsExpanded ? 'rotate-0' : 'rotate-180'
                  }`}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }}>
                  <FontAwesomeIcon icon={faChevronUp} />
                </div>
              </button>
            </div>
          </div>

          {/* Map container */}
          <div
            className="relative transition-all duration-500 ease-in-out overflow-hidden"
            style={{
              height: mapIsExpanded ? '480px' : '0px',
              opacity: mapIsExpanded ? 1 : 0,
            }}
          >
            {/* idle */}
            {locationStatus === 'idle' && (
              <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-5">



                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faLocationCrosshairs} className="text-emerald-600 text-3xl" />
                </div>
                <div className="text-center px-6">
                  <p className="text-gray-900 font-bold text-lg mb-1">{t.events.findEventsNearYou}</p>
                  <p className="text-gray-500 text-sm">{t.events.activateLocationHint}</p>
                </div>
                <button
                  onClick={requestLocation}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white
                               rounded-xl text-sm font-semibold shadow-md hover:bg-emerald-700 transition">
                  <FontAwesomeIcon icon={faLocationCrosshairs} />
                  {t.events.activateLocation}
                </button>
              </div>
            )}

            {/* loading */}
            {locationStatus === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white z-10">
                <FontAwesomeIcon icon={faSpinner} className="text-emerald-600 text-4xl animate-spin" />
                <p className="text-gray-600 font-medium">{t.events.determiningLocation}</p>
              </div>
            )}

            {/* denied */}
            {locationStatus === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-50 to-white z-10 px-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faLocationCrosshairs} className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-700 font-semibold">{t.events.locationUnavailableTitle}</p>
                <p className="text-gray-500 text-sm max-w-xs">{t.events.locationDeniedEventsHint}</p>
                <button
                  onClick={requestLocation}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all">
                  <FontAwesomeIcon icon={faLocationCrosshairs} className="mr-2" />
                  {t.common.retry}
                </button>
              </div>
            )}

            {/* Map canvas */}
            <div
              ref={mapContainerRef}
              className="w-full h-[480px]"
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
                  {t.events.noEventsForPeriod}
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
                      {t.events.viewEvent}
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
        </div>

        {/* ─── List section ─── */}
        <div>

          {/* ── Unified filter bar ── */}
          <div
            className="bg-white rounded-2xl border border-gray-100 px-5 py-4 mb-6"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            {/* Filter row: tabs LEFT + notify button RIGHT */}
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'events', label: t.events.tabEvents },
                  { key: 'markets', label: t.events.tabMarkets },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all border ${activeTab === tab.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                      }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNotify}
                disabled={notifyLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                          border transition-colors disabled:opacity-60
                          ${notifyActive
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                  }`}>
                {notifyLoading
                  ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  : <Bell size={15} />
                }
                {notifyActive ? '✓ ' + t.events.notifySubscribed : t.events.notifyBtn}
              </button>
            </div>

            {/* Period + location filter bar */}
            <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
              <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 w-full sm:w-auto">
                {PERIOD_FILTERS.map(pf => (
                  <button
                    key={pf.key}
                    onClick={() => setPeriodFilter(pf.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none ${periodFilter === pf.key
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}>
                    {pf.label}
                  </button>
                ))}
              </div>

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
          </div>{/* ── end unified filter bar ── */}

          {/* Event grid or empty state */}
          {filteredItems.length === 0 ? (
            <EmptyState isMarkets={activeTab === 'markets'} t={t} />
          ) : (
            <div className="shadow-xl bg-emerald-600 rounded-2xl  px-5 py-4 mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredItems.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  typeConfig={TYPE_CONFIG}
                  onNavigate={onNavigate}
                  t={t}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div >
  );
}
