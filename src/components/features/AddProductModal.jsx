import { useState, useEffect } from 'react';
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

// ── Structura categorii ────────────────────────────────────────
const CATEGORY_GROUPS = [
  {
    type: 'b2c',
    label: 'Produse Alimentare',
    color: 'emerald',
    categories: [
      {
        id: 'Legume', name: 'Legume', icon: faCarrot,
        subs: ['Rădăcinoase', 'Verzișuri', 'Roșii & Ardei', 'Dovlecei & Castraveți', 'Altele']
      },
      {
        id: 'Fructe', name: 'Fructe', icon: faAppleWhole,
        subs: ['Mere & Pere', 'Fructe de pădure', 'Citrice', 'Struguri', 'Altele']
      },
      {
        id: 'Lactate', name: 'Lactate', icon: faCow,
        subs: ['Lapte', 'Brânzeturi', 'Smântână & Unt', 'Iaurt', 'Altele']
      },
      {
        id: 'Carne', name: 'Carne', icon: faDrumstickBite,
        subs: ['Carne de porc', 'Carne de vită', 'Pasăre', 'Mezeluri artizanale', 'Altele']
      },
      {
        id: 'Ouă', name: 'Ouă', icon: faEgg,
        subs: ['Ouă de găină', 'Ouă de rață', 'Ouă de prepeliță', 'Altele']
      },
      {
        id: 'Miere', name: 'Miere', icon: faJar,
        subs: ['Miere de flori', 'Miere de salcâm', 'Miere de tei', 'Produse apicole', 'Altele']
      },
      {
        id: 'Cereale', name: 'Cereale', icon: faWheatAwn,
        subs: ['Grâu', 'Porumb', 'Floarea-soarelui', 'Orz & Ovăz', 'Altele']
      },
    ]
  },
  {
    type: 'b2b',
    label: 'Servicii & Utilități Agricole',
    color: 'blue',
    categories: [
      {
        id: 'Servicii Teren', name: 'Servicii Teren', icon: faTractor,
        subs: ['Arat & Prelucrare sol', 'Semănat', 'Recoltare mecanizată', 'Transport agricol', 'Altele']
      },
      {
        id: 'Protecția Plantelor', name: 'Protecția Plantelor', icon: faFlask,
        subs: ['Pesticide', 'Erbicide', 'Îngrășăminte organice', 'Fungicide', 'Altele']
      },
      {
        id: 'Echipamente', name: 'Echipamente', icon: faWrench,
        subs: ['Unelte manuale', 'Piese schimb utilaje', 'Utilaje second-hand', 'Altele']
      },
      {
        id: 'Sisteme de Irigare', name: 'Sisteme de Irigare', icon: faDroplet,
        subs: ['Sisteme picurare', 'Pompe apă', 'Furtunuri & Accesorii', 'Altele']
      },
    ]
  }
];

// ── Unități per tip ────────────────────────────────────────────
const UNITS_B2C = [
  { value: 'kg',     label: 'Kilogram (kg)' },
  { value: 'bucată', label: 'Bucată' },
  { value: 'litru',  label: 'Litru (L)' },
  { value: 'borcan', label: 'Borcan' },
  { value: 'cutie',  label: 'Cutie' },
  { value: 'legătură', label: 'Legătură' },
];

const UNITS_B2B = [
  { value: 'oră',   label: 'Oră' },
  { value: 'zi',    label: 'Zi' },
  { value: 'ha',    label: 'Hectar (ha)' },
  { value: 'ar',    label: 'Ar' },
  { value: 'bucată', label: 'Bucată' },
  { value: 'litru', label: 'Litru (L)' },
  { value: 'kg',    label: 'Kilogram (kg)' },
  { value: 'set',   label: 'Set' },
];

