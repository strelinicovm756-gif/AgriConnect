import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/features/ProductCard';
import toast from 'react-hot-toast';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot, faAppleWhole, faCow, faDrumstickBite, faEgg,
  faJar, faWheatAwn, faBoxesStacked, faFilter, faXmark, faMapMarkerAlt,
  faHome, faChevronRight, faChevronDown, faSeedling, faLeaf,
  faTractor, faFlask, faWrench, faDroplet
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../i18n/LanguageContext';

const globalCSS = `
  @keyframes dropdownIn {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 99px; }
  .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: #d1fae5; }
  .sidebar-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
  .sidebar-scroll:hover { scrollbar-color: #d1fae5 transparent; }

  .price-slider-track {
    position: relative; height: 4px; background: #e5e7eb;
    border-radius: 99px; margin: 8px 0;
  }
  .price-slider-fill {
    position: absolute; height: 100%;
    background: #059669; border-radius: 99px;
  }
  .price-slider-thumb {
    -webkit-appearance: none; appearance: none;
    position: absolute; width: 100%; height: 4px;
    background: transparent; pointer-events: none; top: 0; left: 0;
  }
  .price-slider-thumb::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 18px; height: 18px; border-radius: 50%;
    background: white; border: 2.5px solid #059669;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    cursor: pointer; pointer-events: all;
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .price-slider-thumb::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 6px rgba(5,150,105,0.12);
  }
  .price-slider-thumb::-moz-range-thumb {
    width: 18px; height: 18px; border-radius: 50%;
    background: white; border: 2.5px solid #059669;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    cursor: pointer; pointer-events: all;
  }

  .subcategory-enter { animation: subcatIn 0.2s ease-out; }
  @keyframes subcatIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const PRICE_MAX = 5000;

// ── Icon map: DB string → FontAwesome component ───────────────
const ICON_MAP = {
  faCarrot, faAppleWhole, faCow, faDrumstickBite,
  faEgg, faJar, faWheatAwn, faSeedling, faLeaf,
  faTractor, faFlask, faWrench, faDroplet
};

// ── Price Range Filter ────────────────────────────────────────
function PriceRangeFilter({ initialMin, initialMax, onApply, onClear }) {
  const { t } = useLanguage();
  const [localMin, setLocalMin] = useState(initialMin || '');
  const [localMax, setLocalMax] = useState(initialMax || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalMin(initialMin || '');
    setLocalMax(initialMax || '');
    setError('');
  }, [initialMin, initialMax]);

  const numMin = localMin === '' ? 0 : parseInt(localMin, 10);
  const numMax = localMax === '' ? PRICE_MAX : parseInt(localMax, 10);

  const validate = (min, max) => {
    const nMin = min === '' ? 0 : parseInt(min, 10);
    const nMax = max === '' ? PRICE_MAX : parseInt(max, 10);
    if (nMin > nMax) { setError(t.allProducts.minCannotExceedMax); return false; }
    setError(''); return true;
  };

  const handleSliderMin = (e) => {
    const v = Math.min(parseInt(e.target.value), numMax - 1);
    setLocalMin(v === 0 ? '' : String(v)); setError('');
  };
  const handleSliderMax = (e) => {
    const v = Math.max(parseInt(e.target.value), numMin + 1);
    setLocalMax(v === PRICE_MAX ? '' : String(v)); setError('');
  };

  const fillLeft = (numMin / PRICE_MAX) * 100;
  const fillRight = 100 - (numMax / PRICE_MAX) * 100;
  const hasValue = localMin !== '' || localMax !== '';
  const isDirty = localMin !== (initialMin || '') || localMax !== (initialMax || '');

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input type="text" inputMode="numeric" placeholder="Min" value={localMin}
          onChange={(e) => { setLocalMin(e.target.value.replace(/\D/g, '')); validate(e.target.value, localMax); }}
          onKeyDown={(e) => e.key === 'Enter' && validate(localMin, localMax) && onApply(localMin, localMax)}
          className={`w-full px-3 py-2 bg-gray-100 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white placeholder:text-gray-400 transition-colors ${error ? 'border-red-300' : 'border-gray-200'}`} />
        <input type="text" inputMode="numeric" placeholder="Max" value={localMax}
          onChange={(e) => { setLocalMax(e.target.value.replace(/\D/g, '')); validate(localMin, e.target.value); }}
          onKeyDown={(e) => e.key === 'Enter' && validate(localMin, localMax) && onApply(localMin, localMax)}
          className={`w-full px-3 py-2 bg-gray-100 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white placeholder:text-gray-400 transition-colors ${error ? 'border-red-300' : 'border-gray-200'}`} />
      </div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <div className="px-1 mb-4">
        <div className="price-slider-track">
          <div className="price-slider-fill" style={{ left: `${fillLeft}%`, right: `${fillRight}%` }} />
          <input type="range" min={0} max={PRICE_MAX} step={10} value={numMin} onChange={handleSliderMin} className="price-slider-thumb" />
          <input type="range" min={0} max={PRICE_MAX} step={10} value={numMax} onChange={handleSliderMax} className="price-slider-thumb" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => validate(localMin, localMax) && onApply(localMin, localMax)}
          disabled={!!error || !isDirty}
          className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {t.allProducts.apply}
        </button>
        {hasValue && (
          <button onClick={() => { setLocalMin(''); setLocalMax(''); setError(''); onClear(); }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-all">
            {t.allProducts.clear}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Category Accordion Item ───────────────────────────────────
function CategoryAccordionItem({ cat, selectedCategory, onSelect }) {
  const hasSubs = cat.subs && cat.subs.length > 0;

  const isSubSelected = hasSubs && cat.subs.some(s => s.id === selectedCategory);
  const isDirectSelected = !hasSubs && selectedCategory === cat.id;
  const isActive = isSubSelected || isDirectSelected;

  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const handleParentClick = () => {
    if (!hasSubs) {
      onSelect(isDirectSelected ? null : cat.id);
    } else {
      setOpen(prev => !prev);
    }
  };

  return (
    <div>
      {/* Parent row */}
      <button
        onClick={handleParentClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left
          ${isActive
            ? 'bg-emerald-50 border-l-[3px] border-emerald-500 pl-[9px]'
            : 'hover:bg-gray-50 border-l-[3px] border-transparent'
          }`}
      >
        <FontAwesomeIcon
          icon={cat.icon}
          className={`text-sm flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}
        />
        <span className={`text-sm flex-1 ${isActive ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
          {cat.name}
        </span>
        {hasSubs && (
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`text-[10px] text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Subcategories */}
      {hasSubs && open && (
        <div className="subcategory-enter ml-4 mt-0.5 mb-1 border-l-2 border-gray-100 pl-3 space-y-0.5">
          {cat.subs.map(sub => {
            const isSubActive = selectedCategory === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => onSelect(isSubActive ? null : sub.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 text-left
                  ${isSubActive
                    ? 'bg-emerald-100 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <span className="text-xs">{sub.name}</span>
                {isSubActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Filter Sidebar ────────────────────────────────────────────
function FilterSidebar({
  filters, activeFiltersCount, dbCategories,
  onCategoryChange, onLocationChange, onNegotiableChange,
  onClearFilter, onClearAll, onPriceApply, onPriceClear
}) {
  const { t } = useLanguage();
  // Build accordion-ready structures from DB categories
  const b2cCats = dbCategories
    .filter(c => c.market_type !== 'b2b')
    .map(c => ({
      id: c.id,
      name: c.name,
      icon: ICON_MAP[c.icon] ?? faBoxesStacked,
      subs: (c.subcategories || []).map(s => ({
        id: s.id,
        name: s.name,
        icon: ICON_MAP[c.icon] ?? faBoxesStacked
      }))
    }));

  const b2bCats = dbCategories
    .filter(c => c.market_type !== 'b2c')
    .map(c => ({
      id: c.id,
      name: c.name,
      icon: ICON_MAP[c.icon] ?? faTractor,
      subs: (c.subcategories || []).map(s => ({
        id: s.id,
        name: s.name,
        icon: ICON_MAP[c.icon] ?? faTractor
      }))
    }));

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faFilter} className="text-emerald-600 text-sm" />
          {t.allProducts.filters}
        </h3>
        {activeFiltersCount > 0 && (
          <button onClick={onClearAll} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
            {t.allProducts.resetAll}
          </button>
        )}
      </div>

      {/* CATEGORII cu accordion */}
      <div className="px-4 py-4 border-b border-gray-50">
        {/* Produse Alimentare */}
        <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 px-1">{t.allProducts.foodProductsCategory}</h4>
        <div className="space-y-0.5">
          {b2cCats.map(cat => (
            <CategoryAccordionItem
              key={cat.id}
              cat={cat}
              selectedCategory={filters.categoryId}
              onSelect={onCategoryChange}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-100 my-3" />

        {/* Servicii & Utilități */}
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">{t.allProducts.servicesCategory}</h4>
        <div className="space-y-0.5">
          {b2bCats.map(cat => (
            <CategoryAccordionItem
              key={cat.id}
              cat={cat}
              selectedCategory={filters.categoryId}
              onSelect={onCategoryChange}
            />
          ))}
        </div>

        {filters.categoryId && (
          <button onClick={() => onClearFilter('categoryId')}
            className="text-xs text-emerald-600 hover:text-emerald-700 mt-2 ml-1">
            {t.allProducts.clearCategoryFilter}
          </button>
        )}
      </div>

      {/* PREȚ */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{t.allProducts.priceRange}</h4>
        <PriceRangeFilter
          initialMin={filters.minPrice}
          initialMax={filters.maxPrice}
          onApply={onPriceApply}
          onClear={onPriceClear}
        />
      </div>

      {/* LOCAȚIE */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{t.allProducts.location}</h4>
        <input
          type="text"
          placeholder={t.allProducts.locationPlaceholder}
          value={filters.location}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400"
        />
      </div>

      {/* OPȚIUNI */}
      <div className="px-5 py-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{t.allProducts.options}</h4>
        <label className={`flex items-center gap-3 cursor-pointer px-2 py-2.5 rounded-xl transition-all duration-150
          ${filters.isNegotiable ? 'bg-emerald-50 border-l-[3px] border-emerald-500 pl-[5px]' : 'hover:bg-gray-50 border-l-[3px] border-transparent'}`}>
          <input type="checkbox" checked={filters.isNegotiable}
            onChange={(e) => onNegotiableChange(e.target.checked)}
            className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 flex-shrink-0" />
          <span className={`text-sm ${filters.isNegotiable ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
            {t.allProducts.negotiablePrice}
          </span>
        </label>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AllProductsPage({ session, onNavigate }) {
  const { t } = useLanguage();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [dbCategories, setDbCategories] = useState([]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    search: searchParams.get('cautare') || '',
    categoryId: searchParams.get('categorie') || '',
    location: searchParams.get('locatie') || '',
    minPrice: searchParams.get('pretMin') || '',
    maxPrice: searchParams.get('pretMax') || '',
    isNegotiable: searchParams.get('negociabil') === 'true',
    sortBy: searchParams.get('sortare') || 'newest',
    type: searchParams.get('tip') || '',
    verified: searchParams.get('verificat') === 'true',
    page: parseInt(searchParams.get('pagina') || '1', 10),
  };

  const updateFilters = (updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);

      Object.entries(updates).forEach(([key, value]) => {
        const paramKey = {
          search: 'cautare',
          categoryId: 'categorie',
          location: 'locatie',
          minPrice: 'pretMin',
          maxPrice: 'pretMax',
          isNegotiable: 'negociabil',
          sortBy: 'sortare',
          type: 'tip',
          verified: 'verificat',
          page: 'pagina',
        }[key];

        if (!paramKey) return;

        if (value === '' || value === false || value === null || value === undefined || value === 'newest' || value === 1) {
          next.delete(paramKey);
        } else {
          next.set(paramKey, String(value));
        }
      });

      if (!('page' in updates)) {
        next.delete('pagina');
      }

      return next;
    });
  };

  const clearFilter = (key) => updateFilters({ [key]: '' });

  const clearAllFilters = () => setSearchParams({});

  const ITEMS_PER_PAGE = 12;

  const sortOptions = [
    { value: 'newest', label: t.allProducts.newest },
    { value: 'price_asc', label: t.allProducts.priceLowHigh },
    { value: 'price_desc', label: t.allProducts.priceHighLow },
  ];

  const b2bIds = dbCategories.filter(c => c.market_type !== 'b2c').map(c => c.id);

  const { products, loading, totalProducts } = useProducts({ ...filters, b2bIds });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*, subcategories(id, name, slug)')
        .eq('is_active', true)
        .order('sort_order');
      if (data) setDbCategories(data);
    };
    fetchCategories();
  }, []);

  const handleViewDetails = async (productId) => {
    if (session) {
      try { await supabase.rpc('increment_product_views', { product_id: productId }); } catch { }
      onNavigate('detalii', productId);
    } else {
      onNavigate('login');
    }
  };

  const handleContactClick = async (product) => {
    try {
      await supabase.rpc('increment_product_contacts', { product_id: product.id });
      if (product.seller_phone) {
        const phone = product.seller_phone.replace(/\s/g, '');
        toast.success(
          <div>
            <p className="font-bold">Contact: {product.seller_name}</p>
            <a href={`tel:${phone}`} className="text-emerald-400 underline text-lg">{product.seller_phone}</a>
          </div>,
          { duration: 10000 }
        );
      }
    } catch { }
  };

  const activeFiltersCount = [
    filters.categoryId, filters.search, filters.minPrice,
    filters.maxPrice, filters.location, filters.isNegotiable, filters.type
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  const getCategoryDisplayName = (id) => {
    if (!id) return null;
    for (const cat of dbCategories) {
      if (cat.id === id) return cat.name;
      const sub = (cat.subcategories || []).find(s => s.id === id);
      if (sub) return `${cat.name} → ${sub.name}`;
    }
    return id;
  };

  const getPageTitle = () => {
    if (filters.categoryId) return getCategoryDisplayName(filters.categoryId);
    if (filters.type === 'b2b') return t.allProducts.titleServices;
    if (filters.type === 'b2c') return t.allProducts.titleFoodProducts;
    return t.allProducts.title;
  };

  return (
    <div className="bg-gray-100 min-h-screen flex">
      <style>{globalCSS}</style>

      {/* ── Sidebar Desktop ── */}
      <aside className="hidden lg:block flex-shrink-0" style={{ width: '268px' }}>
        <div
          className="sidebar-scroll"
          style={{
            position: 'sticky', top: '64px',
            height: 'calc(100vh - 64px)', overflowY: 'auto',
            background: 'white',
            borderRadius: '0 20px 20px 0',
            boxShadow: '6px 0 30px rgba(0,0,0,0.06)',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          <FilterSidebar
            filters={filters}
            activeFiltersCount={activeFiltersCount}
            dbCategories={dbCategories}
            onCategoryChange={(id) => updateFilters({ categoryId: id || '', type: '' })}
            onLocationChange={(v) => updateFilters({ location: v })}
            onNegotiableChange={(v) => updateFilters({ isNegotiable: v })}
            onClearFilter={clearFilter}
            onClearAll={clearAllFilters}
            onPriceApply={(min, max) => updateFilters({ minPrice: min, maxPrice: max })}
            onPriceClear={() => updateFilters({ minPrice: '', maxPrice: '' })}
          />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 px-6 lg:px-10 py-6 bg-gray-100" style={{ overflowY: 'auto' }}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-emerald-600 transition flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faHome} />
            <span>{t.allProducts.home}</span>
          </button>
          <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
          <span className="text-gray-600 font-medium">{getPageTitle()}</span>
        </div>

        {/* Page title */}
        <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4">
          {getPageTitle()}
        </h1>

        {/* Action bar — filters left, sort right */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200">

          {/* Left: active filter pills + results count */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {/* Results count pill */}
            <span className="text-sm text-gray-500 flex-shrink-0">
              {loading ? (
                t.allProducts.loading
              ) : (
                <>
                  <span className="font-bold text-emerald-600">{totalProducts}</span>
                  {' '}{t.allProducts.productsFound}
                </>
              )}
            </span>

            {/* Active filter pills */}
            {filters.categoryId && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 flex-shrink-0">
                {getCategoryDisplayName(filters.categoryId)}
                <button onClick={() => clearFilter('categoryId')}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 flex-shrink-0">
                {filters.search}
                <button onClick={() => clearFilter('search')}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 flex-shrink-0">
                {filters.minPrice || '0'} – {filters.maxPrice || '∞'} lei
                <button onClick={() => updateFilters({ minPrice: '', maxPrice: '' })}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {filters.location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 text-white rounded-full text-xs font-semibold flex-shrink-0">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px]" />
                {filters.location}
                <button onClick={() => clearFilter('location')} className="hover:opacity-70 transition-opacity">
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {filters.isNegotiable && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 flex-shrink-0">
                {t.allProducts.negotiable}
                <button onClick={() => clearFilter('isNegotiable')}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {filters.type && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${filters.type === 'b2c'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-700 text-white border-emerald-700'
                }`}>
                {filters.type === 'b2b' ? t.allProducts.titleServices : t.allProducts.titleFoodProducts}
                <button onClick={() => clearFilter('type')}>
                  <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
              </span>
            )}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="bg-gray-100/50 hover:bg-red-50 border border-gray-200 hover:border-red-100 px-3 py-1 rounded-full text-[11px] font-semibold text-gray-500 hover:text-red-600 transition-all flex-shrink-0"
              >
                {t.allProducts.resetAll}
              </button>
            )}
          </div>

          {/* Right: mobile filters button + sort */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-xs font-medium text-gray-600"
            >
              <FontAwesomeIcon icon={faFilter} className="text-xs" />
              {t.allProducts.filters}
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort — custom animated dropdown */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                onClick={() => setShowSortDropdown(p => !p)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${showSortDropdown
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
              >
                <FontAwesomeIcon
                  icon={faFilter}
                  className={`text-xs transition-colors ${showSortDropdown ? 'text-white' : 'text-gray-400'}`}
                  style={{ transform: 'rotate(90deg)' }}
                />
                <span>{sortOptions.find(o => o.value === filters.sortBy)?.label}</span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-[10px] transition-all duration-300 ${showSortDropdown ? 'rotate-180 text-white' : 'text-gray-400'}`}
                />
              </button>

              {showSortDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20"
                  style={{ animation: 'dropdownIn 0.18s ease-out forwards' }}
                >
                  {sortOptions.map((option, idx) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        updateFilters({ sortBy: option.value });
                        setShowSortDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left ${filters.sortBy === option.value
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                        } ${idx !== sortOptions.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                      <span>{option.label}</span>
                      {filters.sortBy === option.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Filters Modal */}
        {showMobileFilters && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50 p-4 flex items-end sm:items-center justify-center">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold">{t.allProducts.filtersTitle}</h3>
                <button onClick={() => setShowMobileFilters(false)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
              <FilterSidebar
                filters={filters}
                activeFiltersCount={activeFiltersCount}
                dbCategories={dbCategories}
                onCategoryChange={(id) => { updateFilters({ categoryId: id || '', type: '' }); setShowMobileFilters(false); }}
                onLocationChange={(v) => updateFilters({ location: v })}
                onNegotiableChange={(v) => updateFilters({ isNegotiable: v })}
                onClearFilter={clearFilter}
                onClearAll={clearAllFilters}
                onPriceApply={(min, max) => updateFilters({ minPrice: min, maxPrice: max })}
                onPriceClear={() => updateFilters({ minPrice: '', maxPrice: '' })}
              />
            </div>
          </div>
        )}

        {/* Grid Produse */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Metronome size="40" speed="1.6" color="#059669" />
            <p className="text-gray-500 text-sm">{t.allProducts.loadingProducts}</p>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
              {products.map((product) => (
                <div key={product.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.10)] hover:border-emerald-200 transition-all duration-300">
                  <ProductCard
                    product={product}
                    session={session}
                    onViewDetails={handleViewDetails}
                    onContactClick={handleContactClick}
                  />
                </div>
              ))}
            </div>

            {/* Paginație */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-4">
                <button onClick={() => updateFilters({ page: filters.page - 1 })} disabled={filters.page === 1}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                {[...Array(totalPages)].map((_, idx) => {
                  const p = idx + 1;
                  const show = p === 1 || p === totalPages || (p >= filters.page - 1 && p <= filters.page + 1);
                  const dots = p === filters.page - 2 || p === filters.page + 2;
                  if (show) return (
                    <button key={p} onClick={() => updateFilters({ page: p })}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all duration-200 ${filters.page === p
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200/50 scale-110'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'}`}>
                      {p}
                    </button>
                  );
                  if (dots) return <span key={p} className="w-6 text-center text-gray-300 text-sm">·</span>;
                  return null;
                })}
                <button onClick={() => updateFilters({ page: filters.page + 1 })} disabled={filters.page === totalPages}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <FontAwesomeIcon icon={faBoxesStacked} className="text-gray-300 text-6xl mb-4" />
            <p className="text-gray-500 text-base mb-4">{t.allProducts.noProductsFound}</p>
            <button onClick={clearAllFilters}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all">
              {t.allProducts.resetFilters}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
