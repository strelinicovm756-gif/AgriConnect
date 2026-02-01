import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAddressCard, faBoxOpen } from '@fortawesome/free-solid-svg-icons';

export function Navbar({ session, onNavigate }) {
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();

        if (!error) {
            toast.success('Te-ai delogat cu succes!', {
                icon: '👋',
                style: {
                    borderRadius: '10px',
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                },
                iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                },
            });
        } else {
            toast.error('A apărut o eroare la delogare.');
        }
    };

    return (
        <nav className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
            {/* Logo */}
            <h1
                onClick={() => onNavigate('home')}
                className="text-2xl font-black text-emerald-400 tracking-tighter cursor-pointer hover:text-emerald-300 transition"
            >
                AgriConnect
            </h1>

            {/* Meniu Navigare (centru) */}
            <div className="hidden md:flex items-center gap-6">
                {session && (
                    <>
                        <button
                            onClick={() => onNavigate('profil')}
                            className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition font-medium"
                        >
                            <FontAwesomeIcon icon={faAddressCard} />
                           <span>Profile</span>
                        </button>
                        <button 
                            onClick={() => onNavigate('produse')}
                            className="text-slate-400 hover:text-emerald-400 transition font-medium"
                        >
                            <FontAwesomeIcon icon={faBoxOpen} />
                            <span> Produsele Mele</span> 
                        </button>
                    </>
                )}
            </div>

            {/* User Section (dreapta) */}
            <div className="flex items-center gap-4">
                {session ? (
                    <>
                        <span className="text-slate-400 text-sm hidden md:block max-w-[200px] truncate">
                            {session.user.email}
                        </span>
                        <Button variant="danger" size="sm" onClick={handleLogout}>
                            Logout
                        </Button>
                    </>
                ) : (
                    <Button onClick={() => onNavigate('login')} size="sm">
                        Login
                    </Button>
                )}
            </div>
        </nav>
    );
}