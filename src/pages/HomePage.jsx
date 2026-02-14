import { useState, useEffect } from 'react';
import { supabase } from "../services/supabaseClient";
import { Navbar } from "../components/layout/Navbar";
import { ProductCard } from "../components/features/ProductCard";
import { Button } from "../components/ui/Button";
import AddProductModal from "../components/features/AddProductModal";
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot,
  faAppleWhole,
  faCow,
  faDrumstickBite,
  faEgg,
  faJar,
  faWheatAwn,
  faBoxesStacked,
  faLocationDot,
  faMagnifyingGlass,
  faFilter,
  faPlus,
  faLeaf,
  faCircleCheck,
  faHandshake,
  faRightToBracket,
  faArrowRight,
  faTruck,
  faSeedling,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';

export default function HomePage({ session, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroImages = [
    {
      url: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=800&h=600&fit=crop',
      alt: 'Roșii proaspete'
    },
    {
      url: 'https://images.unsplash.com/photo-1628773822503-930a7eaecf80?w=800&h=600&fit=crop',
      alt: 'Brânză artizanală'
    },
    {
      url: 'https://images.unsplash.com/photo-1587049352846-4a222e784738?w=800&h=600&fit=crop',
      alt: 'Miere naturală'
    },
    {
      url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&h=600&fit=crop',
      alt: 'Legume organice'
    }
  ];

  const categories = [
    { id: 'Legume', name: 'Legume', icon: faCarrot, color: 'bg-green-100 text-green-600 hover:bg-green-200' },
    { id: 'Fructe', name: 'Fructe', icon: faAppleWhole, color: 'bg-red-100 text-red-600 hover:bg-red-200' },
    { id: 'Lactate', name: 'Lactate', icon: faCow, color: 'bg-blue-100 text-blue-600 hover:bg-blue-200' },
    { id: 'Carne', name: 'Carne', icon: faDrumstickBite, color: 'bg-orange-100 text-orange-600 hover:bg-orange-200' },
    { id: 'Ouă', name: 'Ouă', icon: faEgg, color: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' },
    { id: 'Miere', name: 'Miere', icon: faJar, color: 'bg-amber-100 text-amber-600 hover:bg-amber-200' },
    { id: 'Cereale', name: 'Cereale', icon: faWheatAwn, color: 'bg-lime-100 text-lime-600 hover:bg-lime-200' },
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('products_with_user')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Eroare la încărcarea produselor:', error);
      toast.error('Eroare la încărcarea produselor');
    } finally {
      setLoading(false);
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
    const searchResults = handleSearch();
    return searchResults.filter(p => p.category === categoryId).slice(0, 4);
  };

  const getNewProducts = () => {
    return handleSearch().slice(0, 4);
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

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR - ÎNLOCUIT CU COMPONENTA */}
      <Navbar session={session} onNavigate={onNavigate}
      onAddProduct={() => setShowAddProductModal(true)} />
      

      {/* Hero Section cu Carousel */}
      <div className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Carousel Imagini */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[400px] md:h-[500px]">
              {heroImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-lg font-semibold">{image.alt}</p>
                  </div>
                </div>
              ))}

              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-gray-700" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-gray-700" />
              </button>

              <div className="absolute bottom-4 right-4 flex gap-2">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* Search Section */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Produse proaspete direct de la producător
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                Descoperă legume, fructe, lactate și produse bio de la fermierii din zona ta.
                Fără intermediari, doar prospețime garantată.
              </p>

              {/* Search Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                <div className="space-y-4">
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Caută produs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faLocationDot}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Locație (ex: Chișinău)..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                    onClick={() => {
                      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition shadow-md flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                    Caută produse
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Category Links */}
      <div className="bg-white py-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-4 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 ${cat.color}`}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  <FontAwesomeIcon icon={cat.icon} className="text-2xl" />
                </div>
                <span className="text-sm font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <main id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-600">Se încarcă produsele...</p>
          </div>
        ) : (
          <>
            {/* Produse Noi */}
            <section className="mb-16">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSeedling} className="text-emerald-600" />
                    Produse Noi
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Ultimele adăugate de producători</p>
                </div>
                <button
                  onClick={() => onNavigate('toate-produsele', null, { sortBy: 'newest' })}
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-2"
                >
                  Vezi tot
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {getNewProducts().map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 h-full"
                  >
                    <ProductCard
                      product={product}
                      session={session}
                      onViewDetails={handleViewDetails}
                      onContactClick={handleContactClick}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Categorii cu Produse */}
            {categories.filter(cat => getProductsByCategory(cat.id).length > 0).map((cat) => (
              <section key={cat.id} id={`category-${cat.id}`} className="mb-16">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <FontAwesomeIcon icon={cat.icon} className="text-emerald-600" />
                      {cat.name}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {getProductsByCategory(cat.id).length} produse disponibile
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('toate-produsele', null, { category: cat.id })}
                    className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-2"
                  >
                    Vezi tot
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {getProductsByCategory(cat.id).map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 h-full"
                    >
                      <ProductCard
                        product={product}
                        session={session}
                        onViewDetails={handleViewDetails}
                        onContactClick={handleContactClick}
                      />
                    </div>
                  ))}
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
                    <p className="text-emerald-100 text-sm">
                      Fără intermediari, produse proaspete direct de la producător
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-3xl" />
                    </div>
                    <h4 className="text-lg font-semibold mb-2">Producători Verificați</h4>
                    <p className="text-emerald-100 text-sm">
                      Toți vânzătorii sunt verificați pentru calitate și autenticitate
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faHandshake} className="text-3xl" />
                    </div>
                    <h4 className="text-lg font-semibold mb-2">Fără Comisioane</h4>
                    <p className="text-emerald-100 text-sm">
                      Platformă gratuită, fără taxe ascunse pentru nimeni
                    </p>
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
                    Fără comisioane, fără taxe ascunse!
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
        onSuccess={() => {
          fetchProducts();
        }}
      />
    </div>
  );
}