import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/Button';
import ImageGalleryManager from './ImageGalleryManager';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot, faAppleWhole, faCow, faDrumstickBite,
  faEgg, faJar, faWheatAwn, faTimes,
  faTriangleExclamation,
  faCircleCheck,
  faLocationDot
} from '@fortawesome/free-solid-svg-icons';

function Alert({ variant = 'default', title, children, className = '' }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    default: 'bg-gray-50 border-gray-200 text-gray-800'
  };

  const icons = {
    success: faCircleCheck,
    warning: faTriangleExclamation,
    danger: faTriangleExclamation,
    info: faCircleCheck,
    default: faTriangleExclamation
  };

  return (
    <div className={`border rounded-xl p-4 ${styles[variant]} ${className}`}>
      <div className="flex gap-3">
        <div className="mt-0.5">
          <FontAwesomeIcon icon={icons[variant]} />
        </div>
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
          className={`
            w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 
            placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
            ${error
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'
            }
          `}
          {...props}
        />
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs" />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-gray-500 text-xs mt-1">{helper}</p>
      )}
    </div>
  );
}

export default function AddProductModal({ isOpen, onClose, session, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [galleryImages, setGalleryImages] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'kg',
    quantity: '',
    category: 'Legume',
    location: '',
    is_negotiable: false
  });

  const [errors, setErrors] = useState({});

  const categories = [
    { id: 'Legume', name: 'Legume', icon: faCarrot },
    { id: 'Fructe', name: 'Fructe', icon: faAppleWhole },
    { id: 'Lactate', name: 'Lactate', icon: faCow },
    { id: 'Carne', name: 'Carne', icon: faDrumstickBite },
    { id: 'Ouă', name: 'Ouă', icon: faEgg },
    { id: 'Miere', name: 'Miere', icon: faJar },
    { id: 'Cereale', name: 'Cereale', icon: faWheatAwn },
  ];

  const units = [
    { value: 'kg', label: 'Kilogram' },
    { value: 'bucată', label: 'Bucată' },
    { value: 'litru', label: 'Litru' },
    { value: 'borcan', label: 'Borcan' },
    { value: 'cutie', label: 'Cutie' }
  ];

  useEffect(() => {
    if (isOpen && session) {
      checkProfile();
    }
  }, [isOpen, session]);

  const checkProfile = async () => {
    try {
      setCheckingProfile(true);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('phone, location, full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Eroare la încărcarea profilului:', error);
        throw error;
      }

      if (!profile) {
        toast.error('Profil lipsă! Creează-l din pagina de profil.');
        onClose();
        return;
      }

      const isNameValid = profile.full_name &&
        /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name) &&
        profile.full_name.trim().length >= 2;

      if (!profile.phone || !profile.location || !isNameValid) {
        const missing = [];
        if (!isNameValid) missing.push('nume valid (doar litere)');
        if (!profile.phone) missing.push('telefon (+373 + 8 cifre)');
        if (!profile.location) missing.push('locație');

        toast.error(
          `Completează în profil: ${missing.join(', ')}`,
          { duration: 6000 }
        );
        onClose();
        return;
      }

      setFormData(prev => ({ ...prev, location: profile.location }));

    } catch (error) {
      console.error('Eroare la verificarea profilului:', error);
      toast.error('Eroare: ' + error.message);
      onClose();
    } finally {
      setCheckingProfile(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Numele este obligatoriu';
    if (!formData.description.trim() || formData.description.length < 20) {
      newErrors.description = 'Descrierea trebuie să aibă minim 20 caractere';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Prețul trebuie să fie mai mare ca 0';
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Cantitatea trebuie să fie mai mare ca 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Completează corect toate câmpurile');
      return;
    }

    try {
      setLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone, location, full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile?.phone || !profile?.location) {
        toast.error('Completează telefon și locație în profil!');
        onClose();
        return;
      }

      // Extrage URL-urile finale din galerie
      const imageUrls = galleryImages
        .filter(img => !img.isUploading)
        .map(img => img.url);

      const mainImage = imageUrls[0] || null;
      const galleryUrls = imageUrls.slice(1);

      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: session.user.id,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          unit: formData.unit,
          quantity: parseFloat(formData.quantity),
          category: formData.category,
          location: formData.location || profile.location,
          is_negotiable: formData.is_negotiable,
          image_url: mainImage,
          gallery_images: galleryUrls.length > 0 ? galleryUrls : null,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Produs adăugat cu succes!', { duration: 4000 });

      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        unit: 'kg',
        quantity: '',
        category: 'Legume',
        location: '',
        is_negotiable: false
      });
      setGalleryImages([]);
      setErrors({});

      onClose();
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Eroare:', error);
      toast.error('Eroare la adăugarea produsului: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasUploadingImages = galleryImages.some(img => img.isUploading);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6 flex justify-between items-center rounded-t-3xl">
          <h2 className="text-2xl font-bold text-gray-900">
            Adaugă Produs Nou
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {checkingProfile ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-600">Verificare profil...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[calc(90vh-100px)] overflow-y-auto">
            {/* SECȚIUNEA 1: Informații de Bază */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Informații de bază
              </h3>

              <div className="space-y-5">
                {/* GALERIE IMAGINI - Component Reutilizabil */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-3">
                    Fotografii Produs (Max 4)
                  </label>
                  
                  <ImageGalleryManager
                    initialImages={[]}
                    onChange={setGalleryImages}
                    userId={session.user.id}
                    disabled={loading}
                  />

                  <p className="text-slate-500 text-xs mt-2">
                    Prima imagine va fi afișată pe pagina principală. Celelalte apar în galerie.
                  </p>
                </div>

                {/* Nume Produs */}
                <FormInput
                  label="Nume Produs"
                  required
                  error={errors.name}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Roșii bio de țară, Brânză de oaie"
                />

                {/* Categorie */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-3">
                    Categorie <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                        className={`
                          p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                          ${formData.category === cat.id
                            ? 'bg-emerald-50 border-emerald-500 shadow-md'
                            : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <FontAwesomeIcon
                          icon={cat.icon}
                          className={`text-2xl ${formData.category === cat.id ? 'text-emerald-600' : 'text-gray-400'}`}
                        />
                        <span className={`text-sm font-medium ${formData.category === cat.id ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descriere */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Descriere <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrie produsul: cum a fost cultivat, ce proprietăți are, condiții de livrare..."
                    rows={5}
                    className={`
                      w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 
                      placeholder-gray-400 focus:outline-none focus:ring-2 transition-all resize-none
                      ${errors.description
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'
                      }
                    `}
                  />
                  <div className="flex justify-between items-center mt-1">
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

            {/* SECȚIUNEA 2: Preț și Cantitate */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Preț și cantitate
              </h3>

              <div className="space-y-5">
                {/* Preț + Cantitate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Preț <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className={`
                          w-full px-4 py-3 pr-12 bg-gray-50 border rounded-lg text-gray-900 
                          placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
                          ${errors.price
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'
                          }
                        `}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        lei
                      </span>
                    </div>
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                    )}
                  </div>

                  <FormInput
                    label="Cantitate Disponibilă"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    error={errors.quantity}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="ex: 50"
                  />
                </div>

                {/* Unitate */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-3">
                    Unitate de măsură <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {units.map((unit) => (
                      <button
                        key={unit.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, unit: unit.value })}
                        className={`
                          px-4 py-2 rounded-full font-medium transition-all text-sm
                          ${formData.unit === unit.value
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {unit.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preț Negociabil */}
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_negotiable}
                    onChange={(e) => setFormData({ ...formData, is_negotiable: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <span className="text-gray-900 font-medium text-sm">Preț negociabil</span>
                    <p className="text-gray-600 text-xs mt-1">
                      Permite cumpărătorilor să negocieze prețul cu tine
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* SECȚIUNEA 3: Locație */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Locație
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Locație <span className="text-gray-500 text-xs">(opțional)</span>
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faLocationDot}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Se folosește locația din profil dacă nu completezi"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Locația ajută cumpărătorii să găsească produse din zona lor
                  </p>
                </div>

                <Alert variant="info" title="Sfat pentru vânzători">
                  Produsele cu fotografii clare și descrieri detaliate primesc cu 3x mai multe vizualizări.
                  Menționează calitatea, originea și condițiile de livrare.
                </Alert>
              </div>
            </div>

            {/* Butoane Submit */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || hasUploadingImages}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Se adaugă...
                  </span>
                ) : hasUploadingImages ? (
                  'Se încarcă imaginile...'
                ) : (
                  'Adaugă Produs'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-8 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3.5 rounded-lg transition disabled:opacity-50"
              >
                Anulează
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}