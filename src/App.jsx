import { useState, useEffect } from "react";
import { supabase } from "./services/supabaseClient";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DetailsPage from "./pages/DetailsPage";
import ProfilePage from "./pages/ProfilePage";
import AllProductsPage from "./pages/AllProductsPage";
import { Navbar } from "./components/layout/Navbar";
import { Toaster } from "react-hot-toast";

export default function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [previousPage, setPreviousPage] = useState('home');
  const [currentProductId, setCurrentProductId] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentSearch, setCurrentSearch] = useState(null);
  const [currentSortBy, setCurrentSortBy] = useState('newest');

  // Search state centralizat - shared între Navbar și pagini
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const navigateTo = (page, param = null, options = {}) => {
    if (page !== currentPage) setPreviousPage(currentPage);
    setCurrentPage(page);

    if (page === 'detalii' && param) setCurrentProductId(param);
    else if (page === 'toate-produsele') {
      setCurrentCategory(options.category || null);
      setCurrentSearch(options.search || null);
      setCurrentSortBy(options.sortBy || 'newest');
    }
  };

  const navigateBack = () => {
    setCurrentPage(previousPage);
    setCurrentProductId(null);
  };

  const handleSearch = () => {
    if (currentPage === 'home') {
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" />

      {currentPage !== 'login' && (
        <Navbar
          session={session}
          currentPage={currentPage}
          onNavigate={navigateTo}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchLocation={searchLocation}
          setSearchLocation={setSearchLocation}
          onSearch={handleSearch}
        />
      )}

      <main>
        {currentPage === 'home' && (
          <HomePage
            session={session}
            onNavigate={navigateTo}
            searchQuery={searchQuery}
            searchLocation={searchLocation}
          />
        )}
        {currentPage === 'login' && <LoginPage onNavigate={navigateTo} />}
        {currentPage === 'detalii' && (
          <DetailsPage
            session={session}
            onNavigate={navigateTo}
            onNavigateBack={navigateBack}
            productId={currentProductId}
          />
        )}
        {currentPage === 'profil' && <ProfilePage session={session} onNavigate={navigateTo} />}
        {currentPage === 'toate-produsele' && (
          <AllProductsPage
            session={session}
            onNavigate={navigateTo}
            initialCategory={currentCategory}
            initialSearch={currentSearch}
            initialSortBy={currentSortBy}
          />
        )}
      </main>
    </div>
  );
}