import { supabase } from "../services/supabaseClient";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export default function DetailsPage({ onNavigate, session }) {
  if (!session) {
    onNavigate('login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Navigatie */}
      <nav className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
        <Button 
          variant="ghost"
          onClick={() => onNavigate('home')}
        >
        Înapoi la Produse
        </Button>
        <h1 className="text-xl font-bold text-emerald-400">Detalii Produs</h1>
        <div className="w-20"></div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 md:p-12">
        <div className="grid md:grid-cols-2 gap-10">
          
          {/* Partea Stanga/Imagine */}
          <div className="space-y-6">
            <div className="aspect-square bg-slate-800 rounded-3xl border border-slate-700 flex items-center justify-center overflow-hidden shadow-2xl">
            </div>
            <div className="flex gap-3">
              <Badge variant="success">✓ PRODUCĂTOR VERIFICAT</Badge>
              <Badge variant="info">BIO</Badge>
            </div>
          </div>

          {/* Partea Dreapt/ Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-black mb-2">Roșii bio de țară</h2>
              <p className="text-slate-400">Publicat acum 2 zile • Mogoșești, Iași</p>
            </div>

            <div className="text-3xl font-bold text-emerald-400">
              8 lei / kg
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-lg border-b border-slate-700 pb-2 text-slate-200">Detalii Produs</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between">
                  <span className="text-slate-500">Categorie:</span>
                  <span className="text-white">Legume</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Cantitate disponibilă:</span>
                  <span className="text-white">50 kg</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Cultivat:</span>
                  <span className="text-white">Bio, fără pesticide</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Recoltă:</span>
                  <span className="text-white">2024</span>
                </li>
              </ul>
            </div>

            {/* Contact Producător */}
            <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-900/20">
              <p className="text-emerald-100 text-sm mb-1">Contact Producător:</p>
              <p className="text-2xl font-black mb-1">Ion Popescu</p>
              <p className="text-emerald-200 text-sm mb-4">0722 456 789</p>
              <Button className="w-full bg-white text-emerald-700 hover:bg-slate-100">
                Trimite Mesaj
              </Button>
            </div>
          </div>

        </div>

        {/* Descriere */}
        <div className="mt-12 border-t border-slate-800 pt-8">
          <h3 className="text-xl font-bold mb-4">Descriere</h3>
          <p className="text-slate-400 leading-relaxed mb-4">
            Roșii crescute în grădină proprie, fără pesticide sau îngrășăminte chimice. 
            Soi românesc de țară, foarte aromat și gustos. Perfect pentru salate sau conserve.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Livrare posibilă în Iași și comunele din jur. Cantități mai mari la prețuri negociabile.
            Puteți veni să le vedeți înainte de cumpărare. Acum este sezonul perfect - culese zilnic!
          </p>
        </div>

        {/* Recenzii */}
        <div className="mt-12 border-t border-slate-800 pt-8">
          <h3 className="text-xl font-bold mb-4">Recenzii</h3>
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 text-center text-slate-500">
            <p>Acest producător nu are încă recenzii.</p>
            <p className="text-sm mt-2">Fii primul care lasă o recenzie după ce cumperi!</p>
          </div>
        </div>
      </main>
    </div>
  );
}