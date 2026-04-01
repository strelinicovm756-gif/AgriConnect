import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./services/supabaseClient";
import { useNotifications } from "./hooks/useNotifications";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DetailsPage from "./pages/DetailsPage";
import ProfilePage from "./pages/ProfilePage";
import AllProductsPage from "./pages/AllProductsPage";
import ProducerPublicProfile from './pages/ProducerPublicProfile';
import AdminDashboard from './pages/admin/AdminDashboard';
import ChatPage from './pages/ChatPage';
import EventDetailsPage from './pages/EventDetailsPage';
import EventsPage from './pages/EventsPage';
import ProducersPage from './pages/ProducersPage';
import { Navbar } from "./components/layout/Navbar";
import { Toaster } from "react-hot-toast";

export default function App() {
  const [session, setSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(session);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN' && window.location.pathname === '/login') {
        navigate('/');
      }
      if (_event === 'SIGNED_OUT') {
        navigate('/');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Înlocuiește vechiul navigateTo(page, param, options) cu URL-uri reale
  const navigateTo = (page, param = null, options = {}) => {
    switch (page) {
      case 'home':
        navigate('/');
        break;
      case 'login':
        navigate('/login');
        break;
      case 'profil':
        navigate('/profil');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'producator':
        navigate(`/producator/${param}`);
        break;
      case 'detalii':
        navigate(`/produs/${param}`);
        break;
      case 'eveniment':
        navigate(`/eveniment/${param}`);
        break;
      case 'evenimente':
        navigate('/evenimente');
        break;
      case 'producatori':
        const params = new URLSearchParams();
        if (options.market_type) params.set('tip', options.market_type);
        if (options.search) params.set('cautare', options.search);

        const queryString = params.toString();
        navigate(`/producatori${queryString ? '?' + queryString : ''}`);
        break;
      case 'toate-produsele': {
        const params = new URLSearchParams();
        if (options.category) params.set('categorie', options.category);
        if (options.search) params.set('cautare', options.search);
        if (options.sortBy && options.sortBy !== 'newest') params.set('sortare', options.sortBy);
        if (options.type) params.set('tip', options.type);
        if (options.verified) params.set('verificat', 'true');
        navigate(`/produse${params.toString() ? '?' + params.toString() : ''}`);
        break;
      }
      default:
        navigate('/');
    }
  };

  // Înlocuiește navigateBack cu browser back
  const navigateBack = () => navigate(-1);

  const handleSearch = () => {
    if (location.pathname === '/') {
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" />

      {!isLoginPage && (
        <Navbar
          session={session}
          currentPage={location.pathname}
          onNavigate={navigateTo}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchLocation={searchLocation}
          setSearchLocation={setSearchLocation}
          onSearch={handleSearch}
          notifications={notifications}
          unreadCount={unreadCount}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
        />
      )}

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                session={session}
                onNavigate={navigateTo}
                searchQuery={searchQuery}
                searchLocation={searchLocation}
              />
            }
          />

          <Route
            path="/producator/:id"
            element={
              <ProducerPublicProfile
                session={session}
                onNavigate={navigateTo}
              />
            }
          />

          <Route
            path="/login"
            element={<LoginPage onNavigate={navigateTo} />}
          />

          <Route
            path="/profil"
            element={<ProfilePage session={session} onNavigate={navigateTo} />}
          />

          <Route
            path="/produs/:id"
            element={
              <DetailsPage
                session={session}
                onNavigate={navigateTo}
                onNavigateBack={navigateBack}
              />
            }
          />

          <Route
            path="/produse"
            element={
              <AllProductsPageWrapper
                session={session}
                onNavigate={navigateTo}
              />
            }
          />

          <Route
            path="/admin"
            element={<AdminDashboard session={session} onNavigate={navigateTo} />}
          />

          <Route
            path="/chat"
            element={<ChatPage session={session} onNavigate={navigateTo} />}
          />

          <Route
            path="/evenimente"
            element={<EventsPage session={session} onNavigate={navigateTo} />}
          />

          <Route
            path="/eveniment/:id"
            element={<EventDetailsPage session={session} onNavigate={navigateTo} />}
          />

          <Route
            path="/producatori"
            element={<ProducersPage session={session} onNavigate={navigateTo} />}
          />

          {/* Orice altă rută → acasă */}
          <Route path="*" element={<HomePage session={session} onNavigate={navigateTo} searchQuery={searchQuery} searchLocation={searchLocation} />} />
        </Routes>
      </main>
    </div>
  );
}

// Wrapper care citește query params din URL și le pasează AllProductsPage
function AllProductsPageWrapper({ session, onNavigate }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  return (
    <AllProductsPage
      session={session}
      onNavigate={onNavigate}
      initialCategory={params.get('categorie') || null}
      initialSearch={params.get('cautare') || null}
      initialSortBy={params.get('sortare') || 'newest'}
      initialType={params.get('tip') || null}
      initialVerified={params.get('verificat') === 'true'}
    />
  );
}