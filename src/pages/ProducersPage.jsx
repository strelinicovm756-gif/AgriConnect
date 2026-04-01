import { useState, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faCarrot, faTractor, faLocationDot, faCircleCheck,
  faStar, faArrowRight, faSliders, faHome, faChevronRight,
  faXmark, faSearch, faFilter, faBuilding,
} from '@fortawesome/free-solid-svg-icons';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { useLanguage } from '../i18n/LanguageContext';
import { useProducers } from '../hooks/useProducers';
import { getColorForName } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';

const ITEMS_PER_PAGE = 12;

// ── ProducerCard ─────────────────────────────────────────────────────────────
function ProducerCard({ producer, onNavigate, t }) {
  const color = getColorForName(producer.id);

  return (
    <button
      onClick={() => onNavigate('producator', producer.id)}
      className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-emerald-200 transition-all duration-300 text-left group relative overflow-hidden w-full"
    >
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-emerald-50/0 group-hover:bg-emerald-50/30 transition-all duration-300 rounded-2xl pointer-events-none" />

      {/* Top row: avatar + name + location */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-white text-xl font-black shadow-sm"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          {(producer.full_name || '?')[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 truncate">{producer.full_name}</p>
            {producer.is_verified && (
              <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 text-sm flex-shrink-0" />
            )}
            {producer.b2b_verified && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100 font-medium flex items-center gap-1">
                <FontAwesomeIcon icon={faBuilding} className="text-[10px]" />
                {t.producers.b2bVerified}
              </span>
            )}
          </div>
          {producer.official_name && producer.official_name !== producer.full_name && (
            <p className="text-xs text-gray-400 truncate">{producer.official_name}</p>
          )}
          {producer.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <FontAwesomeIcon icon={faLocationDot} className="text-emerald-500 text-[10px]" />
              {producer.location}
            </p>
          )}
        </div>
      </div>

      {/* Rating row */}
      <div className="flex items-center gap-2 mb-3">
        {producer.avgRating > 0 ? (
          <>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <FontAwesomeIcon
                  key={s}
                  icon={faStar}
                  className={`text-[11px] ${s <= Math.round(producer.avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-700">{producer.avgRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({producer.reviewCount})</span>
          </>
        ) : (
          <span className="text-xs text-gray-400">{t.producers.noReviews}</span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 font-medium">
          {producer.productCount} {t.producers.activeProducts}
        </span>
        {producer.marketType === 'b2b' && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100 font-medium">
            {t.producers.typeServices}
          </span>
        )}
        {producer.marketType === 'b2c' && (
          <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100 font-medium">
            {t.producers.typeFood}
          </span>
        )}
        {producer.marketType === 'both' && (
          <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100 font-medium">
            {t.producers.typeBoth}
          </span>
        )}
      </div>

      {/* Bio snippet */}
      {producer.bio && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{producer.bio}</p>
      )}

      {/* Hover CTA */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-gray-400 group-hover:text-emerald-600 transition-colors font-medium flex items-center gap-1.5">
          <FontAwesomeIcon
            icon={faArrowRight}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
          />
          {t.producers.viewProfile}
        </span>
      </div>
    </button>
  );
}

// ── ProducerFilterSidebar ─────────────────────────────────────────────────────
function ProducerFilterSidebar({ filters, onChange, t }) {
  const [locationInput, setLocationInput] = useState(filters.location);
  const debounceRef = useRef(null);

  // Sync external filter.location → local input when reset
  useEffect(() => {
    setLocationInput(filters.location);
  }, [filters.location]);

  const handleLocationChange = (val) => {
    setLocationInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(f => ({ ...f, location: val }));
    }, 300);
  };

  const hasAny =
    filters.marketType !== '' ||
    filters.location !== '' ||
    filters.minRating !== 0 ||
    filters.verifiedOnly ||
    filters.search !== '';

  const typeOptions = [
    { key: '', label: t.producers.filterAll, icon: faUsers },
    { key: 'b2c', label: t.producers.filterB2C, icon: faCarrot },
    { key: 'b2b', label: t.producers.filterB2B, icon: faTractor },
  ];

  const ratingOptions = [0, 3, 4, 5];

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faFilter} className="text-emerald-600 text-sm" />
          {t.producers.filterTitle}
        </h3>
        {hasAny && (
          <button
            onClick={() => onChange({ marketType: '', location: '', minRating: 0, verifiedOnly: false, search: '' })}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            {t.producers.filterResetAll}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-5 py-4 border-b border-gray-50">
        <div className="relative">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          <input
            type="text"
            placeholder={t.producers.filterLocationPlaceholder}
            value={filters.search}
            onChange={e => onChange(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 transition-colors"
          />
        </div>
      </div>

      {/* Type */}
      <div className="px-4 py-4 border-b border-gray-50">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">
          {t.producers.filterTitle}
        </h4>
        <div className="space-y-1">
          {typeOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => onChange(f => ({ ...f, marketType: opt.key }))}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filters.marketType === opt.key
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
            >
              <FontAwesomeIcon icon={opt.icon} className="text-xs flex-shrink-0" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
          {t.producers.filterLocation}
        </h4>
        <div className="relative">
          <FontAwesomeIcon icon={faLocationDot} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          <input
            type="text"
            placeholder={t.producers.filterLocationPlaceholder}
            value={locationInput}
            onChange={e => handleLocationChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 transition-colors"
          />
        </div>
      </div>

      {/* Rating */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
          {t.producers.filterRating}
        </h4>
        <div className="space-y-1">
          {ratingOptions.map(r => (
            <button
              key={r}
              onClick={() => onChange(f => ({ ...f, minRating: r }))}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${filters.minRating === r
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
            >
              {r === 0 ? (
                t.producers.filterRatingAll
              ) : (
                <span className="flex items-center gap-1">
                  {`${t.producers.filterRating.split(' ')[0]} `}
                  {[...Array(r)].map((_, i) => (
                    <FontAwesomeIcon key={i} icon={faStar} className="text-yellow-400 text-[11px]" />
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Verified only */}
      <div className="px-5 py-4">
        <button
          onClick={() => onChange(f => ({ ...f, verifiedOnly: !f.verifiedOnly }))}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filters.verifiedOnly
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
        >
          <span className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCircleCheck} className={`text-sm ${filters.verifiedOnly ? 'text-emerald-500' : 'text-gray-400'}`} />
            {t.producers.filterVerified}
          </span>
          {/* Toggle pill */}
          <span className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${filters.verifiedOnly ? 'bg-emerald-500' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${filters.verifiedOnly ? 'translate-x-5' : 'translate-x-0'}`} />
          </span>
        </button>
      </div>
    </div>
  );
}

// ── ProducersPage ─────────────────────────────────────────────────────────────
export default function ProducersPage({ session, onNavigate }) {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const filterType = searchParams.get('tip');
  const { producers, loading } = useProducers();
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState({
    marketType: '',
    location: '',
    minRating: 0,
    verifiedOnly: false,
    search: '',
  });

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  // Apply filters
  const filtered = useMemo(() => {
    return producers.filter(p => {
      if (filters.marketType) {
        const mt = p.marketType;
        if (filters.marketType === 'b2c' && mt !== 'b2c' && mt !== 'both') return false;
        if (filters.marketType === 'b2b' && mt !== 'b2b' && mt !== 'both') return false;
      }
      if (filters.location && !p.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.minRating > 0 && p.avgRating < filters.minRating) return false;
      if (filters.verifiedOnly && !p.is_verified) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const nameMatch = p.full_name?.toLowerCase().includes(q);
        const locMatch = p.location?.toLowerCase().includes(q);
        const bioMatch = p.bio?.toLowerCase().includes(q);
        if (!nameMatch && !locMatch && !bioMatch) return false;
      }
      return true;
    });
  }, [producers, filters]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const hasActiveFilters =
    filters.marketType !== '' ||
    filters.location !== '' ||
    filters.minRating !== 0 ||
    filters.verifiedOnly ||
    filters.search !== '';

  const marketTypeLabel = (key) => {
    if (key === 'b2c') return t.producers.filterB2C;
    if (key === 'b2b') return t.producers.filterB2B;
    return '';
  };

  return (
    <div className="bg-gray-100 min-h-screen flex">

      {/* ── Sidebar Desktop ── */}
      <aside className="hidden lg:block flex-shrink-0" style={{ width: '268px' }}>
        <div
          className="sidebar-scroll"
          style={{
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            background: 'white',
            borderRadius: '0 20px 20px 0',
            boxShadow: '6px 0 30px rgba(0,0,0,0.06)',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          <ProducerFilterSidebar filters={filters} onChange={setFilters} t={t} />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 px-6 lg:px-10 py-6 bg-gray-100">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-emerald-600 transition flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faHome} />
            <span>{t.allProducts?.home || 'Acasă'}</span>
          </button>
          <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
          <span className="text-gray-600 font-medium">{t.producers.breadcrumb}</span>
        </div>

        {/* Page title */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{t.producers.pageTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.producers.pageSubtitle}</p>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200 flex-wrap">

          {/* Left: results count + active pills */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="text-sm text-gray-500 flex-shrink-0">
              {loading ? t.producers.loading : (
                <>
                  <span className="font-bold text-emerald-600">{filtered.length}</span>
                  {' '}{filtered.length === 1 ? t.producers.resultsSingular : t.producers.resultsCount}
                </>
              )}
            </span>

            {/* Active filter pills */}
            {filters.marketType && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 flex-shrink-0">
                {marketTypeLabel(filters.marketType)}
                <button onClick={() => setFilters(f => ({ ...f, marketType: '' }))}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {filters.location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 text-white rounded-full text-xs font-semibold flex-shrink-0">
                <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                {filters.location}
                <button onClick={() => setFilters(f => ({ ...f, location: '' }))} className="hover:opacity-70 transition-opacity">
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {filters.minRating > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold border border-yellow-200 flex-shrink-0">
                <FontAwesomeIcon icon={faStar} className="text-[10px] text-yellow-400" />
                {filters.minRating}+
                <button onClick={() => setFilters(f => ({ ...f, minRating: 0 }))}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {filters.verifiedOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 flex-shrink-0">
                <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />
                {t.producers.pillVerified}
                <button onClick={() => setFilters(f => ({ ...f, verifiedOnly: false }))}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 flex-shrink-0">
                {filters.search}
                <button onClick={() => setFilters(f => ({ ...f, search: '' }))}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ marketType: '', location: '', minRating: 0, verifiedOnly: false, search: '' })}
                className="bg-gray-100/50 hover:bg-red-50 border border-gray-200 hover:border-red-100 px-3 py-1 rounded-full text-[11px] font-semibold text-gray-500 hover:text-red-600 transition-all flex-shrink-0"
              >
                {t.producers.filterResetAll}
              </button>
            )}
          </div>

          {/* Right: mobile filters button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-xs font-medium text-gray-600 flex-shrink-0"
          >
            <FontAwesomeIcon icon={faSliders} className="text-xs" />
            {t.producers.mobileFilterBtn}
            {hasActiveFilters && (
              <span className="w-4 h-4 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {[filters.marketType, filters.location, filters.minRating > 0, filters.verifiedOnly, filters.search].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Filters Modal */}
        {showMobileFilters && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50 p-4 flex items-end sm:items-center justify-center">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold">{t.producers.filterTitle}</h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
              <ProducerFilterSidebar
                filters={filters}
                onChange={(val) => {
                  setFilters(val);
                  setShowMobileFilters(false);
                }}
                t={t}
              />
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Metronome size="40" speed="1.6" color="#059669" />
            <p className="text-gray-500 text-sm">{t.producers.loading}</p>
          </div>
        ) : paginated.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
              {paginated.map(producer => (
                <ProducerCard
                  key={producer.id}
                  producer={producer}
                  onNavigate={onNavigate}
                  t={t}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                {[...Array(totalPages)].map((_, idx) => {
                  const p = idx + 1;
                  const show = p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1);
                  const dots = p === currentPage - 2 || p === currentPage + 2;
                  if (show) return (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all duration-200 ${currentPage === p
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200/50 scale-110'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}>
                      {p}
                    </button>
                  );
                  if (dots) return <span key={p} className="w-6 text-center text-gray-300 text-sm">·</span>;
                  return null;
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <FontAwesomeIcon icon={faUsers} className="text-gray-300 text-6xl mb-4" />
            <p className="text-gray-500 text-base mb-2">{t.producers.noResults}</p>
            <p className="text-gray-400 text-sm mb-5">{t.producers.noResultsHint}</p>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ marketType: '', location: '', minRating: 0, verifiedOnly: false, search: '' })}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all"
              >
                {t.producers.resetFilters}
              </button>
            )}
          </div>
        )}
      </main>

      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 99px; }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: #d1fae5; }
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        .sidebar-scroll:hover { scrollbar-color: #d1fae5 transparent; }
      `}</style>
    </div>
  );
}
