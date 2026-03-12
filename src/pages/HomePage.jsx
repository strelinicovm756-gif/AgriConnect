import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from "../services/supabaseClient";
import NearbyFarmersMap from "../components/features/NearbyFarmersMap";
import { ProductCard } from "../components/features/ProductCard";
import { Button } from "../components/ui/Button";
import AddProductModal from "../components/features/AddProductModal";
import B2BProviderCarousel from "../components/features/B2BProviderCarousel";
import B2CProviderCarousel from "../components/features/B2CProviderCarousel";
import toast from 'react-hot-toast';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { getColorForName } from '../lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faLeaf, faCircleCheck, faHandshake,
  faArrowRight, faTruck, faSeedling, faChevronLeft, faChevronRight,
  faTractor, faFlask, faStar, faMapMarkerAlt, faShieldHalved,
  faWrench, faDroplet, faChevronDown
} from '@fortawesome/free-solid-svg-icons';

// ── Categorii B2B ──────────────────────────────────────────────
const B2B_CATEGORIES = [
  {
    id: 'Servicii Teren', name: 'Servicii Teren', icon: faTractor,
    subs: ['Arat & Prelucrare sol', 'Semănat', 'Recoltare mecanizată', 'Transport agricol']
  },
  {
    id: 'Protecția Plantelor', name: 'Protecția Plantelor', icon: faFlask,
    subs: ['Pesticide', 'Erbicide', 'Îngrășăminte organice', 'Fungicide']
  },
  {
    id: 'Echipamente', name: 'Echipamente', icon: faWrench,
    subs: ['Unelte manuale', 'Piese schimb utilaje', 'Utilaje second-hand', 'Altele']
  },
  {
    id: 'Sisteme de Irigare', name: 'Sisteme de Irigare', icon: faDroplet,
    subs: ['Sisteme picurare', 'Pompe apă', 'Furtunuri & Accesorii', 'Altele']
  },
];
const B2B_IDS = B2B_CATEGORIES.map(c => c.id);

