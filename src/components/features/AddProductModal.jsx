import { useState, useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
import { supabase } from '../../services/supabaseClient';
import ImageGalleryManager from './ImageGalleryManager';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot, faAppleWhole, faCow, faDrumstickBite,
  faEgg, faJar, faWheatAwn, faTimes,
  faTriangleExclamation, faCircleCheck,
  faLocationDot, faLocationCrosshairs, faMapMarkerAlt,
  faCheckCircle, faExclamationCircle,
  faTractor, faFlask, faWrench, faDroplet,
  faLeaf, faChevronDown
} from '@fortawesome/free-solid-svg-icons';

// ── Icon map: DB string → FontAwesome component ─────────────────
const iconMap = {
  faCarrot, faAppleWhole, faCow, faDrumstickBite,
  faEgg, faJar, faWheatAwn,
  faTractor, faFlask, faWrench, faDroplet, faLeaf
};

// ── Unități per categorie (cheie = slug din DB)
const CATEGORY_UNITS = {
  'legume': [
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'fructe': [
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'lactate': [
    { value: 'litru', label: 'Litre (L)' },
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'carne': [
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'oua': [
    { value: 'bucată', label: '10 Pieces' },
  ],
  'miere': [
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'cereale': [
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'field-services': [
    { value: 'hectar', label: 'Hectare (ha)' },
    { value: 'oră', label: 'Hour' },
  ],
  'default': [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'litru', label: 'Litre (L)' },
    { value: 'bucată', label: 'Piece' },
    { value: 'borcan', label: 'Jar' },
    { value: 'cutie', label: 'Box' },
    { value: 'pachet', label: '10 Pieces' },
  ],
};

const getUnitsForSlug = (slug) => {
  if (!slug) return CATEGORY_UNITS['default'];
  const units = CATEGORY_UNITS[slug];
  return units ?? CATEGORY_UNITS['default'];
};

const TODAY = new Date().toISOString().split('T')[0];

const calcExpiresAt = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ── Helpers ────────────────────────────────────────────────────
function Alert({ variant = 'default', title, children, className = '' }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    default: 'bg-gray-50 border-gray-200 text-gray-800'
  };
  const icons = { success: faCircleCheck, warning: faTriangleExclamation, danger: faTriangleExclamation, info: faCircleCheck, default: faTriangleExclamation };
  return (
    <div className={`border rounded-xl p-4 ${styles[variant]} ${className}`}>
      <div className="flex gap-3">
        <FontAwesomeIcon icon={icons[variant]} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {title && <p className="font-bold text-sm mb-1">{title}</p>}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, required, error, helper, children, ...props }) {
  return (
    <div className="space-y-1.5"> {/* Spatiere constantă între elemente */}
      {label && (
        <label className="block text-gray-600 text-[13px] font-semibold ml-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      {children || (
        <input
          className={`
            w-full px-4 py-2.5 bg-white border border-l-[3px] rounded-xl text-gray-800 text-sm
            placeholder:text-gray-400 transition-all duration-200
            focus:outline-none
            ${error
              ? 'border-red-200 border-l-red-400 bg-red-50/30'
              : 'border-gray-200 border-l-gray-300 hover:border-l-emerald-400 focus:border-l-emerald-500 focus:bg-emerald-50/20 focus:border-gray-200'
            }
          `}
          {...props}
        />
      )}

      {error && (
        <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-red-500">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
          {error}
        </p>
      )}

      {helper && !error && (
        <p className="px-1 text-[11px] text-gray-400 leading-relaxed italic">
          {helper}
        </p>
      )}
    </div>
  );
}

const cleanAddress = (placeName) => {
  if (!placeName) return '';
  const parts = placeName.split(',').map(p => p.trim());
  return parts
    .filter(p =>
      !p.match(/^Moldova$/i) &&
      !p.match(/^Romania$/i) &&
      !p.match(/^România$/i) &&
      !p.match(/^\d{4,6}$/) &&
      p.length > 0
    )
    .slice(0, 2)
    .join(', ');
};

// ── Main Component ─────────────────────────────────────────────
export default function AddProductModal({ isOpen, onClose, session, onSuccess, product }) {
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [galleryImages, setGalleryImages] = useState([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const locationMapRef = useRef(null);
  const locationMapContainerRef = useRef(null);
  const locationMarkerRef = useRef(null);
  const [activeGroup, setActiveGroup] = useState('b2c'); // 'b2c' | 'b2b'
  const [expiresAt, setExpiresAt] = useState(product?.expires_at || '');

  // ── Categories from DB ─────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: '',

    category: '',       // backward compat: category name string
    category_id: null,  // new FK
    subcategory: '',    // backward compat: subcategory name string
    subcategory_id: null, // new FK
    location: '',
    is_negotiable: false
  });

  const [errors, setErrors] = useState({});

  // ── Derived values ──────────────────────────────────────────
  const isB2B = activeGroup === 'b2b';
  const availableUnits = useMemo(() => {
    if (!formData.category_id || categories.length === 0) return CATEGORY_UNITS['default'];
    const selectedCat = categories.find(c => c.id === formData.category_id);
    if (!selectedCat) return CATEGORY_UNITS['default'];
    return getUnitsForSlug(selectedCat.slug);
  }, [formData.category_id, categories]);

  useEffect(() => {
    if (availableUnits.length > 0 && formData.category_id) {
      const currentUnitValid = availableUnits.some(u => u.value === formData.unit);
      if (!currentUnitValid) {
        setFormData(prev => ({ ...prev, unit: availableUnits[0].value }));
      }
    }
  }, [availableUnits]);

  const currentGroupCategories = categories.filter(c =>
    c.market_type === activeGroup || c.market_type === 'both'
  );

  // ── Fetch categories from DB ────────────────────────────────
  const fetchSubcategories = async (categoryId) => {
    if (!categoryId) { setSubcategories([]); return; }
    const { data } = await supabase
      .from('subcategories').select('*')
      .eq('category_id', categoryId).eq('is_active', true).order('sort_order');
    setSubcategories(data || []);
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    const { data } = await supabase
      .from('categories').select('*').eq('is_active', true).order('sort_order');
    if (data?.length > 0) {
      setCategories(data);
      // Select first b2c category by default
      const firstB2C = data.find(c => c.market_type === 'b2c' || c.market_type === 'both');
      if (firstB2C) {
        setFormData(prev => ({
          ...prev,
          category: firstB2C.name,
          category_id: firstB2C.id,
          subcategory: '',
          subcategory_id: null,
          unit: getUnitsForSlug(firstB2C.slug)[0].value
        }));
        fetchSubcategories(firstB2C.id);
      }
    }
    setLoadingCategories(false);
  };

  // ── Când schimbi categoria, resetează subcategoria și unitatea
  const handleCategoryChange = (cat) => {
    const newUnits = getUnitsForSlug(cat.slug);
    setFormData(prev => ({
      ...prev,
      category: cat.name,
      category_id: cat.id,
      subcategory: '',
      subcategory_id: null,
      unit: newUnits[0].value
    }));
    fetchSubcategories(cat.id);
  };

  // Când schimbi grupul (B2C/B2B), selectează prima categorie din grup
  const handleGroupChange = (groupType) => {
    setActiveGroup(groupType);
    const firstCat = categories.find(c => c.market_type === groupType || c.market_type === 'both');
    if (firstCat) handleCategoryChange(firstCat);
  };

  useEffect(() => {
    if (isOpen && session) {
      checkProfile();
      fetchCategories();
    }
  }, [isOpen, session]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setShowLocationMap(false);
      if (locationMapRef.current) {
        locationMapRef.current.remove();
        locationMapRef.current = null;
        locationMarkerRef.current = null;
      }
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!showLocationMap) {
      if (locationMapRef.current) {
        locationMapRef.current.remove();
        locationMapRef.current = null;
        locationMarkerRef.current = null;
      }
      return;
    }
    const timer = setTimeout(async () => {
      if (!locationMapContainerRef.current || locationMapRef.current) return;
      const initLat = 47.0105;
      const initLon = 28.8638;

      locationMapRef.current = new mapboxgl.Map({
        container: locationMapContainerRef.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [initLon, initLat],
        zoom: 7,
      });

      locationMapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      locationMapRef.current.on('click', async (e) => {
        const { lat, lng } = e.lngLat;
        const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=en&limit=1`
          );
          const data = await res.json();
          const rawAddress = data.features?.[0]?.place_name || '';
          const address = cleanAddress(rawAddress) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setFormData(p => ({ ...p, location: address }));
        } catch {
          setFormData(p => ({ ...p, location: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
        }
        if (locationMarkerRef.current) {
          locationMarkerRef.current.setLngLat([lng, lat]);
        } else {
          const el = document.createElement('div');
          el.innerHTML = `<div style="cursor:pointer"><svg width="36" height="44" viewBox="0 0 40 50" fill="none"><path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 30 20 30s20-15 20-30C40 8.95 31.05 0 20 0z" fill="#10b981"/><circle cx="20" cy="20" r="8" fill="white"/><circle cx="20" cy="20" r="5" fill="#10b981"/></svg></div>`;
          locationMarkerRef.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat])
            .addTo(locationMapRef.current);
          locationMarkerRef.current.on('dragend', async () => {
            const ll = locationMarkerRef.current.getLngLat();
            try {
              const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${ll.lng},${ll.lat}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&language=en&limit=1`
              );
              const data = await res.json();
              const rawAddress = data.features?.[0]?.place_name || '';
              const address = cleanAddress(rawAddress) || `${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`;
              setFormData(p => ({ ...p, location: address }));
            } catch {
              setFormData(p => ({ ...p, location: `${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}` }));
            }
          });
        }
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [showLocationMap]);

  const checkProfile = async () => {
    try {
      setCheckingProfile(true);
      const { data: profile, error } = await supabase
        .from('profiles').select('phone, location, full_name')
        .eq('id', session.user.id).maybeSingle();
      if (error) throw error;
      if (!profile) { toast.error('Profile is incomplete.'); onClose(); return; }
      const isNameValid = profile.full_name && /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name) && profile.full_name.trim().length >= 2;
      if (!profile.phone || !profile.location || !isNameValid) {
        const missing = [];
        if (!isNameValid) missing.push('valid name');
        if (!profile.phone) missing.push('phone');
        if (!profile.location) missing.push('location');
        toast.error(`Please complete in your profile: ${missing.join(', ')}`, { duration: 6000 });
        onClose(); return;
      }
      setFormData(prev => ({ ...prev, location: profile.location }));
    } catch (err) {
      toast.error('Eroare: ' + err.message); onClose();
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) { toast.error('Your browser does not support geolocation'); return; }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ro&zoom=18`);
          const data = await res.json();
          const a = data.address;
          const parts = [];
          if (a.road || a.street) parts.push(a.road || a.street);
          parts.push(a.city || a.town || a.village || a.municipality || a.county || '');
          const loc = parts.filter(Boolean).join(', ');
          if (loc) { setFormData(prev => ({ ...prev, location: loc })); toast.success(`Location: ${loc}`); }
          else toast.error('Could not determine exact location');
        } catch { toast.error('Error determining location'); }
        finally { setDetectingLocation(false); }
      },
      (err) => {
        const msgs = { 1: 'Location permission was denied.', 2: 'Location is not available.', 3: 'Detection timed out.' };
        toast.error(msgs[err.code] || 'Could not detect location', { duration: 5000 });
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validateForm = () => {
    const e = {};
    if (!formData.name.trim()) {
      e.name = 'Name is required';
    } else if (formData.name.trim().length < 3) {
      e.name = 'Name must be at least 3 characters';
    } else if (/^[\s\-']+$/.test(formData.name.trim())) {
      e.name = 'Name must contain letters';
    }
    if (!formData.description.trim() || formData.description.length < 20) e.description = 'Description must be at least 20 characters';
    if (!formData.price || formData.price === '') {
      e.price = 'Price is required';
    } else if (parseFloat(formData.price) <= 0) {
      e.price = 'Price must be greater than 0';
    } else if (parseFloat(formData.price) > 999999) {
      e.price = 'Price cannot exceed 999,999 lei';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validateForm()) { toast.error('Please fill in all fields correctly'); return; }
    if (galleryImages.some(img => img.isUploading)) { toast.error('Please wait for image upload to finish!'); return; }

    try {
      setLoading(true);
      const { data: profile, error: pErr } = await supabase
        .from('profiles').select('phone, location, full_name').eq('id', session.user.id).maybeSingle();
      if (pErr) throw pErr;
      if (!profile?.phone || !profile?.location) { toast.error('Please complete phone and location in your profile!'); onClose(); return; }
      if (!profile?.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name)) { toast.error('Please add a valid name in your profile!'); onClose(); return; }

      const imageUrls = galleryImages.filter(img => !img.isUploading).map(img => img.url);
      const { error } = await supabase.from('products').insert({
        user_id: session.user.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        unit: formData.unit,
        quantity: null,
        category: formData.category,
        category_id: formData.category_id,
        subcategory: formData.subcategory || null,
        subcategory_id: formData.subcategory_id || null,
        location: formData.location || profile.location,
        is_negotiable: formData.is_negotiable,
        image_url: imageUrls[0] || null,
        gallery_images: imageUrls.slice(1).length > 0 ? imageUrls.slice(1) : null,
        status: 'pending',
        expires_at: expiresAt || null
      }).select().single();
      if (error) throw error;

      toast.success('Product added successfully!', { duration: 4000 });
      setFormData({ name: '', description: '', price: '', unit: '', category: '', category_id: null, subcategory: '', subcategory_id: null, location: '', is_negotiable: false });
      setGalleryImages([]); setErrors({}); setActiveGroup('b2c'); setExpiresAt('');
      setSubcategories([]);
      onClose(); if (onSuccess) onSuccess();
    } catch (err) {
      toast.error('Eroare: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  const hasUploadingImages = galleryImages.some(img => img.isUploading);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
        .custom-scroll:hover::-webkit-scrollbar-thumb { background: #10b981; }
        .custom-scroll { scrollbar-width: thin; scrollbar-color: #e5e7eb transparent; }
        .custom-scroll:hover { scrollbar-color: #10b981 transparent; }
      `}</style>
      <div className="bg-white overflow-hidden rounded-b-3xl rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5 flex justify-between items-center rounded-t-3xl flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {checkingProfile ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4" />
            <p className="text-gray-600">Checking profile...</p>
          </div>
        ) : (
          <>
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-grow custom-scroll min-h-0">
            <div className="p-6 space-y-8">

              {/* SECȚIUNEA 1: Tip produs */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Product type
                </h3>

                {/* Toggle B2C / B2B */}
                <div className="flex gap-3 mb-5">
                  {[
                    { type: 'b2c', label: 'Food Products' },
                    { type: 'b2b', label: 'Agricultural Services & Utilities' }
                  ].map(group => (
                    <button key={group.type} type="button" onClick={() => handleGroupChange(group.type)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all
                        ${activeGroup === group.type
                          ? group.type === 'b2b'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <FontAwesomeIcon icon={group.type === 'b2b' ? faTractor : faLeaf} />
                      {group.label}
                    </button>
                  ))}
                </div>

                {/* Grid categorii din grupul activ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {loadingCategories ? (
                    <div className="col-span-4 flex justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600" />
                    </div>
                  ) : (
                    currentGroupCategories.map(cat => (
                      <button key={cat.id} type="button" onClick={() => handleCategoryChange(cat)}
                        className={`p-3.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5
                          ${formData.category_id === cat.id
                            ? activeGroup === 'b2b'
                              ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                              : 'bg-emerald-600 border-emerald-600 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                        {iconMap[cat.icon] && (
                          <FontAwesomeIcon icon={iconMap[cat.icon]}
                            className={`text-xl ${formData.category_id === cat.id
                              ? activeGroup === 'b2b' ? 'text-white' : 'text-white'
                              : 'text-gray-400'}`} />
                        )}
                        <span className={`text-xs font-medium text-center leading-tight ${formData.category_id === cat.id
                          ? activeGroup === 'b2b' ? 'text-white' : 'text-white'
                          : 'text-gray-700'}`}>
                          {cat.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Subcategorie dropdown */}
                {subcategories.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Subcategory
                    </label>
                    <div className="relative">
                      <select
                        value={formData.subcategory_id || ''}
                        onChange={e => {
                          const sub = subcategories.find(s => s.id === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            subcategory_id: e.target.value || null,
                            subcategory: sub?.name || ''
                          }));
                        }}
                        className={`w-full px-4 py-3 pr-10 bg-gray-50 border rounded-xl text-gray-900 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 transition-all
                          ${activeGroup === 'b2b' ? ' focus:ring-gray-100' : 'focus:ring-gray-300'}`}>
                        <option value="">Select subcategory</option>
                        {subcategories.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                      <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECȚIUNEA 2: Informații de bază ──────────── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Basic information
                </h3>
                <div className="space-y-5">
                  {/* Imagini */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-3">Product Photos (Max 4)</label>
                    <ImageGalleryManager initialImages={[]} onChange={setGalleryImages} userId={session.user.id} disabled={loading} />
                    <p className="text-gray-500 text-xs mt-2">The first image will be shown on the main page.</p>
                  </div>

                  {/* Nume */}
                  <FormInput label="Product Name" required error={errors.name}
                    helper="Letters and spaces only (no digits or symbols)"
                    value={formData.name} onChange={e => {
                      const value = e.target.value;
                      const filtered = value.replace(/[^a-zA-ZăâîșțĂÂÎȘȚ\s\-']/g, '');
                      setFormData(prev => ({ ...prev, name: filtered }));
                    }}
                    placeholder={isB2B ? 'e.g.: Plowing services, Organic fertilizer' : 'e.g.: Organic country tomatoes, Sheep cheese'} />

                  {/* Descriere */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={isB2B
                        ? 'Describe the service: what it includes, availability, coverage area...'
                        : 'Describe the product: how it was grown, properties, delivery conditions...'}
                      rows={4}
                      className={`w-full px-4 py-3 bg-white border border-l-[3px] rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all resize-none
                        ${errors.description
                          ? 'border-red-200 border-l-red-400 bg-red-50/30'
                          : 'border-gray-200 border-l-gray-300 hover:border-l-emerald-400 focus:border-l-emerald-500 focus:bg-emerald-50/20 focus:border-gray-200'
                        }`} />
                    <div className="flex justify-between mt-1">
                      <p className={`text-xs ${errors.description ? 'text-red-600' : 'text-gray-500'}`}>
                        {errors.description || 'Minimum 20 characters'}
                      </p>
                      <p className={`text-xs ${formData.description.length >= 20 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {formData.description.length} / 500
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/*SECȚIUNEA 3: Preț */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Price
                </h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Preț */}
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="\d{1,6}(\.\d{0,2})?"
                          maxLength={9}
                          value={formData.price}
                          onChange={e => {
                            const value = e.target.value;
                            if (value === '' || /^\d{1,6}(\.\d{0,2})?$/.test(value)) {
                              setFormData(prev => ({ ...prev, price: value }));
                            }
                          }}
                          placeholder="0.00"
                          className={`w-full px-4 py-3 pr-12 bg-white border border-l-[3px] rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all
                            ${errors.price
                              ? 'border-red-200 border-l-red-400 bg-red-50/30'
                              : 'border-gray-200 border-l-gray-300 hover:border-l-emerald-400 focus:border-l-emerald-500 focus:bg-emerald-50/20 focus:border-gray-200'
                            }`} />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">lei</span>
                      </div>
                      {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                      {!errors.price && (
                        <p className="text-[11px] text-gray-600 mt-1 px-1">
                          Ex: 25, 12.50...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unitate de măsură — dinamic */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-3">
                      Unit of measure <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableUnits.map(unit => (
                        <button key={unit.value} type="button"
                          onClick={() => setFormData(prev => ({ ...prev, unit: unit.value }))}
                          className={`px-4 py-2 rounded-full font-medium transition-all text-sm
                            ${formData.unit === unit.value
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                          {unit.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Negociabil */}
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                    <input type="checkbox" checked={formData.is_negotiable}
                      onChange={e => setFormData(prev => ({ ...prev, is_negotiable: e.target.checked }))}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <div>
                      <span className="text-gray-900 font-medium text-sm">Negotiable price</span>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {isB2B ? 'Allow clients to negotiate the rate' : 'Allow buyers to negotiate the price'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/*Sectiunea 4: Locație  */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Location
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <FontAwesomeIcon icon={faLocationDot} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Profile location will be used if left empty"
                      className="w-full pl-12 pr-4 py-3 bg-white border border-l-[3px] border-gray-200 border-l-gray-300 rounded-xl text-gray-900 placeholder-gray-400 hover:border-l-emerald-400 focus:border-l-emerald-500 focus:bg-emerald-50/20 focus:border-gray-200 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={loading || detectingLocation}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 border-2 border-emerald-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {detectingLocation ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                          <span>Detecting...</span>
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faLocationCrosshairs} />
                          <span>Use my location</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLocationMap(p => !p)}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all border-2 ${showLocationMap ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-emerald-600 text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      <FontAwesomeIcon icon={faMapMarkerAlt} />
                      <span>Pick on map</span>
                    </button>
                  </div>

                  {showLocationMap && (
                    <div className="mt-3">
                      <div
                        className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-100"
                        style={{ height: '220px' }}
                      >
                        <div ref={locationMapContainerRef} className="w-full h-full" />
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full pointer-events-none z-10">
                          Click on map to set pin
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Click on the map to set location, or drag the pin.
                      </p>
                    </div>
                  )}

                  <p className="text-gray-500 text-xs">Location helps buyers find products in their area.</p>
                </div>
              </div>

              {/* ── Perioadă de valabilitate ── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Validity period
                </h3>

                {/* Quick-pick chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[{ label: '7 days', days: 7 }, { label: '14 days', days: 14 }, { label: '30 days', days: 30 }, { label: '60 days', days: 60 }].map(opt => {
                    const chipDate = calcExpiresAt(opt.days);
                    const isActive = expiresAt === chipDate;
                    return (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => setExpiresAt(isActive ? '' : chipDate)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${isActive
                          ? activeGroup === 'b2b' ? 'bg-blue-600 text-white border-blue-600' : 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  {expiresAt && !([7, 14, 30, 60].map(d => calcExpiresAt(d)).includes(expiresAt)) && (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${activeGroup === 'b2b' ? 'bg-blue-600 text-white border-blue-600' : 'bg-emerald-600 text-white border-emerald-600'}`}>
                      {expiresAt.split('-').reverse().join('.')}
                    </span>
                  )}
                  {expiresAt && (
                    <button
                      type="button"
                      onClick={() => setExpiresAt('')}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                      No limit
                    </button>
                  )}
                </div>

                {/* Calendar input */}
                <input
                  type="date"
                  value={expiresAt}
                  min={TODAY}
                  onChange={e => setExpiresAt(e.target.value)}
                  onClick={e => {
                    e.preventDefault();
                    e.currentTarget.showPicker?.();
                  }}
                  onFocus={e => {
                    e.preventDefault();
                    e.currentTarget.showPicker?.();
                  }}
                  className="w-full px-4 py-3 bg-white border border-l-[3px] rounded-xl text-gray-900 text-sm focus:outline-none transition-all cursor-pointer border-gray-200 border-l-gray-300 hover:border-l-emerald-400 focus:border-l-emerald-500 focus:bg-emerald-50/20 focus:border-gray-200"
                />

                <p className={`text-xs mt-2 ${expiresAt ? 'text-gray-500' : 'text-gray-400'}`}>
                  {expiresAt
                    ? <>Listing will be active until: <span className="font-semibold text-gray-700">{expiresAt.split('-').reverse().join('.')}</span></>
                    : 'Listing remains active with no time limit.'
                  }
                </p>
              </div>

            </div>{/* end inner padding */}

          </form>

          {/* Submit — outside form, stays fixed at bottom */}
          <div className="bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-3xl flex-shrink-0">
            <button type="button" onClick={handleSubmit} disabled={loading || hasUploadingImages}
              className={`flex-1 font-semibold py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-white
                ${isB2B ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                  Adding...
                </span>
              ) : hasUploadingImages ? 'Uploading images...' : 'Add Product'}
            </button>
            <button type="button" onClick={onClose} disabled={loading}
              className="px-8 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3.5 rounded-xl transition disabled:opacity-50">
              Cancel
            </button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
