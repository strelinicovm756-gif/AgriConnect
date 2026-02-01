import { supabase } from "../services/supabaseClient";
import toast from "react-hot-toast";
import iconitaApp from '../assets/IconApp.svg';

export default function LoginPage({ onNavigate }) {

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          redirectTo: window.location.origin
        },
      });

      if (error) throw error;
    } catch (error) {
      toast.error("Eroare la conectare: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 font-sans relative overflow-hidden">
      {/* Decor fundal */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-emerald-900/20 rounded-full blur-3xl"></div>

      {/* Buton Înapoi */}
      <button
        onClick={() => onNavigate('home')}
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-slate-500 transition hover:text-emerald-400 group"
      >
        <span>
          Înapoi la pagina principală
        </span>
      </button>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl text-center z-10">
        <div className="mb-8">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-inner">
            <img src={iconitaApp} alt="Grâu" className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">AgriConnect</h2>
          <p className="text-slate-400 text-sm">
            Produse proaspete direct de la producător
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl transition shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-6 h-6"
            />Intră cu Google
          </button>
        </div>

        <p className="mt-8 text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
          Sprijină economia locală
        </p>
      </div>
    </div>
  );
}