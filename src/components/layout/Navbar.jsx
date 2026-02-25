import { useState, useEffect, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faUser, faRightFromBracket, faChevronDown, faLeaf,
  faMagnifyingGlass, faXmark, faCarrot, faAppleWhole, faCow,
  faDrumstickBite, faEgg, faJar, faWheatAwn, faTractor, faBox,
  faArrowRight, faLocationDot
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

const CATEGORY_ICONS = {
  'Legume': faCarrot,
  'Fructe': faAppleWhole,
  'Lactate': faCow,
  'Carne': faDrumstickBite,
  'Ouă': faEgg,
  'Miere': faJar,
  'Cereale': faWheatAwn,
  'Servicii': faTractor,
};

export function Navbar({ session, onNavigate, onAddProduct, currentPage }) {
  const [profileName, setProfileName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(!!session);
  const [showOverlay, setShowOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [matchedCategories, setMatchedCategories] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const overlayRef = useRef(null);
  const isAllProducts = currentPage === 'toate-produsele';

  // Load profile
  useEffect(() => {
    if (session) loadProfileName();
    else { setProfileName(''); setIsLoadingProfile(false); }
  }, [session]);

  // Close dropdown on outside click
  useEffect(() => {
    const clickOut = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      // Close overlay when clicking outside the popup
      if (showOverlay && overlayRef.current && !overlayRef.current.contains(e.target)) {
        closeOverlay();
      }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, [showOverlay]);

  // ESC key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') closeOverlay(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Focus input when overlay opens
  useEffect(() => {
    if (showOverlay) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showOverlay]);

  // Live search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setMatchedCategories([]);
      return;
    }
    const timer = setTimeout(() => doSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const doSearch = async (q) => {
    setIsSearching(true);
    try {
      const { data } = await supabase
        .from('products_with_user')
        .select('*')
        .eq('status', 'active')
        .ilike('name', `%${q}%`)
        .limit(12);

      const results = data || [];
      setSearchResults(results);

      // Extract unique matched categories
      const cats = [...new Set(results.map(p => p.category))].filter(Boolean);
      setMatchedCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const loadProfileName = async () => {
    try {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
      if (data?.full_name) setProfileName(data.full_name);
    } catch (e) { console.error(e); }
    finally { setIsLoadingProfile(false); }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setShowDropdown(false);
      setProfileName('');
      toast.success('Te-ai deconectat!');
      onNavigate('home');
    }
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    setSearchQuery('');
    setSearchResults([]);
    setMatchedCategories([]);
  };

  const handleSelectProduct = (productId) => {
    closeOverlay();
    if (session) onNavigate('detalii', productId);
    else onNavigate('login');
  };

  const handleSelectCategory = (categoryId) => {
    closeOverlay();
    onNavigate('toate-produsele', null, { category: categoryId });
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    closeOverlay();
    onNavigate('toate-produsele', null, { search: searchQuery });
  };

  const getColorForName = (name) => {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#f43f5e'];
    const hash = (name || 'U').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const hasResults = searchQuery.trim() && (searchResults.length > 0 || isSearching);
  const noResults = searchQuery.trim() && !isSearching && searchResults.length === 0;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-4">

          {/* Logo */}
          <div onClick={() => onNavigate('home')} className="flex items-center gap-2 cursor-pointer group flex-shrink-0">
            <div className="text-emerald-600 text-2xl">
              <FontAwesomeIcon icon={faLeaf} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition hidden sm:block">
              AgriConnect
            </h1>
          </div>

          {/* Search trigger — hidden on toate-produsele */}
          {!isAllProducts && (
            <>
              {/* Desktop */}
              <button
                onClick={() => setShowOverlay(true)}
                className="hidden md:flex flex-1 max-w-2xl mx-auto items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left text-gray-400 text-sm hover:border-emerald-300 hover:bg-white transition-all group shadow-sm"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-gray-400 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                <span className="flex-1">Caută produse, categorii...</span>
                <kbd className="hidden lg:inline-flex items-center gap-1 text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md text-gray-400 font-mono">
                  ESC
                </kbd>
              </button>

              {/* Mobile icon */}
              <button
                onClick={() => setShowOverlay(true)}
                className="md:hidden ml-auto flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </>
          )}

          {/* User section */}
          <div className={`flex items-center gap-2 flex-shrink-0 ${isAllProducts ? 'ml-auto' : ''}`}>
            {session ? (
              <>
                {onAddProduct && (
                  <button onClick={onAddProduct} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-full text-sm hover:scale-105 transition shadow-md">
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    <span>Adaugă anunț</span>
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
              <button onClick={() => onNavigate('login')} className="bg-emerald-600 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md">
                Autentificare
              </button>
            )}
          </div>
        </div>
      </nav>

      {/*BACKDROP*/}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99] animate-fadeIn" />
      )}

      {/*SEARCH POPUP*/}
      {showOverlay && (
        <div
          ref={overlayRef}
          className="fixed top-10 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-white rounded-[20px] shadow-2xl z-[100] overflow-hidden animate-fadeIn"
        >
          {/* Input row */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-gray-400 text-lg flex-shrink-0" />
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }}
              className="flex-1"
            >
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Caută produse, categorii..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="outline-none text-lg w-full py-1 text-gray-900 placeholder-gray-400 bg-transparent"
              />
            </form>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600 transition flex-shrink-0 w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-full"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
            <button
              onClick={closeOverlay}
              className="flex-shrink-0 ml-1 text-gray-400 hover:text-gray-700 transition w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
            >
              <FontAwesomeIcon icon={faXmark} className="text-lg" />
            </button>
          </div>

          {/* Body — empty when no query */}
          {!searchQuery.trim() && (
            <div className="px-6 py-8 text-center text-gray-400">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-3xl mb-3 opacity-30" />
              <p className="text-sm">Începe să scrii pentru a căuta produse</p>
            </div>
          )}

          {/* Loading */}
          {isSearching && (
            <div className="flex gap-0">
              {/* Left skeleton */}
              <div className="w-1/4 border-r border-gray-100 p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
              {/* Right skeleton */}
              <div className="flex-1 p-6 grid grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {!isSearching && hasResults && (
            <div className="flex h-[60vh]">

              {/* Left — Categories */}
              <div className="w-1/4 border-r border-gray-100 overflow-y-auto flex-shrink-0">
                <div className="p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Categorii ({matchedCategories.length})
                  </p>
                  <div className="space-y-1">
                    {matchedCategories.map(catId => (
                      <button
                        key={catId}
                        onClick={() => handleSelectCategory(catId)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
                          <FontAwesomeIcon
                            icon={CATEGORY_ICONS[catId] || faBox}
                            className="text-emerald-600 text-xs"
                          />
                        </div>
                        <span className="font-medium truncate">{catId}</span>
                        <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
                          {searchResults.filter(p => p.category === catId).length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Ver toate results link */}
                  <button
                    onClick={handleSearchSubmit}
                    className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition"
                  >
                    <span>Vezi toate ({searchResults.length})</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </button>
                </div>
              </div>

              {/* Right — Products grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product.id)}
                      className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all duration-200 text-left group"
                    >
                      {/* Image */}
                      <div className="h-28 bg-gray-50 overflow-hidden relative">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FontAwesomeIcon
                              icon={CATEGORY_ICONS[product.category] || faBox}
                              className="text-3xl text-gray-200"
                            />
                          </div>
                        )}
                        {/* Category badge on image */}
                        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FontAwesomeIcon icon={CATEGORY_ICONS[product.category] || faBox} className="text-emerald-600 text-[9px]" />
                          {product.category}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                          <FontAwesomeIcon icon={faLocationDot} className="text-emerald-500 text-[9px]" />
                          {product.location}
                        </p>
                        <p className="text-sm font-bold text-emerald-600 mt-1.5">
                          {product.price} <span className="text-xs font-normal text-gray-400">lei/{product.unit}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 font-medium">Niciun produs găsit pentru „{searchQuery}"</p>
              <p className="text-gray-400 text-sm mt-1">Încearcă un alt termen de căutare</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes dropdown { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-dropdown { animation: dropdown 0.18s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        @keyframes slideDown {
         from { opacity: 0; transform: translate(-50%, -12px); } 
  to { opacity: 1; transform: translate(-50%, 0); }  }
        .animate-slideDown { animation: slideDown 0.2s ease-out; }
      `}</style>
    </>
  );
}