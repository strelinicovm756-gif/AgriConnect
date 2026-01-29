import { useState, useEffect } from "react";
import { supabase } from "./services/supabaseClient";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DetailsPage from "./pages/DetailsPage";
import { Toaster } from "react-hot-toast"; 

export default function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 





   useEffect(() => {
  if (session && currentPage === 'login') {
    // Îi dăm un mic răgaz de 500ms să se așeze pagina
    const timer = setTimeout(() => {
      toast.success(`Salutare! Te-ai conectat ca ${session.user.email}`, {
        id: 'login-success', // Previne duplicarea notificării
        duration: 10000,
        style: {
          background: '#064e3b', // emerald-900
          color: '#fff',
          border: '1px solid #10b981'
        }
      });
      setCurrentPage('home');
    }, 500);

    return () => clearTimeout(timer);
  }
}, [session, currentPage]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);


  const navigateTo = (page) => setCurrentPage(page);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 2. ADAUGĂ ASTA AICI (Esențial pentru a vedea mesajele) */}
      <Toaster position="top-center" reverseOrder={false} />

      {currentPage === 'home' && <HomePage session={session} onNavigate={navigateTo} />}
      {currentPage === 'login' && <LoginPage onNavigate={navigateTo} />}
      {currentPage === 'detalii' && <DetailsPage session={session} onNavigate={navigateTo} />}
    </div>
  );
}