import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { ProductCard } from '../components/features/ProductCard';
import toast from 'react-hot-toast';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot, faAppleWhole, faCow, faDrumstickBite, faEgg,
  faJar, faWheatAwn, faBoxesStacked, faFilter, faXmark, faMapMarkerAlt,
  faHome, faChevronRight, faCircleCheck, faCheck
} from '@fortawesome/free-solid-svg-icons';

const globalCSS = `
  .sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 99px; }
  .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: #d1fae5; }
  .sidebar-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
  .sidebar-scroll:hover { scrollbar-color: #d1fae5 transparent; }

  .price-slider-track {
    position: relative;
    height: 4px;
    background: #e5e7eb;
    border-radius: 99px;
    margin: 8px 0;
  }
  .price-slider-fill {
    position: absolute;
    height: 100%;
    background: #059669;
    border-radius: 99px;
  }
  .price-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    width: 100%;
    height: 4px;
    background: transparent;
    pointer-events: none;
    top: 0;
    left: 0;
  }
  .price-slider-thumb::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    border: 2.5px solid #059669;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    cursor: pointer;
    pointer-events: all;
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .price-slider-thumb::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 6px rgba(5,150,105,0.12);
  }
  .price-slider-thumb::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    border: 2.5px solid #059669;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    cursor: pointer;
    pointer-events: all;
  }
`;

const PRICE_MAX = 5000;

