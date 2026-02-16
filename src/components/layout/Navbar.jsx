import { useState, useEffect, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faUser, faRightFromBracket, faChevronDown, faLeaf
} from '@fortawesome/free-solid-svg-icons';

export function Navbar({ session, onNavigate, hideDropdown = false, onAddProduct }) {
  const [profileName, setProfileName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(!!session);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (session) {
      loadProfileName();
    } else {
      setProfileName('');
      setIsLoadingProfile(false);
    }
  }, [session]);

  const loadProfileName = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data?.full_name) setProfileName(data.full_name);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setShowDropdown(false);
      setProfileName('');
      toast.success('Te-ai deconectat!');
      onNavigate('home'); // <--- Redirecționarea care lipsea
    }
  };

  // Închide dropdown la click afară
  useEffect(() => {
    const clickOut = (e) => dropdownRef.current && !dropdownRef.current.contains(e.target) && setShowDropdown(false);
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const getColorForName = (name) => {
  const colors = [
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#06b6d4', // Cyan
    '#f43f5e'  // Rose
  ];
  // Generăm un cod numeric bazat pe caracterele numelui
  const hash = (name || 'U').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        {/* Logo */}
        <div onClick={() => onNavigate('home')} className="flex items-center gap-2 cursor-pointer group">
          <div className="text-emerald-600 text-2xl"><FontAwesomeIcon icon={faLeaf} /></div>
          <h1 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition">AgriConnect</h1>
        </div>

        {/* User Section */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {onAddProduct && (
                <button onClick={onAddProduct} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-full text-sm hover:scale-105 transition shadow-md">
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Adaugă anunț</span>
                </button>
              )}

              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-xl transition">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isLoadingProfile ? 'animate-pulse bg-gray-200' : ''}`}
                    style={{ background: isLoadingProfile ? '' : getColorForName(profileName || session.user.email) }}
                  >
                    {!isLoadingProfile && (profileName ? profileName[0] : session.user.email[0]).toUpperCase()}
                  </div>
                  <FontAwesomeIcon icon={faChevronDown} className={`text-gray-400 text-[10px] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-dropdown">
                    <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                      <p className="text-sm font-bold truncate">{profileName || 'Utilizator'}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                    </div>
                    <div className="p-2">
                      <button onClick={() => {onNavigate('profil'); setShowDropdown(false)}} className="w-full p-2.5 text-left hover:bg-emerald-50 rounded-xl flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          <FontAwesomeIcon icon={faUser} />
                        </div>
                        <span className="text-sm font-medium">Profilul meu</span>
                      </button>
                      <button onClick={handleLogout} className="w-full p-2.5 text-left hover:bg-red-50 rounded-xl flex items-center gap-3 group mt-1">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                          <FontAwesomeIcon icon={faRightFromBracket} />
                        </div>
                        <span className="text-sm font-medium text-red-600">Deconectare</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => onNavigate('login')} className="bg-emerald-600 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md">Autentificare</button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes dropdown { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-dropdown { animation: dropdown 0.2s ease-out; }
      `}</style>
    </nav>
  );
}