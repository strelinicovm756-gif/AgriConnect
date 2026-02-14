import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/Button';
import ImageGalleryManager from './ImageGalleryManager';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faImages,
  faSave,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

export default function EditProductModal({ isOpen, onClose, product, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialImageUrls, setInitialImageUrls] = useState([]);

  useEffect(() => {
    if (isOpen && product) {
      loadProductImages();
    }
  }, [isOpen, product]);

  const loadProductImages = () => {
    const imageUrls = [];
    
    // Adaugă imaginea principală
    if (product.image_url) {
      imageUrls.push(product.image_url);
    }

    // Adaugă galeria
    if (product.gallery_images && Array.isArray(product.gallery_images)) {
      imageUrls.push(...product.gallery_images);
    }

    setInitialImageUrls([...imageUrls]);
    setHasChanges(false);
  };

  useEffect(() => {
    // Detectează schimbări comparând cu starea inițială
    if (initialImageUrls.length === 0) return;

    const currentUrls = galleryImages
      .filter(img => !img.isUploading)
      .map(img => img.url);

    const urlsChanged = 
      currentUrls.length !== initialImageUrls.length ||
      !currentUrls.every((url, index) => url === initialImageUrls[index]);

    setHasChanges(urlsChanged);
  }, [galleryImages, initialImageUrls]);

  const handleSave = async () => {
    try {
      setLoading(true);

      // Verifică dacă sunt imagini în curs de upload
      const hasUploadingImages = galleryImages.some(img => img.isUploading);
      if (hasUploadingImages) {
        toast.error('Așteaptă finalizarea încărcării imaginilor!');
        setLoading(false);
        return;
      }

      // Extrage URL-urile finale
      const finalUrls = galleryImages.map(img => img.url);
      const mainImage = finalUrls[0] || null;
      const galleryUrls = finalUrls.slice(1);

      // Update în baza de date
      const { error } = await supabase
        .from('products')
        .update({
          image_url: mainImage,
          gallery_images: galleryUrls.length > 0 ? galleryUrls : null
        })
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Galerie actualizată cu succes!');
      setHasChanges(false);
      
      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      console.error('Eroare:', error);
      toast.error('Eroare la salvarea galeriei: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('Ai modificări nesalvate! Sigur vrei să închizi?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const hasUploadingImages = galleryImages.some(img => img.isUploading);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FontAwesomeIcon icon={faImages} className="text-emerald-600" />
              Editează Galeria Foto
            </h2>
            <p className="text-gray-500 text-sm mt-1">{product?.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <FontAwesomeIcon icon={faImages} className="text-blue-600 mt-0.5" />
              <div className="flex-1 text-sm text-blue-800">
                <p className="font-medium mb-1">Cum funcționează:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Prima imagine = coperta produsului (afișată pe Home)</li>
                  <li>• Trage imaginile pentru a le reordona</li>
                  <li>• Click pe creion pentru a înlocui o imagine</li>
                  <li>• Click pe X pentru a șterge o imagine</li>
                  <li>• Maxim 4 imagini per produs</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Galerie Manager */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-3">
              Galeria Produsului
            </label>
            
            <ImageGalleryManager
              initialImages={initialImageUrls}
              onChange={setGalleryImages}
              userId={product?.user_id}
              disabled={loading}
            />
          </div>

          {/* Warning dacă sunt modificări */}
          {hasChanges && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-amber-900 mb-1">Modificări nesalvate!</p>
                  <p className="text-amber-800">
                    Apasă "Salvează Modificările" pentru a păstra schimbările sau "Anulează" pentru a renunța.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="border-t border-gray-200 p-6 flex gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !hasChanges || hasUploadingImages}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Se salvează...
              </>
            ) : hasUploadingImages ? (
              <>
                <FontAwesomeIcon icon={faImages} />
                Se încarcă imaginile...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />
                Salvează Modificările
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-8 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition disabled:opacity-50"
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}