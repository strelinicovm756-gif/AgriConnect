import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ProductCard } from '../components/features/ProductCard';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot,
  faAppleWhole,
  faCow,
  faDrumstickBite,
  faEgg,
  faJar,
  faWheatAwn,
  faBoxesStacked,
  faFilter,
  faXmark,
  faHome,
  faChevronRight,
  faCircleCheck,
  faLeaf
} from '@fortawesome/free-solid-svg-icons';

export default function AllProductsPage({ session, onNavigate, initialCategory = null, initialSearch = null, initialSortBy = 'newest' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [profileName, setProfileName] = useState(''); // ADAUGĂ

  // Filters State
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

  // ADAUGĂ: Încarcă numele utilizatorului
  useEffect(() => {
    if (session) {
      loadProfileName();
    }
  }, [session]);

  const loadProfileName = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data?.full_name) {
        setProfileName(data.full_name);
      }
    } catch (error) {
      console.error('Eroare la încărcarea numelui:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filters, currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('products_with_user')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.verified) {
        query = query.eq('seller_verified', true);
      }

      if (filters.negotiable) {
        query = query.eq('is_negotiable', true);
      }

      if (filters.minPrice) {
        query = query.gte('price', parseFloat(filters.minPrice));
      }

      if (filters.maxPrice) {
        query = query.lte('price', parseFloat(filters.maxPrice));
      }

      switch (filters.sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      setProducts(data || []);
      setTotalProducts(count || 0);
    } catch (error) {
      console.error('Eroare:', error);
      toast.error('Eroare la încărcarea produselor');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (productId) => {
    if (session) {
      try {
        await supabase.rpc('increment_product_views', { product_id: productId });
      } catch (error) {
        console.error('Eroare:', error);
      }
      onNavigate('detalii', productId);
    } else {
      onNavigate('login');
    }
  };

  const handleContactClick = async (product) => {
    try {
      await supabase.rpc('increment_product_contacts', { product_id: product.id });

      if (product.seller_phone) {
        const phoneNumber = product.seller_phone.replace(/\s/g, '');
        toast.success(
          <div>
            <p className="font-bold">Contact: {product.seller_name}</p>
            <a href={`tel:${phoneNumber}`} className="text-emerald-400 underline text-lg">
              {product.seller_phone}
            </a>
          </div>,
          { duration: 10000 }
        );
      }
    } catch (error) {
      console.error('Eroare:', error);
    }
  };

  const clearFilter = (filterName) => {
    setFilters({ ...filters, [filterName]: filterName === 'verified' || filterName === 'negotiable' ? false : '' });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      category: null,
      search: '',
      minPrice: '',
      maxPrice: '',
      location: '',
      verified: false,
      negotiable: false,
      sortBy: 'newest'
    });
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    filters.category,
    filters.search,
    filters.minPrice,
    filters.maxPrice,
    filters.location,
    filters.verified,
    filters.negotiable
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  // FUNCȚIE IDENTICĂ CU HOMEPAGE
  const getColorForName = (name, isDark = false) => {
    if (!name) return isDark ? '#059669' : '#10b981';
    const colors = [
      ['#10b981', '#059669'],
      ['#3b82f6', '#2563eb'],
      ['#8b5cf6', '#7c3aed'],
      ['#ec4899', '#db2777'],
      ['#f59e0b', '#d97706'],
      ['#ef4444', '#dc2626'],
      ['#06b6d4', '#0891b2'],
      ['#84cc16', '#65a30d'],
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorPair = colors[hash % colors.length];
    return isDark ? colorPair[1] : colorPair[0];
  };

  // Sidebar Filters Component
  const FilterSidebar = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faFilter} className="text-emerald-600" />
          Filtre
        </h3>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Resetează tot
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categorie</h4>
        <div className="space-y-1">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-lg transition-all ${
                filters.category === cat.id 
                  ? 'bg-emerald-50' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name="category"
                  checked={filters.category === cat.id}
                  onChange={() => {
                    setFilters({ ...filters, category: cat.id });
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                />
              </div>
              <FontAwesomeIcon 
                icon={cat.icon} 
                className={filters.category === cat.id ? 'text-emerald-600' : 'text-gray-400'} 
              />
              <span className={`text-sm ${
                filters.category === cat.id 
                  ? 'text-emerald-700 font-semibold' 
                  : 'text-gray-700'
              }`}>
                {cat.name}
              </span>
            </label>
          ))}
          {filters.category && (
            <button
              onClick={() => clearFilter('category')}
              className="text-xs text-emerald-600 hover:text-emerald-700 ml-9 mt-2"
            >
              Șterge filtru
            </button>
          )}
        </div>
      </div>

      {/* Price Range */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Interval preț (lei)</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => {
                setFilters({ ...filters, minPrice: e.target.value });
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => {
                setFilters({ ...filters, maxPrice: e.target.value });
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
            />
          </div>
          {(filters.minPrice || filters.maxPrice) && (
            <button
              onClick={() => {
                clearFilter('minPrice');
                clearFilter('maxPrice');
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              Șterge interval
            </button>
          )}
        </div>
      </div>

      {/* Location Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Locație</h4>
        <input
          type="text"
          placeholder="Ex: Chișinău"
          value={filters.location}
          onChange={(e) => {
            setFilters({ ...filters, location: e.target.value });
            setCurrentPage(1);
          }}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
        />
      </div>

      {/* Additional Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Opțiuni</h4>
        <div className="space-y-1">
          <label className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-lg transition-all ${
            filters.verified ? 'bg-emerald-50' : 'hover:bg-gray-50'
          }`}>
            <input
              type="checkbox"
              checked={filters.verified}
              onChange={(e) => {
                setFilters({ ...filters, verified: e.target.checked });
                setCurrentPage(1);
              }}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <FontAwesomeIcon 
              icon={faCircleCheck} 
              className={filters.verified ? 'text-emerald-600' : 'text-gray-400'} 
            />
            <span className={`text-sm ${
              filters.verified ? 'text-emerald-700 font-semibold' : 'text-gray-700'
            }`}>
              Doar producători verificați
            </span>
          </label>

          <label className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-lg transition-all ${
            filters.negotiable ? 'bg-emerald-50' : 'hover:bg-gray-50'
          }`}>
            <input
              type="checkbox"
              checked={filters.negotiable}
              onChange={(e) => {
                setFilters({ ...filters, negotiable: e.target.checked });
                setCurrentPage(1);
              }}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className={`text-sm ${
              filters.negotiable ? 'text-emerald-700 font-semibold' : 'text-gray-700'
            }`}>
              Preț negociabil
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white">
    
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-emerald-600 transition flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faHome} />
            Acasă
          </button>
          <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          <span className="text-gray-900 font-medium">
            {filters.category || 'Toate produsele'}
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {filters.category ? `Categorie: ${filters.category}` : 'Toate produsele'}
            </h1>
            <p className="text-gray-600">
              {loading ? 'Se încarcă...' : `${totalProducts} produse găsite`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <FontAwesomeIcon icon={faFilter} />
              Filtre {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            <select
              value={filters.sortBy}
              onChange={(e) => {
                setFilters({ ...filters, sortBy: e.target.value });
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Pills */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.category && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                {filters.category}
                <button onClick={() => clearFilter('category')} className="hover:text-emerald-900">
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                Căutare: {filters.search}
                <button onClick={() => clearFilter('search')} className="hover:text-emerald-900">
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                Preț: {filters.minPrice || '0'} - {filters.maxPrice || '∞'} lei
                <button
                  onClick={() => {
                    clearFilter('minPrice');
                    clearFilter('maxPrice');
                  }}
                  className="hover:text-emerald-900"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </span>
            )}
            {filters.location && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                Locație: {filters.location}
                <button onClick={() => clearFilter('location')} className="hover:text-emerald-900">
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </span>
            )}
            {filters.verified && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                Producători verificați
                <button onClick={() => clearFilter('verified')} className="hover:text-emerald-900">
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </span>
            )}
            {filters.negotiable && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                Preț negociabil
                <button onClick={() => clearFilter('negotiable')} className="hover:text-emerald-900">
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
              <FilterSidebar />
            </div>
          </aside>

          {/* Mobile Filters */}
          {showMobileFilters && (
            <div className="lg:hidden fixed inset-0 bg-black/50 z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Filtre</h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FontAwesomeIcon icon={faXmark} size="lg" />
                  </button>
                </div>
                <FilterSidebar />
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-gray-600">Se încarcă produsele...</p>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700 transition"
                    >
                      Anterior
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNum = index + 1;
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`min-w-[2.5rem] h-10 px-3 rounded-lg font-semibold transition ${
                                currentPage === pageNum
                                  ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700'
                                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return (
                            <span key={pageNum} className="text-gray-400 px-2">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700 transition"
                    >
                      Următor
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <FontAwesomeIcon icon={faBoxesStacked} className="text-gray-400 text-6xl mb-4" />
                <p className="text-gray-600 text-lg mb-4">Nu am găsit produse care să corespundă criteriilor</p>
                <Button onClick={clearAllFilters} className="bg-emerald-600 hover:bg-emerald-700">
                  Resetează filtrele
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}