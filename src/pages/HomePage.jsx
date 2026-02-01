import { Navbar } from "../components/layout/Navbar";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export default function HomePage({ session, onNavigate }) {
  // Produse mock (exemple de produse agricole locale)
  const mockProducts = [
    {
      id: 1,
      name: "Roșii bio de țară",
      location: "Sat Mogoșești, Iași",
      price: 8,
      verified: true,
      negotiable: false,
      unit: "kg"
    },
    {
      id: 2,
      name: "Brânză de oaie",
      location: "Sat Prisăcani, Suceava",
      price: 35,
      verified: true,
      negotiable: true,
      unit: "kg"
    },
    {
      id: 3,
      name: "Miere de salcâm",
      location: "Sat Rediu, Iași",
      price: 40,
      verified: false,
      negotiable: false,
      unit: "kg"
    }
  ];

  return (
    <div className="min-h-screen text-white font-sans">
      {/* Navbar */}
      <Navbar session={session} onNavigate={onNavigate} />

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto p-8">
        <div className="py-20 text-center">
          <h2 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
            Produse proaspete <br /> direct de la producător
          </h2>
          {!session && (
            <Button onClick={() => onNavigate('login')} size="lg">
              Începe acum - Gratuit
            </Button>
          )}
        </div>


        {/* Titlu Produse */}
        <div className="mb-8">
          <h3 className="text-3xl font-bold mb-2">Produse Disponibile în Zona Ta</h3>
          <p className="text-slate-400">
            {session 
              ? "Contactează direct producătorii pentru comenzi" 
              : "Loghează-te pentru a vedea prețurile și contactele producătorilor"
            }
          </p>
        </div>

        {/* Produse */}
        <div className="grid md:grid-cols-3 gap-6">
          {mockProducts.map((product) => (
            <div key={product.id} className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl flex flex-col hover:border-emerald-500/50 transition-all">
              <div className="h-40 bg-slate-700 rounded-xl mb-4 flex items-center justify-center text-5xl">
                {product.name.includes('Roșii')}
                {product.name.includes('Brânză')}
                {product.name.includes('Miere')}
              </div>
              
              <h3 className="font-bold text-lg text-white mb-1">{product.name}</h3>

              {/* Badge-uri */}
              <div className="flex gap-2 mb-4">
                {product.verified && <Badge variant="success">✓ VERIFICAT</Badge>}
                {product.negotiable && <Badge variant="info">NEGOCIABIL</Badge>}
              </div>

              {/* Pret */}
              <div className="mb-4 flex-grow">
                {session ? (
                  <p className="text-emerald-400 font-bold text-xl">
                    {product.price} lei / {product.unit}
                  </p>
                ) : (
                  <p className="text-slate-500 italic text-sm">
                    Preț vizibil doar pentru membri
                  </p>
                )}
              </div>

              {/* Buton */}
              <Button
                variant={session ? "primary" : "secondary"}
                onClick={() => {
                  if (session) {
                    onNavigate('detalii');
                  } else {
                    onNavigate('login');
                  }
                }}
                className="w-full"
              >
                {session ? "Vezi detalii și contact" : "Loghează-te pentru contact"}
              </Button>
            </div>
          ))}
        </div>

        {/* Call to Action pentru producatori */}
        {session && (
          <div className="mt-16 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-3xl p-8 text-center">
            <h3 className="text-3xl font-black mb-4">Ești producător?</h3>
            <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
              Adaugă-ți produsele gratuit și ajunge la mii de cumpărători din zona ta. 
            </p>
            <button 
              onClick={() => onNavigate('adauga-produs')}
              className="bg-white text-black hover:bg-slate-100 font-medium px-4 py-2 rounded-lg transition-colors"
            > Adaugă un produs
            </button>
          </div>
        )}
      </main>
    </div>
  );
}