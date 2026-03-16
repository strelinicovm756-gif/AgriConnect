import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import ImageGalleryManager from './ImageGalleryManager';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot, faAppleWhole, faCow, faDrumstickBite,
  faEgg, faJar, faWheatAwn, faTimes,
  faTriangleExclamation, faCircleCheck,
  faLocationDot, faLocationCrosshairs,
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
    { value: 'litru', label: 'Litru (L)' },
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'carne': [
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'oua': [
    { value: 'bucată', label: '10 Bucăți' },
  ],
  'cereale': [
    { value: 'kg', label: 'Kilogram (kg)' },
  ],
  'servicii-teren': [
    { value: 'hectar', label: 'Hectar (ha)' },
    { value: 'oră', label: 'Oră' },
    { value: 'zi', label: 'Zi de lucru' },
  ],
  'default': [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'bucată', label: 'Bucată' },
    { value: 'litru', label: 'Litru (L)' },
    { value: 'borcan', label: 'Borcan' },
    { value: 'cutie', label: 'Cutie' },
    { value: 'pachet', label: 'Pachet' },
  ],
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

// ── Main Component ─────────────────────────────────────────────
export default function AddProductModal({ isOpen, onClose, session, onSuccess, product }) {
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [galleryImages, setGalleryImages] = useState([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
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
    const selectedCat = categories.find(c => c.id === formData.category_id);
    if (!selectedCat?.slug) return CATEGORY_UNITS['default'];
    return CATEGORY_UNITS[selectedCat.slug] ?? CATEGORY_UNITS['default'];
  }, [formData.category_id, categories]);

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
          unit: (CATEGORY_UNITS[firstB2C.slug] ?? CATEGORY_UNITS['default'])[0].value
        }));
        fetchSubcategories(firstB2C.id);
      }
    }
    setLoadingCategories(false);
  };

  // ── Când schimbi categoria, resetează subcategoria și unitatea
  const handleCategoryChange = (cat) => {
    const newUnits = CATEGORY_UNITS[cat.slug] ?? CATEGORY_UNITS['default'];
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

  const checkProfile = async () => {
    try {
      setCheckingProfile(true);
      const { data: profile, error } = await supabase
        .from('profiles').select('phone, location, full_name')
        .eq('id', session.user.id).maybeSingle();
      if (error) throw error;
      if (!profile) { toast.error('Profilul este incomplet.'); onClose(); return; }
      const isNameValid = profile.full_name && /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name) && profile.full_name.trim().length >= 2;
      if (!profile.phone || !profile.location || !isNameValid) {
        const missing = [];
        if (!isNameValid) missing.push('nume valid');
        if (!profile.phone) missing.push('telefon');
        if (!profile.location) missing.push('locație');
        toast.error(`Completează în profil: ${missing.join(', ')}`, { duration: 6000 });
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
    if (!navigator.geolocation) { toast.error('Browserul nu suportă geolocalizare'); return; }
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
          if (loc) { setFormData(prev => ({ ...prev, location: loc })); toast.success(`Locație: ${loc}`); }
          else toast.error('Nu am putut determina locația exactă');
        } catch { toast.error('Eroare la determinarea locației'); }
        finally { setDetectingLocation(false); }
      },
      (err) => {
        const msgs = { 1: 'Permisiunea pentru locație a fost refuzată.', 2: 'Locația nu este disponibilă.', 3: 'Timeout la detectare.' };
        toast.error(msgs[err.code] || 'Nu am putut detecta locația', { duration: 5000 });
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validateForm = () => {
    const e = {};
    if (!formData.name.trim()) {
      e.name = 'Numele este obligatoriu';
    } else if (formData.name.trim().length < 3) {
      e.name = 'Numele trebuie să aibă minim 3 caractere';
    } else if (/^[\s\-']+$/.test(formData.name.trim())) {
      e.name = 'Numele trebuie să conțină litere';
    }
    if (!formData.description.trim() || formData.description.length < 20) e.description = 'Descrierea trebuie să aibă minim 20 caractere';
    if (!formData.price || formData.price === '') {
      e.price = 'Prețul este obligatoriu';
    } else if (parseFloat(formData.price) <= 0) {
      e.price = 'Prețul trebuie să fie mai mare ca 0';
    } else if (parseFloat(formData.price) > 999999) {
      e.price = 'Prețul nu poate depăși 999,999 lei';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validateForm()) { toast.error('Completează corect toate câmpurile'); return; }
    if (galleryImages.some(img => img.isUploading)) { toast.error('Așteaptă finalizarea încărcării imaginilor!'); return; }

    try {
      setLoading(true);
      const { data: profile, error: pErr } = await supabase
        .from('profiles').select('phone, location, full_name').eq('id', session.user.id).maybeSingle();
      if (pErr) throw pErr;
      if (!profile?.phone || !profile?.location) { toast.error('Completează telefon și locație în profil!'); onClose(); return; }
      if (!profile?.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name)) { toast.error('Completează un nume valid în profil!'); onClose(); return; }

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

      toast.success('Produs adăugat cu succes!', { duration: 4000 });
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
      <div className="bg-white overflow-hidden rounded-b-3xl rounded-3xl max-w-3xl w-full my-8 shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5 flex justify-between items-center rounded-t-3xl flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Adaugă Produs Nou</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {checkingProfile ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4" />
            <p className="text-gray-600">Verificare profil...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-grow">
            <div className="p-6 space-y-8">

              {/* SECȚIUNEA 1: Tip produs */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Tipul produsului
                </h3>

                {/* Toggle B2C / B2B */}
                <div className="flex gap-3 mb-5">
                  {[
                    { type: 'b2c', label: 'Produse Alimentare' },
                    { type: 'b2b', label: 'Servicii & Utilități Agricole' }
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
                      Subcategorie
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
                        <option value="">Selectează subcategorie</option>
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
                  Informații de bază
                </h3>
                <div className="space-y-5">
                  {/* Imagini */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-3">Fotografii Produs (Max 4)</label>
                    <ImageGalleryManager initialImages={[]} onChange={setGalleryImages} userId={session.user.id} disabled={loading} />
                    <p className="text-gray-500 text-xs mt-2">Prima imagine va fi afișată pe pagina principală.</p>
                  </div>

                  {/* Nume */}
                  <FormInput label="Nume Produs" required error={errors.name}
                    helper="Doar litere și spații (fără cifre sau simboluri)"
                    value={formData.name} onChange={e => {
                      const value = e.target.value;
                      const filtered = value.replace(/[^a-zA-ZăâîșțĂÂÎȘȚ\s\-']/g, '');
                      setFormData(prev => ({ ...prev, name: filtered }));
                    }}
                    placeholder={isB2B ? 'ex: Servicii arat, Fertilizant organic' : 'ex: Roșii bio de țară, Brânză de oaie'} />

                  {/* Descriere */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Descriere <span className="text-red-500">*</span>
                    </label>
                    <textarea value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={isB2B
                        ? 'Descrie serviciul: ce include, disponibilitate, zonă de acoperire...'
                        : 'Descrie produsul: cum a fost cultivat, proprietăți, condiții de livrare...'}
                      rows={4}
                      className={`w-full px-4 py-3 bg-white border border-l-[3px] rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all resize-none
                        ${errors.description
                          ? 'border-red-200 border-l-red-400 bg-red-50/30'
                          : 'border-gray-200 border-l-gray-300 hover:border-l-emerald-400 focus:border-l-emerald-500 focus:bg-emerald-50/20 focus:border-gray-200'
                        }`} />
                    <div className="flex justify-between mt-1">
                      <p className={`text-xs ${errors.description ? 'text-red-600' : 'text-gray-500'}`}>
                        {errors.description || 'Minim 20 de caractere'}
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
                  Preț
                </h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Preț */}
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Preț <span className="text-red-500">*</span>
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
                      Unitate de măsură <span className="text-red-500">*</span>
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
                      <span className="text-gray-900 font-medium text-sm">Preț negociabil</span>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {isB2B ? 'Permite clienților să negocieze tariful' : 'Permite cumpărătorilor să negocieze prețul'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/*Sectiunea 4: Locație  */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Locație
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <FontAwesomeIcon icon={faLocationDot} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Se folosește locația din profil dacă nu completezi"
                      className="w-full pl-12 pr-4 py-3 bg-white border border-l-[3px] border-gray-200 border-l-gray-300 rounded-xl text-gray-900 placeholder-gray-400 hover:border-l-emerald-400 focus:border-l-emerald-500 focus:bg-emerald-50/20 focus:border-gray-200 focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={loading || detectingLocation}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 border-2 border-emerald-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-emerald-700 hover:border-emerald-700 disabled:opacity-50 group"
                  >
                    {detectingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                        <span>Detectare...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faLocationCrosshairs} className="group-hover:scale-110 transition-transform" />
                        <span>Folosește locația curentă</span>
                      </>
                    )}
                  </button>

                  <p className="text-gray-500 text-xs">Locația ajută cumpărătorii să găsească produse din zona lor.</p>
                </div>
              </div>

              {/* ── Perioadă de valabilitate ── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Perioadă de valabilitate
                </h3>

                {/* Quick-pick chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[{ label: '7 zile', days: 7 }, { label: '14 zile', days: 14 }, { label: '30 zile', days: 30 }, { label: '60 zile', days: 60 }].map(opt => {
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
                      Fără limită
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
                    ? <>Anunțul va fi activ până pe: <span className="font-semibold text-gray-700">{expiresAt.split('-').reverse().join('.')}</span></>
                    : 'Anunțul rămâne activ fără limită de timp.'
                  }
                </p>
              </div>

            </div>{/* end inner padding */}

            {/* Submit — sticky bottom */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-3xl flex-shrink-0">
              <button type="submit" disabled={loading || hasUploadingImages}
                className={`flex-1 font-semibold py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-white
                  ${isB2B ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                    Se adaugă...
                  </span>
                ) : hasUploadingImages ? 'Se încarcă imaginile...' : 'Adaugă Produs'}
              </button>
              <button type="button" onClick={onClose} disabled={loading}
                className="px-8 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3.5 rounded-xl transition disabled:opacity-50">
                Anulează
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
