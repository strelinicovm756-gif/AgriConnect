import { useState, useEffect, useRef } from "react";
import { supabase } from "./services/supabaseClient";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DetailsPage from "./pages/DetailsPage";
import ProfilePage from "./pages/ProfilePage";
import AllProductsPage from "./pages/AllProductsPage"; // VERIFICĂ ACEST IMPORT
import { Toaster } from "react-hot-toast";
import toast from 'react-hot-toast';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [previousPage, setPreviousPage] = useState('home'); // ADAUGĂ
  const [currentProductId, setCurrentProductId] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentSearch, setCurrentSearch] = useState(null);
  const [currentSortBy, setCurrentSortBy] = useState('newest');
  const hasShownWelcome = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'SIGNED_IN' && !hasShownWelcome.current) {
        hasShownWelcome.current = true;
        
        setTimeout(() => {
          toast.success('Bine ai revenit la AgriConnect!', {
            id: 'welcome-toast',
            icon: '👋',
            style: {
              borderRadius: '10px',
              background: '#1e293b',
              color: '#fff',
            }
          });
        }, 300);
      }
      
      if (event === 'SIGNED_OUT') {
        hasShownWelcome.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateTo = (page, param = null, options = {}) => {
    // Salvează pagina curentă ca previousPage
    if (page !== currentPage) {
      setPreviousPage(currentPage); // ADAUGĂ
    }

    setCurrentPage(page);
    
    if (page === 'detalii' && param) {
      setCurrentProductId(param);
    } else if (page === 'toate-produsele') {
      setCurrentCategory(options.category || null);
      setCurrentSearch(options.search || null);
      setCurrentSortBy(options.sortBy || 'newest');
    } else {
      setCurrentProductId(null);
      setCurrentCategory(null);
      setCurrentSearch(null);
      setCurrentSortBy('newest');
    }
  };

  // Funcție nouă pentru navigare înapoi
  const navigateBack = () => {
    setCurrentPage(previousPage);
    setCurrentProductId(null);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Toaster position="top-center" reverseOrder={false} />

      {currentPage === 'home' && (
        <HomePage session={session} onNavigate={navigateTo} />
      )}
      
      {currentPage === 'login' && (
        <LoginPage onNavigate={navigateTo} />
      )}
      
      {currentPage === 'detalii' && (
        <DetailsPage 
          session={session} 
          onNavigate={navigateTo}
          onNavigateBack={navigateBack} // ADAUGĂ
          productId={currentProductId}
        />
      )}
      
      {currentPage === 'profil' && (
        <ProfilePage session={session} onNavigate={navigateTo} />
      )}

      {currentPage === 'toate-produsele' && (
        <AllProductsPage 
          session={session} 
          onNavigate={navigateTo}
          initialCategory={currentCategory}
          initialSearch={currentSearch}
          initialSortBy={currentSortBy}
        />
      )}
    </div>
  );
}