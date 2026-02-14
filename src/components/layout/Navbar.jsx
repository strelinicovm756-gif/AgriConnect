import { useState, useEffect, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import { Button } from "../ui/Button";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, // ADAUGĂ
  faUser,
  faRightFromBracket,
  faChevronDown,
  faLeaf
} from '@fortawesome/free-solid-svg-icons';

export function Navbar({ session, onNavigate, hideDropdown = false, onAddProduct }) { // ADAUGĂ onAddProduct
  const [profileName, setProfileName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const dropdownRef = useRef(null);
  const profileLoadedRef = useRef(false);

  useEffect(() => {
    if (session) {
      if (!profileLoadedRef.current) {
        loadProfileName();
      } else {
        setIsLoadingProfile(false);
      }
    } else {
      setIsLoadingProfile(false);
      profileLoadedRef.current = false;
    }
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowDropdown(false);
  }, [onNavigate]);

  const loadProfileName = async () => {
    try {
      setIsLoadingProfile(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data?.full_name) {
        setProfileName(data.full_name);
      }
      
      profileLoadedRef.current = true;
    } catch (error) {
      console.error('Eroare la încărcarea numelui:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error('A apărut o eroare la delogare.');
    } else {
      setShowDropdown(false);
      setProfileName('');
      profileLoadedRef.current = false;
      toast.success('Te-ai deconectat cu succes!');
    }
  };

  const getColorForName = (name, isDark = false) => {
    if (!name) return isDark ? '#059669' : '#10b981';
    
    const colors = [
      ['#10b981', '#059669'],
      ['#3b82f6', '#2563eb'],
      ['#8b5cf6', '#7c3aed'],
      ['#ec4899', '#db2777'],
      ['#f59e0b', '#d97706'],
      ['#ef4444', '#dc2626'],
      ['#06b6d4', '#0891b2'],
      ['#84cc16', '#65a30d'],
    ];
    
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorPair = colors[hash % colors.length];
    
    return isDark ? colorPair[1] : colorPair[0];
  };

  const getDisplayName = () => {
    if (isLoadingProfile) {
      return '...';
    }
    return profileName || session?.user?.email?.split('@')[0] || 'Utilizator';
  };

  const getDisplayInitial = () => {
    if (isLoadingProfile) {
      return '•';
    }
    if (profileName) {
      return profileName.charAt(0).toUpperCase();
    }
    return session?.user?.email?.charAt(0).toUpperCase() || '?';
  };

  return (
    <nav className="p-6 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 group"
        >
          <div className="text-emerald-600 text-2xl">
            <FontAwesomeIcon icon={faLeaf} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight group-hover:text-emerald-600 transition">
            AgriConnect
          </h1>
        </button>

        {/* User Section */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {/* BUTON ADAUGĂ ANUNȚ - NOU */}
              {onAddProduct && (
                <button
                  onClick={onAddProduct}
                  className="
                    flex items-center gap-2 
                    px-4 py-2.5 
                    bg-emerald-600 hover:bg-emerald-700 
                    text-white font-semibold 
                    rounded-xl 
                    transition-all duration-200
                    shadow-md hover:shadow-lg
                    hover:scale-105 active:scale-95
                  "
                >
                  <FontAwesomeIcon icon={faPlus} className="text-sm" />
                  <span className="hidden sm:inline">Adaugă anunț</span>
                  <span className="sm:hidden">+</span>
                </button>
              )}

              {hideDropdown ? (
                <button
                  onClick={() => onNavigate('profil')}
                  className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-xl transition group"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${getColorForName(profileName || session.user.email)} 0%, ${getColorForName(profileName || session.user.email, true)} 100%)`,
                      borderColor: getColorForName(profileName || session.user.email) + '50'
                    }}
                  >
                    <span className="text-white text-sm font-black uppercase">
                      {getDisplayInitial()}
                    </span>
                  </div>
                  
                  <span className="text-gray-700 text-sm hidden md:block group-hover:text-emerald-600 transition font-medium">
                    {getDisplayName()}
                  </span>
                </button>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-xl transition group"
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${getColorForName(profileName || session.user.email)} 0%, ${getColorForName(profileName || session.user.email, true)} 100%)`,
                        borderColor: getColorForName(profileName || session.user.email) + '50'
                      }}
                    >
                      <span className="text-white text-sm font-black uppercase">
                        {getDisplayInitial()}
                      </span>
                    </div>
                    
                    <span className="text-gray-700 text-sm hidden md:block group-hover:text-emerald-600 transition font-medium">
                      {getDisplayName()}
                    </span>

                    <FontAwesomeIcon 
                      icon={faChevronDown} 
                      className={`text-gray-400 text-xs transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-dropdown">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
                        <p className="text-xs text-gray-500 mb-1">Conectat ca</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {getDisplayName()}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      </div>

                      <div className="py-2">
                        <button
                          onClick={() => {
                            onNavigate('profil');
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition">
                            <FontAwesomeIcon icon={faUser} className="text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Vezi Profilul</p>
                            <p className="text-xs text-gray-500">Setări și informații</p>
                          </div>
                        </button>
                      </div>

                      <div className="border-t border-gray-100"></div>

                      <div className="py-2">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-left hover:bg-red-50 transition flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition">
                            <FontAwesomeIcon icon={faRightFromBracket} className="text-red-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-600">Deconectare</p>
                            <p className="text-xs text-red-400">Ieși din cont</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <Button
              onClick={() => onNavigate('login')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold transition shadow-lg shadow-emerald-600/20"
            >
              Autentificare
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dropdown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-dropdown {
          animation: dropdown 0.2s ease-out;
        }
      `}</style>
    </nav>
  );
}