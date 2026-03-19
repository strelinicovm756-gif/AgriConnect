import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLayerGroup, faCarrot, faAppleWhole, faCow, faDrumstickBite,
  faEgg, faJar, faWheatAwn, faTractor, faSeedling, faWrench, faDroplet,
  faCartShopping, faIndustry,
  faChevronDown as faChevronDownSolid, faCalendarDays
} from '@fortawesome/free-solid-svg-icons';
import { getColorForName } from '../../lib/utils';
import { supabase } from "../../services/supabaseClient";
import toast from "react-hot-toast";
import { X as XAnimated } from "@/components/animate-ui/icons/x";
import { Search as SearchAnimated } from "@/components/animate-ui/icons/search";
import {
  SearchX, Plus, Bell, Check, ChevronDown, User, Shield,
  LogOut, ArrowRight, MapPin, Package, Search,
  Carrot, Apple, Milk, Beef, Egg, Flower2, Wheat, Tractor,
  MessageSquare
} from 'lucide-react';
import AddProductModal from "../features/AddProductModal";
import { useChat } from "../../hooks/useChat";

const CATEGORY_ICONS = {
  'Vegetables': Carrot,
  'Fruits': Apple,
  'Dairy': Milk,
  'Meat': Beef,
  'Eggs': Egg,
  'Honey': Flower2,
  'Cereals': Wheat,
  'Land Services': Tractor,
};

const ICON_MAP = {
  faCarrot, faAppleWhole, faCow, faDrumstickBite, faEgg, faJar, faWheatAwn,
  faTractor, faSeedling, faWrench, faDroplet,
};

