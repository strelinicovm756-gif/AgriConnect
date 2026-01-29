import { supabase } from "../services/supabaseClient";
import toast from "react-hot-toast";

export default function HomePage({ session, onNavigate }) {

    const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      toast.success('Te-ai delogat cu succes!', {
        style: {
          borderRadius: '10px',
          background: '#1e293b', // slate-800
          color: '#fff',
          border: '1px solid #334155', // slate-700
        },
        iconTheme: {
          primary: '#10b981', // emerald-500
          secondary: '#fff',
        },
      });
    } else {
      toast.error('A apărut o eroare la delogare.');
    }
  };

    return (
        <div className="min-h-screen text-white font-sans">
            {/* Navigația */}
            <nav className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <h1 className="text-2xl font-black text-emerald-400 tracking-tighter">AgriConnect</h1>

                <div className="flex items-center gap-4">
                    {session ? (
                        <>
                            <span className="text-slate-400 text-sm hidden md:block">{session.user.email}</span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => onNavigate('login')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition shadow-lg shadow-emerald-600/20"
                        >
                            Login
                        </button>
                    )}
                </div>
            </nav>

            {/* Conținut Hero */}
            <main className="max-w-6xl mx-auto p-8">
                <div className="py-20 text-center">
                    <h2 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                        Meew, <br /> Meew.
                    </h2>
                    <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-10">
                        Mewew.
                    </p>

                    {!session && (
                        <button
                            onClick={() => onNavigate('login')}
                            className="bg-slate-800 border border-slate-700 p-6 rounded-2xl hover:border-emerald-500 transition group"
                        >
                            <p className="text-slate-300">Vrei să vezi prețurile și contactele?</p>
                            <p className="text-emerald-400 font-bold group-hover:scale-105 transition">Loghează-te pentru acces complet →</p>
                        </button>
                    )}
                </div>

                {/* Grid de Anunțuri (Exemplu) */}
                <div className="grid md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl flex flex-col">
                            <div className="h-40 bg-slate-700 rounded-xl mb-4"></div>
                            <h3 className="font-bold text-lg text-white">Utilaj Agricol #{i}</h3>
                            <p className="text-slate-400 text-sm mb-4">Locație: Iași, România</p>

                            {/* Afișarea prețului condiționată vizual */}
                            <div className="mb-4">
                                {session ? (
                                    <p className="text-emerald-400 font-bold text-xl">12.500 €</p>
                                ) : (
                                    <p className="text-slate-500 italic text-sm">Preț vizibil doar pentru membri</p>
                                )}
                            </div>

                            {/* Butonul inteligent de navigare */}
                            <button
                                onClick={() => {
                                    if (session) {
                                        onNavigate('detalii'); // Îl trimiți la detalii dacă e logat
                                    } else {
                                        onNavigate('login');   // Îl trimiți la login dacă NU e logat
                                    }
                                }}
                                className="w-full bg-slate-700 hover:bg-emerald-600 border border-slate-600 text-white py-3 rounded-xl transition-all duration-300 font-medium"
                            >
                                {session ? "Vezi detalii anunț" : "Loghează-te pentru detalii"}
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}