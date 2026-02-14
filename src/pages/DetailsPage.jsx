import { useState, useEffect, useMemo } from 'react';
import { supabase } from "../services/supabaseClient";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import ProductMapModal from "../components/features/ProductMapModal";
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot, faAppleWhole, faCow, faDrumstickBite,
  faEgg, faJar, faWheatAwn, faBox,
  faLocationDot, faCalendarDays, faPhone, faEye,
  faCircleCheck, faMapMarkedAlt, faTag, faWeight,
  faHandshake, faLeaf, faArrowLeft, faMessage,
  faStar, faExclamationTriangle,
  faChevronLeft, faChevronRight
} from '@fortawesome/free-solid-svg-icons';

export default function DetailsPage({ onNavigate, onNavigateBack, session, productId }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [userCurrentLocation, setUserCurrentLocation] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isHoveringGallery, setIsHoveringGallery] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!session) {
      onNavigate('login');
      return;
    }

    if (productId) {
      fetchProductDetails();
    }
  }, [session, productId]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('products_with_user')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      setProduct(data);

      await supabase.rpc('increment_product_views', { product_id: productId });
    } catch (error) {
      console.error('Eroare:', error);
      toast.error('Produsul nu a fost găsit');
      onNavigate('home');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    try {
      await supabase.rpc('increment_product_contacts', { product_id: product.id });

      if (product.seller_phone) {
        const phoneNumber = product.seller_phone.replace(/\s/g, '');
        window.location.href = `tel:${phoneNumber}`;
      }
    } catch (error) {
      console.error('Eroare:', error);
    }
  };

  const handleViewOnMap = () => {
    setShowMapModal(true);
    
    if (!userCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCurrentLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.log('Could not get user location:', error);
        }
      );
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  const categoryIcons = {
    'Legume': faCarrot,
    'Fructe': faAppleWhole,
    'Lactate': faCow,
    'Carne': faDrumstickBite,
    'Ouă': faEgg,
    'Miere': faJar,
    'Cereale': faWheatAwn,
    'Conserve': faJar,
    'Altele': faBox
  };

  const getColorForName = (name) => {
    if (!name) return '#10b981';
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const stockPercentage = product ? Math.min((product.quantity / 100) * 100, 100) : 0;

  // Array cu toate imaginile
  const allImages = useMemo(() => {
    if (!product) return [];
    
    const images = [];
    if (product.image_url) images.push(product.image_url);
    if (product.gallery_images && Array.isArray(product.gallery_images)) {
      images.push(...product.gallery_images);
    }
    return images;
  }, [product]);


  

  // Funcții de navigare cu animație smooth
  const changeImage = (newIndex) => {
    if (isTransitioning || newIndex === selectedImageIndex) return;
    
    setIsTransitioning(true);
    setSelectedImageIndex(newIndex);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  const goToPrevious = () => {
    const newIndex = selectedImageIndex === 0 ? allImages.length - 1 : selectedImageIndex - 1;
    changeImage(newIndex);
  };

  const goToNext = () => {
    const newIndex = selectedImageIndex === allImages.length - 1 ? 0 : selectedImageIndex + 1;
    changeImage(newIndex);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (allImages.length <= 1) return;
      
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allImages.length, selectedImageIndex, isTransitioning]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button 
              variant="ghost" 
              onClick={() => onNavigateBack ? onNavigateBack() : onNavigate('home')} // SCHIMBAT
              className="text-gray-600 hover:text-emerald-600 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Înapoi
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Detalii Produs</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Product Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left - GALERIE PREMIUM */}
            <div className="p-8 bg-gray-50">
              {/* Imagine Principală cu Slider Premium */}
              <div 
                className="relative aspect-square bg-white rounded-3xl overflow-hidden shadow-lg mb-4"
                onMouseEnter={() => setIsHoveringGallery(true)}
                onMouseLeave={() => setIsHoveringGallery(false)}
              >
                {allImages.length > 0 ? (
                  <>
                    {/* Container pentru imaginea cu efect de slide */}
                    <div className="relative w-full h-full">
                      <img
                        src={allImages[selectedImageIndex]}
                        alt={`${product.name} - Imagine ${selectedImageIndex + 1}`}
                        className={`
                          w-full h-full object-cover
                          transition-all duration-300 ease-in-out
                          ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
                        `}
                      />
                    </div>
                    
                    {/* Badges peste imagine */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md flex items-center gap-2">
                        <FontAwesomeIcon icon={categoryIcons[product.category] || faBox} className="text-emerald-600" />
                        <span className="text-gray-900 font-semibold text-sm">{product.category}</span>
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                      {product.seller_verified && (
                        <div className="bg-emerald-500/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                          <span className="text-white font-semibold text-xs flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCircleCheck} />
                            VERIFICAT
                          </span>
                        </div>
                      )}
                      
                      {product.is_negotiable && (
                        <div className="bg-blue-500/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                          <span className="text-white font-semibold text-xs">NEGOCIABIL</span>
                        </div>
                      )}
                    </div>

                    {/* SĂGEȚI PLUTITOARE - Premium Design */}
                    {allImages.length > 1 && (
                      <>
                        {/* Săgeată Stânga */}
                        <button
                          onClick={goToPrevious}
                          disabled={isTransitioning}
                          className={`
                            absolute left-4 top-1/2 -translate-y-1/2 z-20
                            w-12 h-12 rounded-full 
                            bg-white/80 backdrop-blur-sm
                            hover:bg-white hover:shadow-xl
                            flex items-center justify-center
                            transition-all duration-300 ease-out
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${isHoveringGallery 
                              ? 'opacity-100 translate-x-0' 
                              : 'opacity-0 -translate-x-2 pointer-events-none'
                            }
                          `}
                          aria-label="Imagine anterioară"
                        >
                          <FontAwesomeIcon 
                            icon={faChevronLeft} 
                            className="text-gray-800 text-lg" 
                          />
                        </button>

                        {/* Săgeată Dreapta */}
                        <button
                          onClick={goToNext}
                          disabled={isTransitioning}
                          className={`
                            absolute right-4 top-1/2 -translate-y-1/2 z-20
                            w-12 h-12 rounded-full 
                            bg-white/80 backdrop-blur-sm
                            hover:bg-white hover:shadow-xl
                            flex items-center justify-center
                            transition-all duration-300 ease-out
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${isHoveringGallery 
                              ? 'opacity-100 translate-x-0' 
                              : 'opacity-0 translate-x-2 pointer-events-none'
                            }
                          `}
                          aria-label="Imagine următoare"
                        >
                          <FontAwesomeIcon 
                            icon={faChevronRight} 
                            className="text-gray-800 text-lg" 
                          />
                        </button>

                        {/* INDICATORI PUNCTE (Pagination Dots) - Premium Design */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-full">
                          {allImages.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => changeImage(index)}
                              disabled={isTransitioning}
                              className={`
                                transition-all duration-300 ease-out
                                ${selectedImageIndex === index
                                  ? 'w-8 h-2 bg-emerald-500 rounded-full shadow-lg' 
                                  : 'w-2 h-2 bg-white/60 rounded-full hover:bg-white/80'
                                }
                              `}
                              aria-label={`Imagine ${index + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-emerald-50">
                    <FontAwesomeIcon
                      icon={categoryIcons[product.category] || faBox}
                      className="text-9xl text-emerald-200"
                    />
                  </div>
                )}
              </div>

              {/* MINIATURI (Thumbnails) - Premium Design */}
              {allImages.length > 1 && (
                <div className="mb-4">
                  <div className="grid grid-cols-4 gap-3">
                    {allImages.map((imageUrl, index) => (
                      <button
                        key={index}
                        onClick={() => changeImage(index)}
                        disabled={isTransitioning}
                        className={`
                          aspect-square rounded-xl overflow-hidden 
                          transition-all duration-300 ease-out
                          disabled:cursor-not-allowed
                          ${selectedImageIndex === index 
                            ? 'border-4 border-emerald-500 shadow-lg ring-2 ring-emerald-200 scale-105 opacity-100' 
                            : 'border-2 border-gray-200 hover:border-emerald-300 opacity-60 hover:opacity-100 hover:scale-105'
                          }
                        `}
                      >
                        <img
                          src={imageUrl}
                          alt={`Miniatură ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  {/* Counter sub miniaturi */}
                  <div className="text-center mt-3">
                    <p className="text-sm text-gray-500">
                      Imagine <span className="font-bold text-emerald-600">{selectedImageIndex + 1}</span> din <span className="font-semibold text-gray-900">{allImages.length}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FontAwesomeIcon icon={faEye} className="text-gray-400" />
                    <p className="text-2xl font-bold text-gray-900">{product.views_count || 0}</p>
                  </div>
                  <p className="text-gray-500 text-xs">Vizualizări</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FontAwesomeIcon icon={faPhone} className="text-gray-400" />
                    <p className="text-2xl font-bold text-gray-900">{product.contact_count || 0}</p>
                  </div>
                  <p className="text-gray-500 text-xs">Contactări</p>
                </div>
              </div>
            </div>

            {/* Right - Info (PĂSTREAZĂ INTACT) */}
            <div className="p-8">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-3">{product.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600" />
                    {product.location}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-600" />
                    {new Date(product.created_at).toLocaleDateString('ro-RO')}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <p className="text-5xl font-bold text-emerald-600">
                    {formatPrice(product.price)}
                  </p>
                  <span className="text-2xl font-semibold text-gray-900">lei</span>
                </div>
                <p className="text-gray-600 text-lg">
                  per <span className="font-semibold text-gray-900">{product.unit}</span>
                </p>
              </div>

              {/* Stock Availability */}
              {product.quantity && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Disponibilitate</span>
                    <span className={`text-sm font-bold ${
                      stockPercentage < 10 ? 'text-red-600' :
                      stockPercentage < 30 ? 'text-orange-600' :
                      'text-emerald-600'
                    }`}>
                      {formatPrice(product.quantity)} {product.unit} rămase
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        stockPercentage < 10 ? 'bg-red-600' :
                        stockPercentage < 30 ? 'bg-orange-500' :
                        'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(stockPercentage, 5)}%` }}
                    ></div>
                  </div>
                  {stockPercentage < 30 && (
                    <p className="text-xs text-orange-600 mt-1 font-medium flex items-center gap-1">
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                      Stoc limitat! Comandă repede.
                    </p>
                  )}
                </div>
              )}

              {/* Specifications Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <FontAwesomeIcon icon={faTag} className="text-emerald-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Categorie</p>
                    <p className="text-gray-900 font-semibold">{product.category}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <FontAwesomeIcon icon={faWeight} className="text-emerald-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Unitate</p>
                    <p className="text-gray-900 font-semibold">{product.unit}</p>
                  </div>
                </div>

                {product.is_negotiable && (
                  <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3 col-span-2">
                    <FontAwesomeIcon icon={faHandshake} className="text-emerald-600 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Preț Negociabil</p>
                      <p className="text-emerald-600 font-semibold">Da - poți discuta prețul</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Seller Card */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 mb-4 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-white/30 shadow-lg"
                    style={{
                      background: getColorForName(product.seller_name)
                    }}
                  >
                    <span className="text-white text-2xl font-black uppercase">
                      {product.seller_name?.charAt(0) || '?'}
                    </span>
                  </div>

                  <div className="flex-1">
                    <p className="text-emerald-100 text-sm">Vânzător</p>
                    <p className="text-white text-xl font-bold">{product.seller_name || 'Producător Local'}</p>
                    {product.seller_rating > 0 && (
                      <p className="text-emerald-100 text-sm flex items-center gap-1">
                        <FontAwesomeIcon icon={faStar} className="text-yellow-300" />
                        Rating: {product.seller_rating.toFixed(1)}/5.0
                      </p>
                    )}
                  </div>
                </div>

                {product.seller_phone && (
                  <>
                    <p className="text-emerald-100 text-sm mb-2">Telefon: {product.seller_phone}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleContact}
                        className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                      >
                        <FontAwesomeIcon icon={faPhone} />
                        Sună Acum
                      </button>
                      <button
                        onClick={() => toast('Funcționalitate în dezvoltare', { icon: '💬' })}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faMessage} />
                        Mesaj
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Map Button */}
              <button
                onClick={handleViewOnMap}
                className="w-full bg-white border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-medium py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faMapMarkedAlt} />
                Vezi locația pe hartă
              </button>
              <p className="text-gray-500 text-xs text-center mt-2">
                Locație aproximativă pentru confidențialitate
              </p>
            </div>
          </div>
        </div>

        {/* Description Section */}
        {product.description && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faLeaf} className="text-emerald-600" />
              Despre acest produs
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">
              {product.description}
            </p>
          </div>
        )}
      </main>

      {/* Modal Hartă */}
      <ProductMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        product={product}
        userLocation={userCurrentLocation}
      />
    </div>
  );
}