// Pill Nav Button — acum fără `absolute`, poziționat de wrapper-ul părintе
function PillNavButton({ direction, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-9 h-24 backdrop-blur-sm transition-all duration-200 active:scale-95 hover:w-11
        ${direction === 'left' ? 'left-0' : 'right-0'}
        bg-white border-gray-600 text-emerald-600 hover:bg-gray-50 rounded-full shadow-md`}
      style={{
        borderRadius: direction === 'left' ? '0 9999px 9999px 0' : '9999px 0 0 9999px'
      }}>
      <FontAwesomeIcon
        icon={direction === 'left' ? faChevronLeft : faChevronRight}
        className="text-sm"
      />
    </button>
  );
}

// Verified Farmer Card
function FarmerCard({ farmer, onNavigate }) {
  const color = getColorForName(farmer.full_name);
  return (
    <button onClick={() => onNavigate('producator', farmer.id)}
      className="min-w-[180px] w-[180px] flex-shrink-0 snap-start bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 text-left group">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-black mb-3 shadow-sm relative"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        {(farmer.full_name || '?').charAt(0).toUpperCase()}
        {farmer.is_verified && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
            <FontAwesomeIcon icon={faCircleCheck} className="text-white text-[8px]" />
          </div>
        )}
      </div>
      <p className="font-bold text-gray-900 text-sm leading-tight mb-1 group-hover:text-emerald-700 transition-colors truncate">
        {farmer.full_name || 'Producător'}
      </p>
      {farmer.location && (
        <p className="text-gray-400 text-xs flex items-center gap-1 mb-2 truncate">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[9px]" />{farmer.location}
        </p>
      )}
      {farmer.rating > 0 && (
        <div className="flex items-center gap-1">
          <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-[10px]" />
          <span className="text-xs font-semibold text-gray-700">{Number(farmer.rating).toFixed(1)}</span>
        </div>
      )}
    </button>
  );
}

const CARD_B2C = "w-[331.7px] min-w-[320px] flex-shrink-0 snap-start bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all duration-300";
const CARD_B2B = "w-[331.7px] min-w-[320px] flex-shrink-0 snap-start bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-emerald-00 transition-all duration-300";

const heroImages = [
  { url: 'src/assets/Rosii.jpg', alt: 'Roșii proaspete' },
  { url: 'src/assets/castravete.jpg', alt: 'Castraveți proaspeți' },
  { url: 'src/assets/Miere.jpeg', alt: 'Miere naturală' },
];

// ── B2C Collapsible Block ──────────────────────────────────────
function B2CBlock({ b2cProducts, getNewProducts, session, onNavigate, handleViewDetails, handleContactClick, scroll, onExpandChange }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const carouselRef = useRef(null);

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandChange?.(next);
  };

  const activeProducts = getNewProducts();
  const viewAll = () => onNavigate('toate-produsele', null, { sortBy: 'newest', type: 'b2c' });

  return (
    <div className="relative z-10 -mt-16 bg-white rounded-t-[40px] shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.1),0_-8px_10px_-6px_rgba(0,0,0,0.1)]">

      {/* Header */}
      <div className="px-6 sm:px-8 lg:px-12 pt-8 pb-12">
        <button onClick={toggle} className="w-full flex items-center justify-between group text-left">
          <div className="text-left">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FontAwesomeIcon icon={faSeedling} className="text-emerald-600" />
              Produse Alimentare
              <span className={`ml-4 text-base text-gray-400 transition-transform duration-300 inline-block ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                <FontAwesomeIcon icon={faChevronDown} />
              </span>
            </h3>
          </div>
        </button>
      </div>

      {/* Conținut animat */}
      <div
        className="overflow-hidden"
        style={{
          transition: 'height 0.5s ease-in-out, opacity 0.5s ease-in-out',
          height: isExpanded ? '730px' : '35px',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="px-6 sm:px-8 lg:px-12 pt-2 pb-12">
          {/* Vezi tot */}
          <div className="flex justify-end mb-5">
            <button onClick={viewAll}
              className="flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <span>Vezi tot</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
            </button>
          </div>

          {/* Wrapper relativ pentru butoane + carusel */}
          <div className="relative">
            {/* Containerul caruselului */}
            <div className="relative rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_1px_6px_-2px_rgba(0,0,0,0.08)] bg-white p-6">
              <PillNavButton direction="left" onClick={() => scroll('left', carouselRef)} ariaLabel="Stânga" />
              <PillNavButton direction="right" onClick={() => scroll('right', carouselRef)} ariaLabel="Dreapta" />

              <div
                ref={carouselRef}
                className="flex overflow-x-auto gap-4 py-2 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {activeProducts.length > 0 ? activeProducts.map(p => (
                  <div key={p.id} className={CARD_B2C}>
                    <ProductCard product={p} session={session} onViewDetails={handleViewDetails} onContactClick={handleContactClick} />
                  </div>
                )) : (
                  <div className="flex-1 py-14 flex items-center justify-center text-gray-400 min-w-[200px]">
                    <p className="text-sm">Niciun produs momentan.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── B2B Collapsible Block ──────────────────────────────────────
function B2BBlock({ b2bProducts, session, onNavigate, handleViewDetails, handleContactClick, scroll, b2bRef, b2cExpanded }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (b2bProducts.length === 0) return null;

  return (
    <div
      className="relative z-10 bg-white rounded-t-[40px] shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.15)]"
      style={{ marginTop: b2cExpanded ? '-25px' : '-25px', transition: 'margin-top 0.5s ease-in-out' }}
    >

      {/* Header */}
      <div className="px-6 sm:px-8 lg:px-12 pt-8 pb-12">
        <button onClick={() => setIsExpanded(p => !p)} className="w-full flex items-center justify-between group text-left">
          <div className="text-left">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FontAwesomeIcon icon={faTractor} className="text-emerald-600" />
              Servicii & Utilități
              <span className={`ml-[38px] text-base text-gray-400 transition-transform duration-300 inline-block ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                <FontAwesomeIcon icon={faChevronDown} />
              </span>
            </h3>
          </div>
        </button>
      </div>

      {/* Conținut animat */}
      <div
        className="overflow-hidden"
        style={{
          transition: 'height 0.5s ease-in-out, opacity 0.5s ease-in-out',
          height: isExpanded ? '720px' : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="px-6 sm:px-8 lg:px-12 pt-2 pb-6">
          {/* Vezi tot */}
          <div className="flex justify-end mb-5">
            <button onClick={() => onNavigate('toate-produsele', null, { type: 'b2b' })}
              className="flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <span>Vezi tot</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
            </button>
          </div>

          {/* Wrapper relativ pentru butoane + carusel */}
          <div className="relative">
            {/* Containerul caruselului */}
            <div className="relative rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_1px_6px_-2px_rgba(0,0,0,0.08)] bg-white p-6 ">
              <PillNavButton direction="left" onClick={() => scroll('left', b2bRef)} ariaLabel="Stânga" />
              <PillNavButton direction="right" onClick={() => scroll('right', b2bRef)} ariaLabel="Dreapta" />

              <div
                ref={b2bRef}
                className="flex overflow-x-auto gap-4 px-2 py-2 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {b2bProducts.slice(0, 8).map(p => (
                  <div key={p.id} className={CARD_B2B}>
                    <ProductCard product={p} session={session} onViewDetails={handleViewDetails} onContactClick={handleContactClick} />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="h-10" />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function HomePage({ session, onNavigate, searchQuery = '', searchLocation = '' }) {
  const [products, setProducts] = useState([]);
  const [verifiedFarmers, setVerifiedFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const farmersRef = useRef(null);
  const b2bRef = useRef(null);
  const [b2cExpanded, setB2cExpanded] = useState(true);

  useEffect(() => { fetchProducts(); fetchVerifiedFarmers(); }, []);
  useEffect(() => {
    const t = setInterval(() => setCurrentSlide(p => (p + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_with_user').select('*')
        .eq('status', 'active').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch { toast.error('Eroare la încărcarea produselor'); }
    finally { setLoading(false); }
  };

  const fetchVerifiedFarmers = async () => {
    try {
      const { data } = await supabase
        .from('profiles').select('id, full_name, location, rating, is_verified, avatar_url')
        .eq('is_verified', true).order('rating', { ascending: false }).limit(12);
      setVerifiedFarmers(data || []);
    } catch { }
  };

  const scroll = (direction, ref) => {
    if (!ref?.current) return;
    const c = ref.current;
    const card = c.querySelector(':first-child');
    const cardWidth = card ? card.offsetWidth + 16 : 0; 
    const max = c.scrollWidth - c.clientWidth;
    if (direction === 'right') {
      c.scrollLeft >= max - 10
        ? c.scrollTo({ left: 0, behavior: 'smooth' })
        : c.scrollBy({ left: cardWidth, behavior: 'smooth' });
    } else {
      c.scrollLeft <= 10
        ? c.scrollTo({ left: max, behavior: 'smooth' })
        : c.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    }
  };

  const applySearch = (list) => {
    let r = list;
    if (searchQuery.trim()) r = r.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (searchLocation.trim()) r = r.filter(p => p.location?.toLowerCase().includes(searchLocation.toLowerCase()));
    return r;
  };

  const searched = applySearch(products);
  const b2cProducts = searched.filter(p => !B2B_IDS.includes(p.category));
  const b2bProducts = searched.filter(p => B2B_IDS.includes(p.category));

  const getNewProducts = () => b2cProducts.slice(0, 8);

  const b2bProviders = useMemo(() => {
    const map = {};
    b2bProducts.forEach(p => {
      if (!map[p.user_id]) {
        map[p.user_id] = {
          id: p.user_id,
          name: p.seller_name || 'Prestator',
          phone: p.seller_phone,
          location: p.location,
          rating: p.seller_rating,
          verified: p.seller_verified,
          services: [],
        };
      }
      const svc = p.subcategory || p.category;
      if (svc && !map[p.user_id].services.includes(svc)) {
        map[p.user_id].services.push(svc);
      }
    });
    return Object.values(map);
  }, [b2bProducts]);

  const b2cProviders = useMemo(() => {
    const map = {};
    b2cProducts.forEach(p => {
      if (!map[p.user_id]) {
        map[p.user_id] = {
          id: p.user_id,
          name: p.seller_name || 'Producător',
          phone: p.seller_phone,
          location: p.location,
          rating: p.seller_rating,
          verified: p.seller_verified,
          categories: [],
          productsCount: 0,
        };
      }
      map[p.user_id].productsCount += 1;
      if (p.category && !map[p.user_id].categories.includes(p.category)) {
        map[p.user_id].categories.push(p.category);
      }
    });
    return Object.values(map);
  }, [b2cProducts]);

  const handleViewDetails = async (productId) => {
    if (session) {
      try { await supabase.rpc('increment_product_views', { product_id: productId }); } catch { }
      onNavigate('detalii', productId);
    } else { onNavigate('login'); }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-gray-50">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden bg-gray-900">
        {heroImages.map((img, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-2xl text-white">
                  <h2 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
                    {i === 0 ? 'Produse proaspete direct de la producător' : img.alt}
                  </h2>
                  <p className="text-lg md:text-xl text-gray-200 mb-6 font-light">
                    Susținem micii antreprenori locali. Calitate garantată fără intermediari.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => setCurrentSlide(p => (p - 1 + heroImages.length) % heroImages.length)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-28 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all active:scale-95"
          style={{ borderRadius: '0 9999px 9999px 0' }}>
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </button>
        <button onClick={() => setCurrentSlide(p => (p + 1) % heroImages.length)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-28 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all active:scale-95"
          style={{ borderRadius: '9999px 0 0 9999px' }}>
          <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
        </button>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)}
              className={`transition-all duration-300 rounded-full ${i === currentSlide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`} />
          ))}
        </div>
      </div>

      {/* ── HARTA ─────────────────────────────────────────────── */}
      <div className="relative z-10 -mt-16 bg-white rounded-t-[40px] shadow-xl pt-10 pb-10">
        <NearbyFarmersMap products={products} onNavigate={onNavigate} />
      </div>

      {/* ── LOADING ───────────────────────────────────────────── */}
      {loading && (
        <div className="relative z-10 -mt-16 bg-white rounded-t-[40px] shadow-xl py-20 flex flex-col items-center gap-4">
          <Metronome size="40" speed="1.6" color="#059669" />
          <p className="text-gray-500 text-sm">Se încarcă produsele...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ── FERMIERI VERIFICAȚI ─────────────────────────── */}
          {verifiedFarmers.length > 0 && (
            <div className="relative z-10 -mt-16 bg-white rounded-t-[40px] shadow-xl px-4 sm:px-6 lg:px-8 pt-10 pb-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-600 text-base" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Fermieri Verificați</h3>
                </div>
                <button onClick={() => onNavigate('toate-produsele')}
                  className="px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all hover:scale-105 active:scale-95">
                  <span>Toți fermierii</span>
                  <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                </button>
              </div>
              {/* Wrapper relativ pentru fermieri */}
              <div className="relative">
                <div className="relative rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_1px_6px_-2px_rgba(0,0,0,0.08)] bg-white p-4">
                  <PillNavButton direction="left" onClick={() => scroll('left', farmersRef)} ariaLabel="Stânga" />
                  <PillNavButton direction="right" onClick={() => scroll('right', farmersRef)} ariaLabel="Dreapta" />
                  <div ref={farmersRef}
                    className="flex overflow-x-auto gap-4 py-2 snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {verifiedFarmers.map(f => <FarmerCard key={f.id} farmer={f} onNavigate={onNavigate} />)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── B2C ─────────────────────────────────────────── */}
          <B2CBlock
            b2cProducts={b2cProducts}
            getNewProducts={getNewProducts}
            session={session}
            onNavigate={onNavigate}
            handleViewDetails={handleViewDetails}
            handleContactClick={handleContactClick}
            scroll={scroll}
            onExpandChange={setB2cExpanded}
          />

          {/* ── B2B ─────────────────────────────────────────── */}
          <B2BBlock
            b2bProducts={b2bProducts}
            session={session}
            onNavigate={onNavigate}
            handleViewDetails={handleViewDetails}
            handleContactClick={handleContactClick}
            scroll={scroll}
            b2bRef={b2bRef}
            b2cExpanded={b2cExpanded}
          />

          {/* ── CATEGORII B2B GRID ────────────────────────────── */}
          <div className="relative z-10 bg-white shadow-[0_-8px_20px_-4px_rgba(0,0,0,0.06)]">
            <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-10">
              <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-6 border-b border-gray-100 pb-3">
                Categorii Servicii & Utilități
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                {B2B_CATEGORIES.map(cat => (
                  <div key={cat.id} className="relative p-6 bg-white hover:bg-gray-50 transition-colors group overflow-hidden">
                    <FontAwesomeIcon
                      icon={cat.icon}
                      className="absolute right-4 bottom-4 text-gray-100 group-hover:text-emerald-600 transition-colors"
                      style={{ fontSize: '72px' }}
                    />
                    <button
                      onClick={() => onNavigate('toate-produsele', null, { category: cat.id, type: 'b2b' })}
                      className="font-bold text-gray-900 hover:text-emerald-700 transition-colors text-left mb-3 block text-base"
                    >
                      {cat.name}
                    </button>
                    <ul className="space-y-1.5 mb-3">
                      {cat.subs.map(sub => (
                        <li key={sub}>
                          <button
                            onClick={() => onNavigate('toate-produsele', null, { category: cat.id, subcategory: sub, type: 'b2b' })}
                            className="text-sm text-gray-500 hover:text-emerald-600 transition-colors text-left"
                          >
                            {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => onNavigate('toate-produsele', null, { category: cat.id, type: 'b2b' })}
                      className="text-sm text-emerald-600 font-semibold hover:underline"
                    >
                      Vezi toate →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── PRESTATORI B2B ────────────────────────────────── */}
          {b2bProviders.length > 0 && (
            <div className="relative z-10 bg-white shadow-[0_-8px_20px_-4px_rgba(0,0,0,0.06)]">
              <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FontAwesomeIcon icon={faHandshake} className="text-emerald-600" />
                    Prestatori de Servicii
                  </h3>
                </div>
                <B2BProviderCarousel providers={b2bProviders} onNavigate={onNavigate} />
              </div>
            </div>
          )}

          {/* ── PRESTATORI B2C ────────────────────────────────── */}
          {b2cProviders.length > 0 && (
            <div className="relative z-10 bg-white shadow-[0_-8px_20px_-4px_rgba(0,0,0,0.06)]">
              <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-10">
                <div className="flex items-center gap-2 mb-6">
                  <FontAwesomeIcon icon={faSeedling} className="text-emerald-600 text-xl" />
                  <h3 className="text-2xl font-bold text-gray-900">Producători Alimentari</h3>
                </div>
                <B2CProviderCarousel providers={b2cProviders} onNavigate={onNavigate} />
              </div>
            </div>
          )}

          {/* ── INFO BANNER ───────────────────────────────────── */}
          <div className="px-4 sm:px-6 lg:px-8">
            <section className="my-12">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-3xl p-8 md:p-12 shadow-xl">
                <div className="grid md:grid-cols-3 gap-8 text-white">
                  {[
                    { icon: faTruck, title: 'Direct de la Sursă', desc: 'Fără intermediari, produse proaspete direct de la producător' },
                    { icon: faCircleCheck, title: 'Producători Verificați', desc: 'Toți vânzătorii sunt verificați pentru calitate și autenticitate' },
                    { icon: faHandshake, title: 'Fără Comisioane', desc: 'Platformă gratuită pentru toți producătorii locali' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FontAwesomeIcon icon={icon} className="text-3xl" />
                      </div>
                      <h4 className="text-lg font-semibold mb-2">{title}</h4>
                      <p className="text-emerald-100 text-sm">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {session && (
              <section className="mb-12">
                <div className="bg-white rounded-3xl p-8 md:p-12 text-center border border-gray-200 shadow-sm">
                  <h3 className="text-3xl font-bold text-gray-900 mb-3">Ești producător?</h3>
                  <p className="text-gray-500 mb-6 max-w-xl mx-auto">
                    Adaugă-ți produsele gratuit și ajunge la mii de cumpărători din zona ta.
                  </p>
                  <Button onClick={() => setShowAddProductModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Adaugă un produs acum
                  </Button>
                </div>
              </section>
            )}
          </div>
        </>
      )}

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <FontAwesomeIcon icon={faLeaf} className="text-emerald-600 text-xl" />
            <span className="text-lg font-bold text-gray-900">AgriConnect</span>
          </div>
          <p className="text-gray-500 text-sm">Sprijină economia locală. Cumpără direct de la producător.</p>
        </div>
      </footer>

      <AddProductModal isOpen={showAddProductModal} onClose={() => setShowAddProductModal(false)}
        session={session} onSuccess={fetchProducts} />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}