const B2B_IDS = CATEGORY_GROUPS.find(g => g.type === 'b2b').categories.map(c => c.id);

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
    <div>
      {label && (
        <label className="block text-gray-700 text-sm font-medium mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children || (
        <input
          className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
            ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'}`}
          {...props}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-xs" />{error}</p>}
      {helper && !error && <p className="text-gray-500 text-xs mt-1">{helper}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function AddProductModal({ isOpen, onClose, session, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [galleryImages, setGalleryImages] = useState([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [activeGroup, setActiveGroup] = useState('b2c'); // 'b2c' | 'b2b'

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'kg',
    quantity: '',
    category: 'Legume',
    subcategory: '',
    location: '',
    is_negotiable: false
  });

  const [errors, setErrors] = useState({});

  // ── Categoria curentă selectată ─────────────────────────────
  const allCategories = CATEGORY_GROUPS.flatMap(g => g.categories);
  const currentCat = allCategories.find(c => c.id === formData.category);
  const isB2B = B2B_IDS.includes(formData.category);
  const units = isB2B ? UNITS_B2B : UNITS_B2C;

  // Când schimbi categoria, resetează subcategoria și unitatea
  const handleCategoryChange = (catId) => {
    const cat = allCategories.find(c => c.id === catId);
    const newIsB2B = B2B_IDS.includes(catId);
    const defaultUnit = newIsB2B ? 'oră' : 'kg';
    setFormData(prev => ({
      ...prev,
      category: catId,
      subcategory: cat?.subs?.[0] || '',
      unit: defaultUnit
    }));
  };

  // Când schimbi grupul (B2C/B2B), selectează prima categorie din grup
  const handleGroupChange = (groupType) => {
    setActiveGroup(groupType);
    const group = CATEGORY_GROUPS.find(g => g.type === groupType);
    if (group?.categories?.length > 0) {
      handleCategoryChange(group.categories[0].id);
    }
  };

  useEffect(() => {
    if (isOpen && session) checkProfile();
  }, [isOpen, session]);

  // Inițializează subcategoria la prima deschidere
  useEffect(() => {
    if (currentCat?.subs?.length > 0 && !formData.subcategory) {
      setFormData(prev => ({ ...prev, subcategory: currentCat.subs[0] }));
    }
  }, []);

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
    if (!formData.name.trim()) e.name = 'Numele este obligatoriu';
    if (!formData.description.trim() || formData.description.length < 20) e.description = 'Descrierea trebuie să aibă minim 20 caractere';
    if (!formData.price || parseFloat(formData.price) <= 0) e.price = 'Prețul trebuie să fie mai mare ca 0';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) e.quantity = 'Cantitatea trebuie să fie mai mare ca 0';
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
        quantity: parseFloat(formData.quantity),
        category: formData.category,
        subcategory: formData.subcategory || null,
        location: formData.location || profile.location,
        is_negotiable: formData.is_negotiable,
        image_url: imageUrls[0] || null,
        gallery_images: imageUrls.slice(1).length > 0 ? imageUrls.slice(1) : null,
        status: 'active'
      }).select().single();
      if (error) throw error;

      toast.success('Produs adăugat cu succes!', { duration: 4000 });
      setFormData({ name: '', description: '', price: '', unit: 'kg', quantity: '', category: 'Legume', subcategory: '', location: '', is_negotiable: false });
      setGalleryImages([]); setErrors({}); setActiveGroup('b2c');
      onClose(); if (onSuccess) onSuccess();
    } catch (err) {
      toast.error('Eroare: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  const hasUploadingImages = galleryImages.some(img => img.isUploading);
  const currentGroup = CATEGORY_GROUPS.find(g => g.type === activeGroup);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full my-8 shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5 flex justify-between items-center rounded-t-3xl flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Adaugă Produs Nou</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {isB2B ? 'Serviciu sau utilitate agricolă' : 'Produs alimentar sau agricol'}
            </p>
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

              {/* ── SECȚIUNEA 1: Tip produs ───────────────────── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Tipul produsului
                </h3>

                {/* Toggle B2C / B2B */}
                <div className="flex gap-3 mb-5">
                  {CATEGORY_GROUPS.map(group => (
                    <button key={group.type} type="button" onClick={() => handleGroupChange(group.type)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all
                        ${activeGroup === group.type
                          ? group.type === 'b2b'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <FontAwesomeIcon icon={group.type === 'b2b' ? faTractor : faLeaf} />
                      {group.label}
                    </button>
                  ))}
                </div>

                {/* Grid categorii din grupul activ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {currentGroup.categories.map(cat => (
                    <button key={cat.id} type="button" onClick={() => handleCategoryChange(cat.id)}
                      className={`p-3.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5
                        ${formData.category === cat.id
                          ? activeGroup === 'b2b'
                            ? 'bg-blue-50 border-blue-500 shadow-sm'
                            : 'bg-emerald-50 border-emerald-500 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <FontAwesomeIcon icon={cat.icon}
                        className={`text-xl ${formData.category === cat.id
                          ? activeGroup === 'b2b' ? 'text-blue-600' : 'text-emerald-600'
                          : 'text-gray-400'}`} />
                      <span className={`text-xs font-medium text-center leading-tight ${formData.category === cat.id
                        ? activeGroup === 'b2b' ? 'text-blue-700' : 'text-emerald-700'
                        : 'text-gray-700'}`}>
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Subcategorie dropdown */}
                {currentCat?.subs?.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Subcategorie <span className="text-gray-400 font-normal">(opțional)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.subcategory}
                        onChange={e => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                        className={`w-full px-4 py-3 pr-10 bg-gray-50 border rounded-xl text-gray-900 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 transition-all
                          ${activeGroup === 'b2b' ? 'border-blue-200 focus:ring-blue-400' : 'border-gray-200 focus:ring-emerald-400'}`}>
                        {currentCat.subs.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Info banner B2B */}
                {isB2B && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                    <FontAwesomeIcon icon={faTractor} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-semibold mb-0.5">Produs / Serviciu B2B</p>
                      <p className="text-blue-600 text-xs">Acesta va apărea în secțiunea „Servicii & Utilități" pentru fermieri și producători agricoli.</p>
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
                    value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all resize-none
                        ${errors.description ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'}`} />
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

              {/* ── SECȚIUNEA 3: Preț și Cantitate ───────────── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Preț și cantitate
                </h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Preț */}
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Preț <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input type="number" step="0.01" min="0" value={formData.price}
                          onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                          className={`w-full px-4 py-3 pr-12 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
                            ${errors.price ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'}`} />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">lei</span>
                      </div>
                      {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                    </div>

                    {/* Cantitate */}
                    <FormInput label="Cantitate disponibilă" type="number" step="0.01" min="0" required
                      error={errors.quantity} value={formData.quantity}
                      onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder={isB2B ? 'ex: 10' : 'ex: 50'} />
                  </div>

                  {/* Unitate de măsură — dinamic */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-3">
                      Unitate de măsură <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {units.map(unit => (
                        <button key={unit.value} type="button"
                          onClick={() => setFormData(prev => ({ ...prev, unit: unit.value }))}
                          className={`px-4 py-2 rounded-full font-medium transition-all text-sm
                            ${formData.unit === unit.value
                              ? isB2B ? 'bg-blue-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md'
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

              {/* ── SECȚIUNEA 4: Locație ─────────────────────── */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Locație
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <FontAwesomeIcon icon={faLocationDot} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={formData.location}
                      onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Se folosește locația din profil dacă nu completezi"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                  </div>
                  <button type="button" onClick={handleDetectLocation} disabled={loading || detectingLocation}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-all disabled:opacity-50 text-sm group">
                    {detectingLocation ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-600" /><span>Detectare...</span></>
                    ) : (
                      <><FontAwesomeIcon icon={faLocationCrosshairs} className="group-hover:scale-110 transition-transform" /><span>Folosește locația curentă</span></>
                    )}
                  </button>
                  <p className="text-gray-500 text-xs">Locația ajută cumpărătorii să găsească produse din zona lor.</p>
                </div>
              </div>

            </div>{/* end inner padding */}

            {/* Submit — sticky bottom */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-3xl flex-shrink-0">
              <button type="submit" disabled={loading || hasUploadingImages}
                className={`flex-1 font-semibold py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-white
                  ${isB2B ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
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