export function Navbar({ session, onNavigate }) {
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
  const [userRole, setUserRole] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const { getUnreadCount } = useChat();
  const [megaCategories, setMegaCategories] = useState({ b2c: [], b2b: [] });
  const [openCategoryId, setOpenCategoryId] = useState(null);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const searchInputRef = useRef(null);
  const overlayRef = useRef(null);
  const megaMenuRef = useRef(null);
  const categoriiBtnRef = useRef(null);

  useEffect(() => {
    if (session) loadProfileName();
    else { setProfileName(''); setIsLoadingProfile(false); }
  }, [session]);

  useEffect(() => {
    const fetchMegaCategories = async () => {
      const { data: cats } = await supabase
        .from('categories')
        .select('*, subcategories(id, name, slug)')
        .eq('is_active', true)
        .order('sort_order');
      if (cats) {
        setMegaCategories({
          b2c: cats.filter(c => c.market_type === 'b2c' || c.market_type === 'both'),
          b2b: cats.filter(c => c.market_type === 'b2b' || c.market_type === 'both'),
        });
      }
    };
    fetchMegaCategories();
  }, []);

  useEffect(() => {
    const clickOut = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
      if (showOverlay && overlayRef.current && !overlayRef.current.contains(e.target)) closeOverlay();
      if (
        showMegaMenu &&
        megaMenuRef.current && !megaMenuRef.current.contains(e.target) &&
        categoriiBtnRef.current && !categoriiBtnRef.current.contains(e.target)
      ) { setShowMegaMenu(false); setOpenCategoryId(null); }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, [showOverlay, showMegaMenu]);

  useEffect(() => {
    if (!session) { setNotifs([]); setUnreadCount(0); return; }
    loadNotifs();
    const channel = supabase
      .channel('notifs_' + session.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annonce_notifications', filter: `id_profiles=eq.${session.user.id}` }, () => loadNotifs())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  useEffect(() => {
    if (!session) { setChatUnreadCount(0); return; }
    const loadChatUnread = async () => {
      const count = await getUnreadCount(session.user.id);
      setChatUnreadCount(count);
    };
    loadChatUnread();
    const interval = setInterval(loadChatUnread, 30000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { closeOverlay(); setShowMegaMenu(false); setOpenCategoryId(null); }
    };
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
      const { data } = await supabase.from('profiles').select('full_name, role').eq('id', session.user.id).maybeSingle();
      if (data?.full_name) setProfileName(data.full_name);
      if (data?.role) setUserRole(data.role);
    } catch (e) { console.error(e); }
    finally { setIsLoadingProfile(false); }
  };

  const loadNotifs = async () => {
    if (!session) return;
    const [{ data }, { count }] = await Promise.all([
      supabase.from('annonce_notifications').select('*').eq('id_profiles', session.user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('annonce_notifications').select('*', { count: 'exact', head: true }).eq('id_profiles', session.user.id).eq('is_read', false),
    ]);
    setNotifs(data || []);
    setUnreadCount(count || 0);
  };

  const relativeTime = (dateStr) => {
    const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const markAsRead = async (notif) => {
    setShowNotifDropdown(false);
    if (!notif.is_read) {
      await supabase.from('annonce_notifications').update({ is_read: true }).eq('id', notif.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.id_produit) onNavigate('detalii', notif.id_produit);
  };

  const markAllAsRead = async () => {
    await supabase.from('annonce_notifications').update({ is_read: true }).eq('id_profiles', session.user.id).eq('is_read', false);
    setUnreadCount(0);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setShowDropdown(false);
      setProfileName('');
      toast.success('You have been signed out!');
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

  const handleMegaNav = (params) => {
    setShowMegaMenu(false);
    setOpenCategoryId(null);
    onNavigate('toate-produsele', null, params);
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
            <img src="/src/assets/IconApp_em_600.svg" alt="Logo" className="h-7 w-7" />

            <h1 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition hidden sm:block">AgriConnect</h1>
          </div>

          {/* Link Evenimente */}
          <button
            onClick={() => onNavigate('evenimente')}
            className="shadow-md hidden md:flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 hover:bg-emerald-700 transition-colors"
          >
            <FontAwesomeIcon icon={faCalendarDays} className="text-white" />
            <span>Events</span>
          </button>

          {/* Buton Categorii */}
          <button
            ref={categoriiBtnRef}
            onClick={() => setShowMegaMenu(p => !p)}
            className="shadow-md hidden md:flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 hover:bg-emerald-700 transition-colors"
          >
            <FontAwesomeIcon icon={faLayerGroup} />
            <span>Categories</span>
            <FontAwesomeIcon
              icon={faChevronDownSolid}
              className={`transition-transform duration-200 text-xs ${showMegaMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Search trigger */}
          <>
            <button
              onClick={() => setShowOverlay(true)}
              className="hidden md:flex flex-1 items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left text-gray-400 text-sm hover:border-emerald-300 hover:bg-white transition-all group shadow-sm"
            >
              <SearchAnimated animateOnHover color="#c2c2c2" strokeWidth={2} size={20} />
              <span className="flex-1">Search products, location... </span>
            </button>
            <button
              onClick={() => setShowOverlay(true)}
              className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition"
            >
              <Search size={18} />
            </button>
          </>

          {/* Dreapta: buton + avatar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {session ? (
              <>
                {/* Buton Adaugă anunț */}
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-full text-sm hover:bg-emerald-700 shadow-md"
                >
                  <Plus size={14} />
                  <span>Add listing</span>
                </button>

                {/* Buton mobil */}
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="sm:hidden w-9 h-9 flex items-center justify-center bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition shadow-md"
                >
                  <Plus size={14} />
                </button>

                {/* Chat */}
                <div className="relative">
                  <button
                    onClick={() => onNavigate('chat')}
                    className="relative w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-xl transition"
                    title="Messages"
                  >
                    <MessageSquare size={18} />
                    {chatUnreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Clopot notificări */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="relative w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-xl transition"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-dropdown">
                      <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">Notifications</p>
                        {unreadCount > 0 && (
                          <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">{unreadCount} noi</span>
                        )}
                      </div>

                      {notifs.length === 0 ? (
                        <div className="px-5 py-8 text-center text-gray-400">
                          <Bell size={28} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        <div>
                          <div className="max-h-80 overflow-y-auto">
                            {notifs.map(n => (
                              <button
                                key={n.id}
                                onClick={() => markAsRead(n)}
                                className={`w-full text-left px-5 py-3.5 flex gap-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                              >
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                <div className="flex-1 min-w-0">
                                  {n.title && <p className="text-sm font-bold text-gray-900 truncate">{n.title}</p>}
                                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{n.content}</p>
                                  <p className="text-[10px] text-gray-400 mt-1">{relativeTime(n.created_at)} · {formatDate(n.created_at)}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                          {unreadCount > 0 && (
                            <div className="px-5 py-3 border-t border-gray-100">
                              <button onClick={markAllAsRead} className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition py-1">
                                <Check size={14} />
                                Mark all as read
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Avatar + dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-1.5 hover:bg-gray-50 p-1.5 rounded-xl transition">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isLoadingProfile ? 'animate-pulse bg-gray-200' : ''}`}
                      style={{ background: isLoadingProfile ? '' : getColorForName(session.user.id || session.user.email) }}
                    >
                      {!isLoadingProfile && (profileName ? profileName[0] : session.user.email[0]).toUpperCase()}
                    </div>
                    <ChevronDown size={12} className={`text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-dropdown">
                      <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                        <p className="text-sm font-bold truncate">{profileName || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      </div>
                      <div className="p-2">
                        <button onClick={() => { onNavigate('profil'); setShowDropdown(false); }} className="w-full p-2.5 text-left hover:bg-emerald-50 rounded-xl flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <User size={16} />
                          </div>
                          <span className="text-sm font-medium">My profile</span>
                        </button>
                        {(userRole === 'admin' || userRole === 'super_admin') && (
                          <button onClick={() => { onNavigate('admin'); setShowDropdown(false); }} className="w-full p-2.5 text-left hover:bg-purple-50 rounded-xl flex items-center gap-3 group mt-1">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                              <Shield size={16} />
                            </div>
                            <div>
                              <span className="text-sm font-medium">Administration</span>
                              <p className="text-xs text-gray-400">{userRole === 'super_admin' ? 'Super Admin' : 'Moderator'}</p>
                            </div>
                          </button>
                        )}
                        <button onClick={handleLogout} className="w-full p-2.5 text-left hover:bg-red-50 rounded-xl flex items-center gap-3 group mt-1">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                            <LogOut size={16} />
                          </div>
                          <span className="text-sm font-medium text-red-600">Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button onClick={() => onNavigate('login')} className="bg-emerald-600 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md">
                Sign in
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* MEGA MENU */}
      <AnimatePresence>
        {showMegaMenu && (
          <motion.div
            ref={megaMenuRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-16 left-0 right-0 z-40 bg-white shadow-2xl rounded-b-[3rem] overflow-hidden border-t border-gray-100"
          >
            <div className="overflow-y-auto mega-scroll pr-2"
              style={{ maxHeight: 'calc(70vh - 60px)' }}
            >
              <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* B2C */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2 mb-4">
                      <FontAwesomeIcon icon={faCartShopping} />
                      Food Products
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
                      {megaCategories.b2c.map(cat => {
                        return (
                          <div key={cat.id} className="group bg-white border border-gray-100 rounded-2xl p-2 hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex flex-col">
                            <button
                              onClick={() => handleMegaNav({ category: cat.id })}
                              className="flex items-center gap-2 mb-3 w-full text-left"
                            >
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                                <FontAwesomeIcon icon={ICON_MAP[cat.icon] ?? faCarrot} className="text-white text-sm" />
                              </div>
                              <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{cat.name}</span>
                            </button>
                            {(() => {
                              const isOpen = openCategoryId === cat.id;
                              const displayedSubs = isOpen ? cat.subcategories : cat.subcategories.slice(0, 3);
                              return (
                                <>
                                  <ul className="space-y-0.5">
                                    <AnimatePresence initial={false}>
                                      {displayedSubs.map(sub => (
                                        <motion.li
                                          key={sub.id}
                                          initial={{ opacity: 0, height: 0, x: -5 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                                          style={{ overflow: 'hidden' }}
                                        >
                                          <button
                                            onClick={() => handleMegaNav({ category: cat.id, subcategory: sub.id })}
                                            className="text-xs font-medium text-gray-500 hover:text-emerald-600 hover:bg-gray-100/50 hover:pl-2 px-1 py-1 rounded-md transition-all duration-200 text-left w-full truncate"
                                          >
                                            {sub.name}
                                          </button>
                                        </motion.li>
                                      ))}
                                    </AnimatePresence>
                                  </ul>
                                  {!isOpen && cat.subcategories.length > 3 && (
                                    <div className="h-4 bg-gradient-to-t from-white to-transparent -mt-4 pointer-events-none relative z-10" />
                                  )}
                                  {cat.subcategories.length > 3 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setOpenCategoryId(isOpen ? null : cat.id); }}
                                      className="border border-gray-200 w-full mt-2 flex justify-center items-center py-1 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                        <ChevronDown className="text-emerald-600" size={16} />
                                      </motion.div>
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                            <div className="border border-gray-200 mt-2 pt-2 w-full flex justify-center items-center py-1.5 hover:bg-gray-100 text-gray-500 hover:text-emerald-600 rounded-full transition-all duration-200">
                              <button
                                onClick={() => handleMegaNav({ category: cat.id })}
                                className="text-xs text-emerald-600 font-semibold"
                              >
                                see all
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* B2B */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2 mb-4">
                      <FontAwesomeIcon icon={faIndustry} />
                      Services &amp; Utilities
                    </p>
                    <div className="grid grid-cols-2 gap-3 items-start">
                      {megaCategories.b2b.map(cat => {
                        return (
                          <div key={cat.id} className="group bg-white border border-gray-100 rounded-2xl p-2 hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex flex-col">
                            <button
                              onClick={() => handleMegaNav({ category: cat.id, type: 'b2b' })}
                              className="flex items-center gap-2.5 mb-3 w-full text-left"
                            >
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                                <FontAwesomeIcon icon={ICON_MAP[cat.icon] ?? faTractor} className="text-white text-sm" />
                              </div>
                              <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{cat.name}</span>
                            </button>
                            {(() => {
                              const isOpen = openCategoryId === cat.id;
                              const displayedSubs = isOpen ? cat.subcategories : cat.subcategories.slice(0, 3);
                              return (
                                <>
                                  <ul className="space-y-0.5">
                                    <AnimatePresence initial={false}>
                                      {displayedSubs.map(sub => (
                                        <motion.li
                                          key={sub.id}
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                                          style={{ overflow: 'hidden' }}
                                        >
                                          <button
                                            onClick={() => handleMegaNav({ category: cat.id, subcategory: sub.id, type: 'b2b' })}
                                            className="text-xs font-medium text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50 hover:pl-2 px-1 py-1 rounded-md transition-all duration-200 text-left w-full truncate"
                                          >
                                            {sub.name}
                                          </button>
                                        </motion.li>
                                      ))}
                                    </AnimatePresence>
                                  </ul>
                                  {!isOpen && cat.subcategories.length > 3 && (
                                    <div className=" h-4 bg-gradient-to-t from-white to-transparent -mt-4 pointer-events-none relative z-10" />
                                  )}
                                  {cat.subcategories.length > 3 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setOpenCategoryId(isOpen ? null : cat.id); }}
                                      className="border border-gray-100 w-full mt-2 flex justify-center items-center py-1 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                        <ChevronDown className="text-emerald-600" size={16} />
                                      </motion.div>
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                            <div className="border border-gray-200 mt-2 pt-2 w-full flex justify-center items-center py-1.5 hover:bg-gray-100 text-gray-500 hover:text-emerald-600 rounded-full transition-all duration-200">
                              <button
                                onClick={() => handleMegaNav({ category: cat.id, type: 'b2b' })}
                                className="text-xs text-emerald-600 font-semibold tracking-wide no-underline"
                              >
                                see all
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Footer — OUTSIDE scroll, always visible */}
            <div className="border-t border-gray-100 py-4 text-center bg-white flex-shrink-0">
              <button
                onClick={() => { setShowMegaMenu(false); setOpenCategoryId(null); onNavigate('toate-produsele'); }}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-700 rounded-xl font-semibold text-sm transition-colors"
              >
                Search all categories
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BACKDROP */}
      {showOverlay && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99] animate-fadeIn" />}

      {/* SEARCH POPUP */}
      {showOverlay && (
        <div ref={overlayRef} className="fixed top-10 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-white rounded-[20px] shadow-2xl z-[100] overflow-hidden animate-fadeIn flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <SearchAnimated color="#c2c2c2" strokeWidth={2} size={20} />
            <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }} className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products, location, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="outline-none text-lg w-full py-1 text-gray-900 placeholder-gray-400 bg-transparent"
              />
            </form>
            <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
            <button onClick={closeOverlay} className="flex-shrink-0 text-gray-500 hover:text-gray-800 transition w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full">
              <XAnimated animateOnHover color="#c2c2c2" strokeWidth={2} size={24} />
            </button>
          </div>

          {!searchQuery.trim() && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400">
              <Search size={36} className="mb-3 opacity-30" />
              <p className="text-sm">Start typing to search for products</p>
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
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categories ({matchedCategories.length})</p>
                  <div className="space-y-1">
                    {matchedCategories.map(catId => {
                      const CatIcon = CATEGORY_ICONS[catId] || Package;
                      return (
                        <button key={catId} onClick={() => handleSelectCategory(catId)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all group">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center flex-shrink-0 transition-colors">
                            <CatIcon size={12} className="text-emerald-600" />
                          </div>
                          <span className="font-medium truncate">{catId}</span>
                          <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">{searchResults.filter(p => p.category === catId).length}</span>
                        </button>
                      );
                    })}
                  </div>

                  {matchedLocations.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Locations ({matchedLocations.length})</p>
                      <div className="space-y-1">
                        {matchedLocations.map(loc => (
                          <button key={loc} onClick={() => setActiveLocation(activeLocation === loc ? null : loc)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${activeLocation === loc ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${activeLocation === loc ? 'bg-emerald-100' : 'bg-gray-50 group-hover:bg-emerald-100'}`}>
                              <MapPin size={12} className="text-emerald-600" />
                            </div>
                            <span className="font-medium truncate">{loc}</span>
                            <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">{searchResults.filter(p => p.location === loc).length}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={handleSearchSubmit} className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition">
                    <span>See all ({searchResults.length})</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredResults.map(product => {
                    const ProdIcon = CATEGORY_ICONS[product.category] || Package;
                    return (
                      <button key={product.id} onClick={() => handleSelectProduct(product.id)} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all duration-200 text-left group">
                        <div className="h-28 bg-gray-50 overflow-hidden relative">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ProdIcon size={36} className="text-gray-200" />
                            </div>
                          )}
                          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ProdIcon size={10} className="text-emerald-600" />
                            {product.category}
                          </span>
                        </div>
                        <div className="p-2.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                            <MapPin size={10} className="text-emerald-500" />
                            {product.location}
                          </p>
                          <p className="text-sm font-bold text-emerald-600 mt-1.5">
                            {product.price} <span className="text-xs font-normal text-gray-400">lei/{product.unit}</span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {noResults && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center">
              <SearchX size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium mt-4">No products found for „{searchQuery}"</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL ADAUGĂ PRODUS */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        session={session}
        onSuccess={() => { }}
      />

      <style>{`
        @keyframes dropdown { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-dropdown { animation: dropdown 0.18s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        @keyframes megamenu { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-megamenu { animation: megamenu 0.2s ease-out; }
        /* Lățimea barei */
.mega-scroll::-webkit-scrollbar { 
  width: 5px; 
}

/* Track-ul (fundalul barei) îl lăsăm transparent */
.mega-scroll::-webkit-scrollbar-track { 
  background: transparent; 
}

/* CULOAREA BAREI (Thumb) - Când NU e hover */
.mega-scroll::-webkit-scrollbar-thumb { 
  background: #e5e7eb; /* Un gri discret (gray-200) */
  border-radius: 99px; 
}

/* CULOAREA BAREI - Când pui mouse-ul peste ea (Hover) */
.mega-scroll:hover::-webkit-scrollbar-thumb { 
  background: #10b981; /* Verdele tău Emerald-500 */
}

/* Pentru Firefox */
.mega-scroll { 
  scrollbar-width: thin; 
  scrollbar-color: #e5e7eb transparent; 
}
.mega-scroll:hover { 
  scrollbar-color: #10b981 transparent; 
}
      `}</style>
    </>
  );
}
