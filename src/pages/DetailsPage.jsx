import { supabase } from "../services/supabaseClient";

export default function DetailsPage({ onNavigate, session }) {
  // Dacă dintr-un motiv anume utilizatorul ajunge aici fără sesiune, îl trimitem la login
  if (!session) {
    onNavigate('login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Navigație simplă */}
      <nav className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
        <button 
          onClick={() => onNavigate('home')}
          className="text-slate-400 hover:text-emerald-400 transition flex items-center gap-2"
        >
          ← Înapoi la Anunțuri
        </button>
        <h1 className="text-xl font-bold text-emerald-400">Detalii Utilaj</h1>
        <div className="w-20"></div> {/* Spacer pentru centrare */}
      </nav>

      <main className="max-w-4xl mx-auto p-6 md:p-12">
        <div className="grid md:grid-cols-2 gap-10">
          
          {/* Partea Stângă: Imagine și Stare */}
          <div className="space-y-6">
            <div className="aspect-video bg-slate-800 rounded-3xl border border-slate-700 flex items-center justify-center overflow-hidden shadow-2xl">
               <span className="text-slate-600">FOTO UTILAJ</span>
            </div>
            <div className="flex gap-3">
              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">VERIFICAT</span>
              <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-bold">PREȚ NEGOCIABIL</span>
            </div>
          </div>

          {/* Partea Dreaptă: Info și Contact */}
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-black mb-2">Tractor John Deere 6120M</h2>
              <p className="text-slate-400">Publicat acum 2 zile • Iași, România</p>
            </div>

            <div className="text-3xl font-bold text-emerald-400">
              65.000 €
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-lg border-b border-slate-700 pb-2 text-slate-200">Specificații Tehnice</h3>
              <ul className="grid grid-cols-2 gap-4 text-sm">
                <li><span className="text-slate-500 italic">Putere:</span> 120 CP</li>
                <li><span className="text-slate-500 italic">Ore funcționare:</span> 1.200</li>
                <li><span className="text-slate-500 italic">An:</span> 2021</li>
                <li><span className="text-slate-500 italic">Transmisie:</span> Manuală</li>
              </ul>
            </div>

            <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-900/20">
              <p className="text-emerald-100 text-sm mb-1">Contact Vânzător:</p>
              <p className="text-2xl font-black mb-4">0722 456 789</p>
              <button className="w-full bg-white text-emerald-700 font-bold py-3 rounded-xl hover:bg-slate-100 transition">
                Trimite Mesaj
              </button>
            </div>
          </div>

        </div>

        {/* Descriere Extinsă */}
        <div className="mt-12 border-t border-slate-800 pt-8">
          <h3 className="text-xl font-bold mb-4">Descriere Anunț</h3>
          <p className="text-slate-400 leading-relaxed">
            Utilajul se află în stare impecabilă de funcționare. Toate reviziile au fost făcute la timp în reprezentanță. 
            Se vinde împreună cu contragreutăți față și set complet de roți înguste pentru prășit. 
            Acceptăm orice test autorizat. Pentru mai multe detalii, nu ezitați să ne contactați telefonic.
          </p>
        </div>
      </main>
    </div>
  );
}