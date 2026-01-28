function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="rounded-2xl bg-white p-8 shadow-2xl transition-all hover:scale-105">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
          AgriConnect v4
        </h1>
        <p className="mt-2 text-gray-600">
          Tailwind CSS v4 funcționează fără fișiere de config!
        </p>
        <button className="mt-4 rounded-lg bg-green-500 px-6 py-2 font-semibold text-white hover:bg-green-600">
          Succes!
        </button>
      </div>
    </div>
  )
}

export default App