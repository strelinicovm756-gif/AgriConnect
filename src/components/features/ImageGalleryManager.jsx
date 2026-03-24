import { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faXmark,
  faStar,
  faPlus,
  faPen,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

/**
 * Component pentru gestionarea galeriei de imagini (max 4)
 * Suportă: adăugare, ștergere, înlocuire, reordonare
 * Folosit atât în AddProduct cât și în EditProduct
 */
export default function ImageGalleryManager({
  initialImages = [],
  onChange,
  userId,
  disabled = false
}) {
  const { t } = useLanguage();
  const [images, setImages] = useState([]);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  useEffect(() => {
    // Convertește URL-uri existente în formatul intern
    if (initialImages.length > 0) {
      const formattedImages = initialImages.map(url => ({
        id: Math.random().toString(36).substring(7),
        url: url,
        file: null,
        isExisting: true,
        isUploading: false
      }));
      setImages(formattedImages);
    }
  }, []);

  useEffect(() => {
    // Notifică componenta părinte despre schimbări
    if (onChange) {
      onChange(images);
    }
  }, [images]);

  const uploadToStorage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t.features.invalidFormat);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.features.imageTooLarge);
      return false;
    }
    return true;
  };

  const handleAddImage = async (file, index = null) => {
    if (!validateFile(file)) return;

    const newImageId = Math.random().toString(36).substring(7);
    const previewUrl = URL.createObjectURL(file);

    // Dacă e înlocuire (index specificat), șterge imaginea veche
    if (index !== null) {
      setImages(prev => {
        const updated = [...prev];
        updated[index] = {
          id: newImageId,
          url: previewUrl,
          file: file,
          isExisting: false,
          isUploading: true
        };
        return updated;
      });
      setUploadingIndex(index);
    } else {
      // Adăugare normală la final
      if (images.length >= 4) {
        toast.error(t.features.maxImagesError);
        return;
      }

      setImages(prev => [...prev, {
        id: newImageId,
        url: previewUrl,
        file: file,
        isExisting: false,
        isUploading: true
      }]);
      setUploadingIndex(images.length);
    }

    // Upload în background
    try {
      const uploadedUrl = await uploadToStorage(file);
      
      setImages(prev => prev.map(img => 
        img.id === newImageId 
          ? { ...img, url: uploadedUrl, isUploading: false }
          : img
      ));
      
      toast.success(t.features.imageUploaded);
    } catch (error) {
      console.error('Eroare upload:', error);
      toast.error(t.features.imageUploadError);
      
      // Elimină imaginea dacă upload-ul a eșuat
      setImages(prev => prev.filter(img => img.id !== newImageId));
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    toast.success(t.features.imageDeleted);
  };

  const handleReplaceImage = (index, file) => {
    handleAddImage(file, index);
  };

  const handleFileSelect = (e, index = null) => {
    const file = e.target.files[0];
    if (!file) return;

    if (index !== null) {
      handleReplaceImage(index, file);
    } else {
      handleAddImage(file);
    }
    
    // Reset input
    e.target.value = '';
  };

  // Drag & Drop pentru reordonare
  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex === dropIndex) return;

    setImages(prev => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      return updated;
    });

    toast.success(t.features.orderChanged, { duration: 1500 });
  };

  return (
    <div className="space-y-3">
      {/* Grid Sloturi */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((slotIndex) => {
          const image = images[slotIndex];
          const isUploading = uploadingIndex === slotIndex;
          const isEmpty = !image;

          return (
            <div
              key={slotIndex}
              draggable={!isEmpty && !isUploading}
              onDragStart={(e) => handleDragStart(e, slotIndex)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, slotIndex)}
              className={`
                relative aspect-square rounded-xl overflow-hidden group
                ${slotIndex === 0 
                  ? 'ring-2 ring-gray-400' 
                  : 'border-2 border-slate-200'
                }
                ${isEmpty ? 'bg-slate-50' : ''}
                ${!isEmpty && !isUploading ? 'cursor-move' : ''}
                transition-all duration-200
              `}
            >
              {isEmpty ? (
                /* Slot Gol - Buton Adaugă */
                <label className={`
                  absolute inset-0 flex items-center justify-center 
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}
                  transition-colors
                `}>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
                      <FontAwesomeIcon 
                        icon={faPlus} 
                        className="text-slate-500 text-xl" 
                      />
                    </div>
                    <p className="text-slate-500 text-xs font-medium">
                      {slotIndex === 0 ? t.features.cover : `Slot ${slotIndex + 1}`}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handleFileSelect(e)}
                    disabled={disabled}
                    className="hidden"
                  />
                </label>
              ) : (
                /* Slot cu Imagine */
                <>
                  <img
                    src={image.url}
                    alt={`Imagine ${slotIndex + 1}`}
                    className={`
                      w-full h-full object-cover
                      ${isUploading ? 'opacity-50' : 'group-hover:opacity-90'}
                      transition-opacity
                    `}
                  />

                  {/* Badge Copertă */}
                  {slotIndex === 0 && (
                    <div className="absolute top-2 left-2 bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg z-10">
                      <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                      {t.features.cover}
                    </div>
                  )}

                  {/* Loading Overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
                      <div className="text-center text-white">
                        <FontAwesomeIcon 
                          icon={faSpinner} 
                          className="text-3xl animate-spin mb-2" 
                        />
                        <p className="text-xs font-medium">{t.features.uploading}</p>
                      </div>
                    </div>
                  )}

                  {/* Butoane Acțiuni (vizibile la hover) */}
                  {!isUploading && !disabled && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-10">
                      {/* Buton Înlocuiește */}
                      <label className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer transition-all shadow-lg hover:scale-110">
                        <FontAwesomeIcon icon={faPen} className="text-sm" />
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => handleFileSelect(e, slotIndex)}
                          className="hidden"
                        />
                      </label>

                      {/* Buton Șterge */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(slotIndex)}
                        className="w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110"
                      >
                        <FontAwesomeIcon icon={faXmark} className="text-sm" />
                      </button>
                    </div>
                  )}

                  {/* Badge Status */}
                  {!image.isExisting && !isUploading && (
                    <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-md">
                      {t.features.newBadge}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="flex items-center justify-between text-xs">
        <p className="text-slate-500">
          <FontAwesomeIcon icon={faCamera} className="mr-1" />
          {t.features.dragToReorder}
        </p>
        <p className="text-slate-600 font-medium">
          <span className="text-emerald-600 font-bold">{images.length}</span> {t.features.imagesCount}
        </p>
      </div>

      {/* Avertisment */}
    </div>
  );
}