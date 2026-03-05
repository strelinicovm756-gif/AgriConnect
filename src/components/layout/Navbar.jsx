import { useState, useEffect, useRef } from "react";
import { getColorForName } from '../../lib/utils';
import { supabase } from "../../services/supabaseClient";
import toast from "react-hot-toast";
import { X } from "@/components/animate-ui/icons/x";
import { Search } from "@/components/animate-ui/icons/search";
import { SearchAlert } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AddProductModal from "../features/AddProductModal";
import {
  faPlus, faUser, faRightFromBracket, faChevronDown, faLeaf,
  faMagnifyingGlass, faCarrot, faAppleWhole, faCow,
  faDrumstickBite, faEgg, faJar, faWheatAwn, faTractor, faBox,
  faArrowRight, faLocationDot
} from '@fortawesome/free-solid-svg-icons';


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

export function Navbar({ session, onNavigate, currentPage }) {
  const [profileName, setProfileName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(!!session);
  const [showOverlay, setShowOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [matchedCategories, setMatchedCategories] = useState([]);
  const [matchedLocations, setMatchedLocations] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const overlayRef = useRef(null);
  const isAllProducts = currentPage === 'toate-produsele';

  useEffect(() => {
    if (session) loadProfileName();
    else { setProfileName(''); setIsLoadingProfile(false); }
  }, [session]);

  useEffect(() => {
    const clickOut = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (showOverlay && overlayRef.current && !overlayRef.current.contains(e.target)) closeOverlay();
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, [showOverlay]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') closeOverlay(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (showOverlay) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [showOverlay]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setMatchedCategories([]);
      setMatchedLocations([]);
      setActiveLocation(null);
      return;
    }
    const timer = setTimeout(() => doSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const doSearch = async (q) => {
    setIsSearching(true);
    try {
      const { data: byName } = await supabase
        .from('products_with_user').select('*').eq('status', 'active').ilike('name', `%${q}%`).limit(12);
      const { data: byLocation } = await supabase
        .from('products_with_user').select('*').eq('status', 'active').ilike('location', `%${q}%`).limit(12);
      const combined = [...(byName || []), ...(byLocation || [])];
      const unique = combined.filter((item, index, self) => index === self.findIndex(p => p.id === item.id));
      const results = unique.slice(0, 12);
      setSearchResults(results);
      setActiveLocation(null);
      setMatchedCategories([...new Set(results.map(p => p.category))].filter(Boolean));
      setMatchedLocations([...new Set(results.map(p => p.location))].filter(Boolean));
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
    setMatchedLocations([]);
    setActiveLocation(null);
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


  const filteredResults = activeLocation ? searchResults.filter(p => p.location === activeLocation) : searchResults;
  const hasResults = searchQuery.trim() && (searchResults.length > 0 || isSearching);
  const noResults = searchQuery.trim() && !isSearching && searchResults.length === 0;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-4">

          {/* Logo */}
          <div onClick={() => onNavigate('home')} className="flex items-center gap-2 cursor-pointer group flex-shrink-0">
            <div className="text-emerald-600 text-2xl"><FontAwesomeIcon icon={faLeaf} /></div>
            <h1 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition hidden sm:block">AgriConnect</h1>
          </div>

          {/* Search trigger - ocupă spațiul din mijloc */}
          {!isAllProducts ? (
            <>
              <button
                onClick={() => setShowOverlay(true)}
                className="hidden md:flex flex-1 items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left text-gray-400 text-sm hover:border-emerald-300 hover:bg-white transition-all group shadow-sm"
              >
                <Search animateOnHover color="#c2c2c2" strokeWidth={2} size={20} />
                <span className="flex-1">Caută produse, localitate, categorii...</span>
              </button>
              <button
                onClick={() => setShowOverlay(true)}
                className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </>
          ) : (
            <div className="flex-1" />
          )}

          {/* Dreapta: buton + avatar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {session ? (
              <>
                {/* Buton Adaugă anunț */}
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-full text-sm hover:bg-emerald-700 hover:scale-105 transition shadow-md"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Adaugă anunț</span>
                </button>

                {/* Buton mobil */}
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="sm:hidden w-9 h-9 flex items-center justify-center bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition shadow-md"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>

                {/* Avatar + dropdown */}
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

      {/* BACKDROP */}
      {showOverlay && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99] animate-fadeIn" />}

      {/* SEARCH POPUP */}
      {showOverlay && (
        <div ref={overlayRef} className="fixed top-10 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-white rounded-[20px] shadow-2xl z-[100] overflow-hidden animate-fadeIn flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <Search color="#c2c2c2" strokeWidth={2} size={20} />
            <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }} className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Caută produse, localitate, categorii..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="outline-none text-lg w-full py-1 text-gray-900 placeholder-gray-400 bg-transparent"
              />
            </form>
            <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
            <button onClick={closeOverlay} className="flex-shrink-0 text-gray-500 hover:text-gray-800 transition w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full">
              <X animateOnHover color="#c2c2c2" strokeWidth={2} size={24} />
            </button>
          </div>

          {!searchQuery.trim() && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-3xl mb-3 opacity-30" />
              <p className="text-sm">Începe să scrii pentru a căuta produse</p>
            </div>
          )}

          {isSearching && (
            <div className="flex h-[60vh]">
              <div className="w-1/4 border-r border-gray-100 p-6 space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
              <div className="flex-1 p-6 grid grid-cols-4 gap-4 content-start">
                {[...Array(8)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            </div>
          )}

          {!isSearching && hasResults && (
            <div className="flex h-[60vh]">
              <div className="w-1/4 border-r border-gray-100 overflow-y-auto flex-shrink-0">
                <div className="p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categorii ({matchedCategories.length})</p>
                  <div className="space-y-1">
                    {matchedCategories.map(catId => (
                      <button key={catId} onClick={() => handleSelectCategory(catId)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all group">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
                          <FontAwesomeIcon icon={CATEGORY_ICONS[catId] || faBox} className="text-emerald-600 text-xs" />
                        </div>
                        <span className="font-medium truncate">{catId}</span>
                        <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">{searchResults.filter(p => p.category === catId).length}</span>
                      </button>
                    ))}
                  </div>

                  {matchedLocations.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Localități ({matchedLocations.length})</p>
                      <div className="space-y-1">
                        {matchedLocations.map(loc => (
                          <button key={loc} onClick={() => setActiveLocation(activeLocation === loc ? null : loc)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${activeLocation === loc ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${activeLocation === loc ? 'bg-emerald-100' : 'bg-gray-50 group-hover:bg-emerald-100'}`}>
                              <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600 text-xs" />
                            </div>
                            <span className="font-medium truncate">{loc}</span>
                            <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">{searchResults.filter(p => p.location === loc).length}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={handleSearchSubmit} className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition">
                    <span>Vezi toate ({searchResults.length})</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredResults.map(product => (
                    <button key={product.id} onClick={() => handleSelectProduct(product.id)} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all duration-200 text-left group">
                      <div className="h-28 bg-gray-50 overflow-hidden relative">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FontAwesomeIcon icon={CATEGORY_ICONS[product.category] || faBox} className="text-3xl text-gray-200" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FontAwesomeIcon icon={CATEGORY_ICONS[product.category] || faBox} className="text-emerald-600 text-[9px]" />
                          {product.category}
                        </span>
                      </div>
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
          {noResults && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center">
              <SearchAlert color="#c2c2c2" strokeWidth={2} size={48} />
              <p className="text-gray-600 font-medium mt-4">Niciun produs găsit pentru „{searchQuery}"</p>
              <p className="text-gray-400 text-sm mt-1">Încearcă un alt termen de căutare</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL ADAUGĂ PRODUS */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        session={session}
        onSuccess={() => {}}
      />

      <style>{`
        @keyframes dropdown { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-dropdown { animation: dropdown 0.18s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
      `}</style>
    </>
  );
}