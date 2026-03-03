import { useState, useEffect, useRef } from 'react';
import { supabase } from "../services/supabaseClient";
import NearbyFarmersMap from "../components/features/NearbyFarmersMap";
import { ProductCard } from "../components/features/ProductCard";
import { Button } from "../components/ui/Button";
import AddProductModal from "../components/features/AddProductModal";
import toast from 'react-hot-toast';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot, faAppleWhole, faCow, faDrumstickBite, faEgg, faJar,
  faWheatAwn, faPlus, faLeaf, faCircleCheck, faHandshake,
  faArrowRight, faTruck, faSeedling, faChevronLeft, faChevronRight
} from '@fortawesome/free-solid-svg-icons';

export default function HomePage({ session, onNavigate, searchQuery = '', searchLocation = '' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const newProductsRef = useRef(null);
  const categoryRefs = useRef({});
  const scrollPositions = useRef({});

  const heroImages = [
    { url: 'src/assets/Rosii.jpg', alt: 'Roșii proaspete' },
    { url: 'src/assets/castravete.jpg', alt: 'Castraveți proaspeți' },
    { url: 'src/assets/Miere.jpeg', alt: 'Miere naturală' },
  ];

  const categories = [
    { id: 'Legume', name: 'Legume', icon: faCarrot },
    { id: 'Fructe', name: 'Fructe', icon: faAppleWhole },
    { id: 'Lactate', name: 'Lactate', icon: faCow },
    { id: 'Carne', name: 'Carne', icon: faDrumstickBite },
    { id: 'Ouă', name: 'Ouă', icon: faEgg },
    { id: 'Miere', name: 'Miere', icon: faJar },
    { id: 'Cereale', name: 'Cereale', icon: faWheatAwn },
  ];

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_with_user')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Eroare la încărcarea produselor:', error);
      toast.error('Eroare la încărcarea produselor');
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction, ref) => {
    if (!ref?.current) return;
    const container = ref.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const scrollAmount = container.clientWidth * 0.8;

    if (direction === 'right') {
      if (container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    } else {
      if (container.scrollLeft <= 10) {
        container.scrollTo({ left: maxScroll, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const handleSearch = () => {
    let filtered = products;
    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (searchLocation.trim()) {
      filtered = filtered.filter(p =>
        p.location.toLowerCase().includes(searchLocation.toLowerCase())
      );
    }
    return filtered;
  };

  const getProductsByCategory = (categoryId) => {
    return handleSearch().filter(p => p.category === categoryId).slice(0, 8);
  };

  const getNewProducts = () => {
    return handleSearch().slice(0, 8);
  };

  const handleViewDetails = async (productId) => {
    if (session) {
      try {
        await supabase.rpc('increment_product_views', { product_id: productId });
      } catch (error) {
        console.error('Eroare la incrementare views:', error);
      }
      onNavigate('detalii', productId);
    } else {
      onNavigate('login');
    }
  };

  const handleContactClick = async (product) => {
    try {
      await supabase.rpc('increment_product_contacts', { product_id: product.id });
      if (product.seller_phone) {
        const phoneNumber = product.seller_phone.replace(/\s/g, '');
        toast.success(
          <div>
            <p className="font-bold">Contact: {product.seller_name}</p>
            <a href={`tel:${phoneNumber}`} className="text-emerald-400 underline text-lg">
              {product.seller_phone}
            </a>
          </div>,
          { duration: 10000 }
        );
      }
    } catch (error) {
      console.error('Eroare:', error);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);

  /* Pill button vertical care imbracă marginile caruselului */
  const PillNavButton = ({ direction, onClick, ariaLabel }) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`
        absolute top-1/2 -translate-y-1/2 z-10
        ${direction === 'left' ? 'left-0' : 'right-0'}
        flex items-center justify-center
        w-9 h-24
        bg-white/80 backdrop-blur-sm
        border border-gray-200
        text-gray-500 shadow-md
        transition-all duration-200
        hover:bg-emerald-600 hover:text-white hover:border-emerald-600
        hover:shadow-lg hover:shadow-emerald-200/50 hover:w-11
        active:scale-95
      `}
      style={{
        borderRadius: direction === 'left' ? '0 9999px 9999px 0' : '9999px 0 0 9999px',
      }}
    >
      <FontAwesomeIcon
        icon={direction === 'left' ? faChevronLeft : faChevronRight}
        className="text-xs"
      />
    </button>
  );

  /* Clasa unificată pentru toate cardurile din carusel */
  const cardClass = "min-w-[320px] w-[320px] snap-start bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 flex-shrink-0";

  return (
    <div className="min-h-screen bg-white">

      {/* Hero Section full-width */}
      <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden bg-gray-900">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover transition-transform duration-[2000ms]"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-2xl text-white">
                  <h2 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
                    {index === 0 ? 'Produse proaspete direct de la producător' : image.alt}
                  </h2>
                  <p className="text-lg md:text-xl text-gray-200 mb-6 font-light">
                    Susținem micii antreprenori locali. Calitate garantată fără intermediari.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Pill buttons pentru hero */}
        <button
          onClick={prevSlide}
          aria-label="Imaginea anterioară"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-28 bg-black/30 backdrop-blur-sm text-white transition-all duration-200 hover:bg-black/50 active:scale-95"
          style={{ borderRadius: '0 9999px 9999px 0' }}
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </button>
        <button
          onClick={nextSlide}
          aria-label="Imaginea următoare"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-28 bg-black/30 backdrop-blur-sm text-white transition-all duration-200 hover:bg-black/50 active:scale-95"
          style={{ borderRadius: '9999px 0 0 9999px' }}
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
        </button>

        {/* Dots indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`transition-all duration-300 rounded-full ${i === currentSlide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
            />
          ))}
        </div>
      </div>


      {/* Furnizori langa tine */}
      <div className="relative z-10 -mt-16 bg-gray-50 rounded-t-[40px] shadow-xl pt-10 pb-10">
        <NearbyFarmersMap products={products} onNavigate={onNavigate} />
      </div>

      {/* Products Section suprapus pe hero */}
      <main
        id="products-section"
        className="relative z-10 -mt-16 bg-white px-4 sm:px-6 lg:px-8 py-12 shadow-xl rounded-t-[40px]"
      >
        {loading ? (
          <div className="text-center py-20">
            <Metronome size="40" speed="1.6" color="#059669" />
            <p className="text-gray-600 mt-4">Se încarcă produsele...</p>
          </div>
        ) : (
          <>
            {/* Produse Noi — Carusel */}
            <section className="mb-16">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSeedling} className="text-emerald-600" />
                    Produse Noi
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('toate-produsele', null, { sortBy: 'newest' })}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  <span>Vezi tot</span>
                  <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                </button>
              </div>

              <div className="relative">
                <PillNavButton
                  direction="left"
                  onClick={() => scroll('left', newProductsRef)}
                  ariaLabel="Derulează la stânga"
                />
                <div
                  ref={newProductsRef}
                  className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory scrollbar-hide px-10"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {getNewProducts().map((product) => (
                    <div key={product.id} className={cardClass}>
                      <ProductCard
                        product={product}
                        session={session}
                        onViewDetails={handleViewDetails}
                        onContactClick={handleContactClick}
                      />
                    </div>
                  ))}
                </div>
                <PillNavButton
                  direction="right"
                  onClick={() => scroll('right', newProductsRef)}
                  ariaLabel="Derulează la dreapta"
                />
              </div>
            </section>

            {/* Categorii — fiecare cu carusel propriu */}
            {categories.filter(cat => getProductsByCategory(cat.id).length > 0).map((cat) => (
              <section key={cat.id} id={`category-${cat.id}`} className="mb-16">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <FontAwesomeIcon icon={cat.icon} className="text-emerald-600" />
                      {cat.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onNavigate('toate-produsele', null, { category: cat.id })}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                      <span>Vezi tot</span>
                      <div className="bg-white/20 w-5 h-5 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <PillNavButton
                    direction="left"
                    onClick={() => scroll('left', { current: categoryRefs.current[cat.id] })}
                    ariaLabel={`${cat.name} - derulează la stânga`}
                  />
                  <div
                    ref={el => categoryRefs.current[cat.id] = el}
                    className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory scrollbar-hide px-10"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {getProductsByCategory(cat.id).map((product) => (
                      <div key={product.id} className={cardClass}>
                        <ProductCard
                          product={product}
                          session={session}
                          onViewDetails={handleViewDetails}
                          onContactClick={handleContactClick}
                        />
                      </div>
                    ))}
                  </div>
                  <PillNavButton
                    direction="right"
                    onClick={() => scroll('right', { current: categoryRefs.current[cat.id] })}
                    ariaLabel={`${cat.name} - derulează la dreapta`}
                  />
                </div>
              </section>
            ))}

            {/* Info Banner */}
            <section className="my-16">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-3xl p-8 md:p-12 shadow-xl">
                <div className="grid md:grid-cols-3 gap-8 text-white">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faTruck} className="text-3xl" />
                    </div>
                    <h4 className="text-lg font-semibold mb-2">Direct de la Sursă</h4>
                    <p className="text-emerald-100 text-sm">Fără intermediari, produse proaspete direct de la producător</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-3xl" />
                    </div>
                    <h4 className="text-lg font-semibold mb-2">Producători Verificați</h4>
                    <p className="text-emerald-100 text-sm">Toți vânzătorii sunt verificați pentru calitate și autenticitate</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faHandshake} className="text-3xl" />
                    </div>
                    <h4 className="text-lg font-semibold mb-2">Fără Comisioane</h4>
                    <p className="text-emerald-100 text-sm">Platformă gratuită</p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA for Producers */}
            {session && products.length > 0 && (
              <section className="mb-16">
                <div className="bg-gray-50 rounded-3xl p-8 md:p-12 text-center border border-gray-200">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Ești producător?</h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto text-lg">
                    Adaugă-ți produsele gratuit și ajunge la mii de cumpărători din zona ta.
                  </p>
                  <Button
                    onClick={() => setShowAddProductModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-semibold shadow-lg transition-all hover:scale-105"
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Adaugă un produs acum
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <FontAwesomeIcon icon={faLeaf} className="text-emerald-600 text-xl" />
              <span className="text-lg font-bold text-gray-900">AgriConnect</span>
            </div>
            <p className="text-gray-600 text-sm">
              Sprijină economia locală. Cumpără direct de la producător.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        session={session}
        onSuccess={fetchProducts}
      />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}