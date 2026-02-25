import { useState, useEffect, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faUser, faRightFromBracket, faChevronDown, faLeaf,
  faMagnifyingGlass, faLocationDot, faFilter, faTimes, faChevronRight,
  faCarrot, faAppleWhole, faCow, faDrumstickBite, faEgg, faJar,
  faWheatAwn, faTractor, faSlidersH, faXmark
} from '@fortawesome/free-solid-svg-icons';

const ALL_CATEGORIES = [
  { id: 'Legume', name: 'Legume', icon: faCarrot },
  { id: 'Fructe', name: 'Fructe', icon: faAppleWhole },
  { id: 'Lactate', name: 'Lactate', icon: faCow },
  { id: 'Carne', name: 'Carne', icon: faDrumstickBite },
  { id: 'Ouă', name: 'Ouă', icon: faEgg },
  { id: 'Miere', name: 'Miere', icon: faJar },
  { id: 'Cereale', name: 'Cereale', icon: faWheatAwn },
  { id: 'Servicii', name: 'Servicii & Utilaje', icon: faTractor },
];

export function Navbar({
  session, onNavigate, hideDropdown = false, onAddProduct,
  searchQuery = '', setSearchQuery,
  searchLocation = '', setSearchLocation,
  onSearch,
  currentPage
}) {
  const [profileName, setProfileName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(!!session);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ priceMin: '', priceMax: '', distance: '', sellerType: '' });

  const dropdownRef = useRef(null);
  const catDropdownRef = useRef(null);

  useEffect(() => {
    if (session) loadProfileName();
    else { setProfileName(''); setIsLoadingProfile(false); }
  }, [session]);

  const loadProfileName = async () => {
    try {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
      if (data?.full_name) setProfileName(data.full_name);
    } catch (e) { console.error(e); }
    finally { setIsLoadingProfile(false); }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) { setShowDropdown(false); setProfileName(''); toast.success('Te-ai deconectat!'); onNavigate('home'); }
  };

  useEffect(() => {
    const clickOut = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) setShowCategoriesDropdown(false);
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const getColorForName = (name) => {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#f43f5e'];
    const hash = (name || 'U').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (onSearch) onSearch();
    else {
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

const isAllProducts = currentPage === 'toate-produsele';
const navHeight = 'h-16';
const logoTextHidden = false;

  return (
    <>
      <nav className={`sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm transition-all duration-300 ${navHeight}`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-3">

          {/* Logo */}
          <div onClick={() => onNavigate('home')} className="flex items-center gap-2 cursor-pointer group flex-shrink-0">
  <div className="text-emerald-600 text-2xl">
    <FontAwesomeIcon icon={faLeaf} />
  </div>
  <h1 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition hidden sm:block">
    AgriConnect
  </h1>
</div>

          {/* Search Bar - center */}
          <form onSubmit={handleSearchSubmit}
            className={`flex-1 max-w-2xl mx-auto hidden md:flex items-center gap-2 ${isAllProducts ? '!hidden' : ''}`}>
            {/* Categories dropdown button */}
            <div className="relative flex-shrink-0" ref={catDropdownRef}>
              <button
                type="button"
                onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition whitespace-nowrap"
              >
                <span>Categorii</span>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${showCategoriesDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showCategoriesDropdown && (
                <div className="absolute left-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-dropdown">
                  {ALL_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setShowCategoriesDropdown(false);
                        document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      <FontAwesomeIcon icon={cat.icon} className="text-emerald-500 w-4" />
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search inputs */}
            <div className="flex flex-1 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-transparent transition-all">
              <div className="flex items-center pl-3 text-gray-400 flex-shrink-0">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
              </div>
              <input
                type="text"
                placeholder="Caută produs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none min-w-0"
              />
              <div className="w-px bg-gray-200 my-2 flex-shrink-0" />
              <div className="flex items-center pl-3 text-gray-400 flex-shrink-0">
                <FontAwesomeIcon icon={faLocationDot} className="text-sm" />
              </div>
              <input
                type="text"
                placeholder="Locație..."
                value={searchLocation}
                onChange={(e) => setSearchLocation && setSearchLocation(e.target.value)}
                className="w-28 px-3 py-2 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none"
              />
            </div>

            {/* Search button */}
            <button
              type="submit"
              className="flex-shrink-0 w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center transition shadow-sm"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
            </button>

            {/* Filters button */}
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 hover:border-gray-300 transition whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faSlidersH} />
              <span className="hidden lg:inline">Filtre</span>
            </button>
          </form>

          {/* Mobile: search icon */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="md:hidden ml-auto mr-1 w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </button>

          {/* User Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {session ? (
              <>
                {onAddProduct && (
                  <button onClick={onAddProduct} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-full text-sm hover:scale-105 transition shadow-md">
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    <span className={`transition-all duration-300 ${scrolled ? 'hidden lg:inline' : ''}`}>Adaugă anunț</span>
                  </button>
                )}

                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-1.5 hover:bg-gray-50 p-1.5 rounded-xl transition">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isLoadingProfile ? 'animate-pulse bg-gray-200' : ''}`}
                      style={{ background: isLoadingProfile ? '' : getColorForName(profileName || session.user.email) }}
                    >
                      {!isLoadingProfile && (profileName ? profileName[0] : session.user.email[0]).toUpperCase()}
                    </div>
                    <FontAwesomeIcon icon={faChevronDown} className={`text-gray-400 text-[10px] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-dropdown">
                      <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                        <p className="text-sm font-bold truncate">{profileName || 'Utilizator'}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      </div>
                      <div className="p-2">
                        <button onClick={() => { onNavigate('profil'); setShowDropdown(false); }} className="w-full p-2.5 text-left hover:bg-emerald-50 rounded-xl flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <FontAwesomeIcon icon={faUser} />
                          </div>
                          <span className="text-sm font-medium">Profilul meu</span>
                        </button>
                        <button onClick={handleLogout} className="w-full p-2.5 text-left hover:bg-red-50 rounded-xl flex items-center gap-3 group mt-1">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                            <FontAwesomeIcon icon={faRightFromBracket} />
                          </div>
                          <span className="text-sm font-medium text-red-600">Deconectare</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button onClick={() => onNavigate('login')} className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-md whitespace-nowrap">
                Autentificare
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile full-screen search overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-fadeIn">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
            <button onClick={() => setShowMobileSearch(false)} className="w-9 h-9 flex items-center justify-center text-gray-500">
              <FontAwesomeIcon icon={faXmark} className="text-xl" />
            </button>
            <span className="font-semibold text-gray-800">Căutare</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="relative">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Caută produs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="relative">
              <FontAwesomeIcon icon={faLocationDot} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Locație (ex: Chișinău)..."
                value={searchLocation}
                onChange={(e) => setSearchLocation && setSearchLocation(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <button
              onClick={() => { handleSearchSubmit(); setShowMobileSearch(false); }}
              className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              Caută produse
            </button>
            <div className="pt-2">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Categorii</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setShowMobileSearch(false);
                      setTimeout(() => document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition"
                  >
                    <FontAwesomeIcon icon={cat.icon} className="text-emerald-500 w-4" />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FontAwesomeIcon icon={faSlidersH} className="text-emerald-600" />
                Filtre avansate
              </h3>
              <button onClick={() => setShowFilters(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preț (MDL)</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceMin}
                    onChange={e => setFilters(f => ({ ...f, priceMin: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="self-center text-gray-400">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceMax}
                    onChange={e => setFilters(f => ({ ...f, priceMax: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Distanță maximă</label>
                <div className="flex gap-2">
                  {['10 km', '25 km', '50 km', '100 km'].map(d => (
                    <button
                      key={d}
                      onClick={() => setFilters(f => ({ ...f, distance: f.distance === d ? '' : d }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${filters.distance === d ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-300'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tip vânzător</label>
                <div className="flex gap-3">
                  {[{ id: 'individual', label: 'Individual' }, { id: 'distribuitor', label: 'Distribuitor' }].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setFilters(f => ({ ...f, sellerType: f.sellerType === t.id ? '' : t.id }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${filters.sellerType === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-300'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setFilters({ priceMin: '', priceMax: '', distance: '', sellerType: '' })}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Resetează
              </button>
              <button
                onClick={() => { setShowFilters(false); if (onSearch) onSearch(filters); }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-md"
              >
                Aplică filtrele
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdown { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-dropdown { animation: dropdown 0.18s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </>
  );
}