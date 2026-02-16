import { useState, useEffect, useRef } from "react";
import { supabase } from "./services/supabaseClient";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DetailsPage from "./pages/DetailsPage";
import ProfilePage from "./pages/ProfilePage";
import AllProductsPage from "./pages/AllProductsPage";
import { Navbar } from "./components/layout/Navbar"; // IMPORTĂ NAVBAR AICI
import { Toaster } from "react-hot-toast";
import toast from 'react-hot-toast';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [previousPage, setPreviousPage] = useState('home');
  const [currentProductId, setCurrentProductId] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentSearch, setCurrentSearch] = useState(null);
  const [currentSortBy, setCurrentSortBy] = useState('newest');

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

  return (
    <div className="min-h-screen bg-white"> {/* Am schimbat în bg-white ca să nu ai dungi negre la navbar */}
      <Toaster position="top-center" />

      {/* NAVBAR GLOBAL: Apare pe toate paginile în afară de Login */}
      {currentPage !== 'login' && (
        <Navbar 
          session={session} 
          onNavigate={navigateTo} 
          // Exemplu: onAddProduct={() => navigateTo('adauga')}
        />
      )}

      {/* PAGINILE - Acum fără Navbar în interiorul lor */}
      <main>
        {currentPage === 'home' && <HomePage session={session} onNavigate={navigateTo} />}
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