function PriceRangeFilter({ initialMin, initialMax, onApply, onClear }) {
  const [localMin, setLocalMin] = useState(initialMin || '');
  const [localMax, setLocalMax] = useState(initialMax || '');
  const [error, setError] = useState('');

  // Sincronizare cand filtrele externe sunt resetate
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
    if (nMin > nMax) {
      setError('Minimul nu poate fi mai mare decât maximul.');
      return false;
    }
    setError('');
    return true;
  };

  const handleMinInput = (val) => {
    const v = val.replace(/[^0-9]/g, '');
    setLocalMin(v);
    validate(v, localMax);
  };

  const handleMaxInput = (val) => {
    const v = val.replace(/[^0-9]/g, '');
    setLocalMax(v);
    validate(localMin, v);
  };

  const handleSliderMin = (e) => {
    const v = Math.min(parseInt(e.target.value), numMax - 1);
    setLocalMin(v === 0 ? '' : String(v));
    setError('');
  };

  const handleSliderMax = (e) => {
    const v = Math.max(parseInt(e.target.value), numMin + 1);
    setLocalMax(v === PRICE_MAX ? '' : String(v));
    setError('');
  };

  const handleApply = () => {
    if (!validate(localMin, localMax)) return;
    onApply(localMin, localMax);
  };

  const handleClear = () => {
    setLocalMin('');
    setLocalMax('');
    setError('');
    onClear();
  };

  const fillLeft = (numMin / PRICE_MAX) * 100;
  const fillRight = 100 - (numMax / PRICE_MAX) * 100;
  const hasValue = localMin !== '' || localMax !== '';
  const isDirty = localMin !== (initialMin || '') || localMax !== (initialMax || '');

  return (
    <div>
      {/* Inputuri Min / Max */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Min"
            value={localMin}
            onChange={(e) => handleMinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 transition-colors ${error ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'
              }`}
          />
        </div>
        <div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Max"
            value={localMax}
            onChange={(e) => handleMaxInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 transition-colors ${error ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'
              }`}
          />
        </div>
      </div>

      {/* Eroare validare */}
      {error && (
        <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
          {error}
        </p>
      )}

      {/* Slider dual */}
      <div className="px-1 mb-4">
        <div className="price-slider-track">
          <div
            className="price-slider-fill"
            style={{ left: `${fillLeft}%`, right: `${fillRight}%` }}
          />
          <input
            type="range"
            min={0} max={PRICE_MAX} step={10}
            value={numMin}
            onChange={handleSliderMin}
            className="price-slider-thumb"
          />
          <input
            type="range"
            min={0} max={PRICE_MAX} step={10}
            value={numMax}
            onChange={handleSliderMax}
            className="price-slider-thumb"
          />
        </div>
      </div>

      {/* Butoane Aplica / sterge */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={!!error || !isDirty}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          Aplica
        </button>
        {hasValue && (
          <button
            onClick={handleClear}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-all"
          >
            Șterge
          </button>
        )}
      </div>
    </div>
  );
}


function FilterSidebar({
  filters, categories, activeFiltersCount,
  onCategoryChange, onLocationChange, onVerifiedChange, onNegotiableChange,
  onClearFilter, onClearAll, onPriceApply, onPriceClear
}) {
  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faFilter} className="text-emerald-600 text-sm" />
          Filtre
        </h3>
        {activeFiltersCount > 0 && (
          <button onClick={onClearAll} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
            Resetează tot
          </button>
        )}
      </div>

      {/* CATEGORIE */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Categorie</h4>
        <div className="space-y-0.5">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className={`flex items-center gap-3 cursor-pointer px-2 py-2.5 rounded-lg transition-all duration-150 ${filters.category === cat.id
                ? 'bg-emerald-50 border-l-[3px] border-emerald-500 pl-[5px]'
                : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                }`}
            >
              <input
                type="radio"
                name="category"
                checked={filters.category === cat.id}
                onChange={() => onCategoryChange(cat.id)}
                className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500 flex-shrink-0"
              />
              <FontAwesomeIcon
                icon={cat.icon}
                className={`text-sm ${filters.category === cat.id ? 'text-emerald-600' : 'text-gray-400'}`}
              />
              <span className={`text-sm ${filters.category === cat.id ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
                {cat.name}
              </span>
            </label>
          ))}
          {filters.category && (
            <button onClick={() => onClearFilter('category')} className="text-xs text-emerald-600 hover:text-emerald-700 ml-9 mt-1">
              Șterge filtru
            </button>
          )}
        </div>
      </div>

      {/* INTERVAL PREȚ cu slider dual */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Interval preț (lei)</h4>
        <PriceRangeFilter
          initialMin={filters.minPrice}
          initialMax={filters.maxPrice}
          onApply={onPriceApply}
          onClear={onPriceClear}
        />
      </div>

      {/* LOCAȚIE */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Locație</h4>
        <input
          type="text"
          placeholder="Ex: Chișinău"
          value={filters.location}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
        />
      </div>

      {/* OPȚIUNI */}
      <div className="px-5 py-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Opțiuni</h4>
        <div className="space-y-0.5">
          {/* <label className={`flex items-center gap-3 cursor-pointer px-2 py-2.5 rounded-lg transition-all duration-150 ${filters.verified ? 'bg-emerald-50 border-l-[3px] border-emerald-500 pl-[5px]' : 'hover:bg-gray-50 border-l-[3px] border-transparent'
            }`}>
            <input
              type="checkbox"
              checked={filters.verified}
              onChange={(e) => onVerifiedChange(e.target.checked)}
              className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 flex-shrink-0"
            />
            <FontAwesomeIcon icon={faCircleCheck} className={filters.verified ? 'text-emerald-600 text-sm' : 'text-gray-400 text-sm'} />
            <span className={`text-sm ${filters.verified ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
              Producători verificați
            </span>
          </label> */}

          <label className={`flex items-center gap-3 cursor-pointer px-2 py-2.5 rounded-lg transition-all duration-150 ${filters.negotiable ? 'bg-emerald-50 border-l-[3px] border-emerald-500 pl-[5px]' : 'hover:bg-gray-50 border-l-[3px] border-transparent'
            }`}>
            <input
              type="checkbox"
              checked={filters.negotiable}
              onChange={(e) => onNegotiableChange(e.target.checked)}
              className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 flex-shrink-0"
            />
            <span className={`text-sm ${filters.negotiable ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
              Preț negociabil
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}


export default function AllProductsPage({
  session, onNavigate,
  initialCategory = null, initialSearch = null, initialSortBy = 'newest'
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState({
    category: initialCategory || null,
    search: initialSearch || '',
    minPrice: '',
    maxPrice: '',
    location: '',
    verified: false,
    negotiable: false,
    sortBy: initialSortBy || 'newest'
  });

  const ITEMS_PER_PAGE = 12;

  const categories = [
    { id: 'Legume', name: 'Legume', icon: faCarrot },
    { id: 'Fructe', name: 'Fructe', icon: faAppleWhole },
    { id: 'Lactate', name: 'Lactate', icon: faCow },
    { id: 'Carne', name: 'Carne', icon: faDrumstickBite },
    { id: 'Ouă', name: 'Ouă', icon: faEgg },
    { id: 'Miere', name: 'Miere', icon: faJar },
    { id: 'Cereale', name: 'Cereale', icon: faWheatAwn },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Cele mai noi' },
    { value: 'price_asc', label: 'Preț crescător' },
    { value: 'price_desc', label: 'Preț descrescător' },
  ];

  useEffect(() => { fetchProducts(); }, [filters, currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('products_with_user')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.search) query = query.ilike('name', `%${filters.search}%`);
      if (filters.location) query = query.ilike('location', `%${filters.location}%`);
      if (filters.verified) query = query.eq('seller_verified', true);
      if (filters.negotiable) query = query.eq('is_negotiable', true);
      if (filters.minPrice) query = query.gte('price', parseFloat(filters.minPrice));
      if (filters.maxPrice) query = query.lte('price', parseFloat(filters.maxPrice));

      switch (filters.sortBy) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      setProducts(data || []);
      setTotalProducts(count || 0);
    } catch (err) {
      toast.error('Eroare la încărcarea produselor');
    } finally {
      setLoading(false);
    }
  };

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

  const clearFilter = useCallback((name) => {
    setFilters(prev => ({
      ...prev,
      [name]: name === 'verified' || name === 'negotiable' ? false : name === 'category' ? null : ''
    }));
    setCurrentPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ category: null, search: '', minPrice: '', maxPrice: '', location: '', verified: false, negotiable: false, sortBy: 'newest' });
    setCurrentPage(1);
  }, []);


  const handleCategoryChange = useCallback((id) => { setFilters(p => ({ ...p, category: id })); setCurrentPage(1); }, []);
  const handleLocationChange = useCallback((v) => { setFilters(p => ({ ...p, location: v })); setCurrentPage(1); }, []);
  const handleVerifiedChange = useCallback((v) => { setFilters(p => ({ ...p, verified: v })); setCurrentPage(1); }, []);
  const handleNegotiableChange = useCallback((v) => { setFilters(p => ({ ...p, negotiable: v })); setCurrentPage(1); }, []);

  const handlePriceApply = useCallback((min, max) => {
    setFilters(p => ({ ...p, minPrice: min, maxPrice: max }));
    setCurrentPage(1);
  }, []);

  const handlePriceClear = useCallback(() => {
    setFilters(p => ({ ...p, minPrice: '', maxPrice: '' }));
    setCurrentPage(1);
  }, []);

  const activeFiltersCount = [
    filters.category, filters.search, filters.minPrice,
    filters.maxPrice, filters.location, filters.verified, filters.negotiable
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
  const NAVBAR_H = 64;

  return (
    <div className="bg-gray-50 min-h-screen flex">
      <style>{globalCSS}</style>

      <aside className="hidden lg:block flex-shrink-0" style={{ width: '260px' }}>
        <div
          className="sidebar-scroll"
          style={{
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            background: 'white',
            borderRadius: '0 20px 20px 0',
            boxShadow: '6px 0 24px rgba(0,0,0,0.07)',
            borderRight: '1px solid #ecfdf5',
          }}
        >
          <FilterSidebar
            filters={filters}
            categories={categories}
            activeFiltersCount={activeFiltersCount}
            onCategoryChange={handleCategoryChange}
            onLocationChange={handleLocationChange}
            onVerifiedChange={handleVerifiedChange}
            onNegotiableChange={handleNegotiableChange}
            onClearFilter={clearFilter}
            onClearAll={clearAllFilters}
            onPriceApply={handlePriceApply}
            onPriceClear={handlePriceClear}
          />
        </div>
      </aside>

      <main
        className="flex-1 min-w-0 px-6 lg:px-10 py-6"
        style={{ overflowY: 'auto', height: '100%' }}
      >
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button onClick={() => onNavigate('home')} className="hover:text-emerald-600 transition flex items-center gap-1">
            <FontAwesomeIcon icon={faHome} /> Acasă
          </button>
          <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          <span className="text-gray-900 font-medium">{filters.category || 'Toate produsele'}</span>
        </div>

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {filters.category ? `Categorie: ${filters.category}` : 'Toate produsele'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {loading ? 'Se încarcă...' : (
                <><span className="text-emerald-600 font-bold">{totalProducts}</span> produse găsite</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
            >
              <FontAwesomeIcon icon={faFilter} />
              Filtre {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>
            <select
              value={filters.sortBy}
              onChange={(e) => { setFilters(p => ({ ...p, sortBy: e.target.value })); setCurrentPage(1); }}
              className="text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              style={{ width: 'fit-content' }}
            >
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Active Filter Pills */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {filters.category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                {filters.category}
                <button onClick={() => clearFilter('category')}><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></button>
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                Căutare: {filters.search}
                <button onClick={() => clearFilter('search')}><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                Preț: {filters.minPrice || '0'} – {filters.maxPrice || '∞'} lei
                <button onClick={handlePriceClear}><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></button>
              </span>
            )}
            {filters.location && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00a669] text-white rounded-full text-xs font-bold shadow-sm">
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[11px]" />
                  <span className="uppercase tracking-wider">{filters.location}</span>
                </div>
                <div className="w-[1px] h-3 bg-white/30 mx-0.5"></div>
                <button onClick={() => clearFilter('location')} className="hover:opacity-70 transition-opacity">
                  <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                </button>
              </span>
            )}
            {filters.verified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                ✓ Verificați
                <button onClick={() => clearFilter('verified')}><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></button>
              </span>
            )}
            {filters.negotiable && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                Negociabil
                <button onClick={() => clearFilter('negotiable')}><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></button>
              </span>
            )}
          </div>
        )}

        {/* Mobile Filters Modal */}
        {showMobileFilters && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50 p-4">
            <div className="bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-bold">Filtre</h3>
                <button onClick={() => setShowMobileFilters(false)} className="text-gray-400 hover:text-gray-600">
                  <FontAwesomeIcon icon={faXmark} size="lg" />
                </button>
              </div>
              <FilterSidebar
                filters={filters}
                categories={categories}
                activeFiltersCount={activeFiltersCount}
                onCategoryChange={handleCategoryChange}
                onLocationChange={handleLocationChange}
                onVerifiedChange={handleVerifiedChange}
                onNegotiableChange={handleNegotiableChange}
                onClearFilter={clearFilter}
                onClearAll={clearAllFilters}
                onPriceApply={handlePriceApply}
                onPriceClear={handlePriceClear}
              />
            </div>
          </div>
        )}

        {/* Grid Produse */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Metronome size="40" speed="1.6" color="#059669" />
            <p className="text-gray-500 text-sm">Se încarcă produsele...</p>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
                >
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
                        }`}
                    >{p}</button>
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
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
            <FontAwesomeIcon icon={faBoxesStacked} className="text-gray-300 text-6xl mb-4" />
            <p className="text-gray-500 text-base mb-4">Nu am găsit produse care să corespundă criteriilor</p>
            <button
              onClick={clearAllFilters}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all"
            >
              Resetează filtrele
            </button>
          </div>
        )}
      </main>
    </div>
  );
}