import { useState, useEffect } from "react";
import { supabase } from "./services/supabaseClient";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DetailsPage from "./pages/DetailsPage";
import ProfilePage from "./pages/ProfilePage";
import { Toaster } from "react-hot-toast";
import toast from 'react-hot-toast';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'SIGNED_IN') {
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
          setCurrentPage('home');
        }, 300);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateTo = (page) => setCurrentPage(page);

  return (
    <div className="min-h-screen bg-slate-900">
      <Toaster position="top-center" reverseOrder={false} />

      {currentPage === 'home' && <HomePage session={session} onNavigate={navigateTo} />}
      {currentPage === 'login' && <LoginPage onNavigate={navigateTo} />}
      {currentPage === 'detalii' && <DetailsPage session={session} onNavigate={navigateTo} />}
      {currentPage === 'profil' && <ProfilePage session={session} onNavigate={navigateTo} />}  
    </div>
  );
}