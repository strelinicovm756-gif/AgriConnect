export function Card({ children, className = '', hoverable = false }) {
  return (
    <div className={`
      bg-slate-800/50 border border-slate-700 p-5 rounded-2xl
      ${hoverable ? 'hover:border-emerald-500 transition-all duration-300 cursor-pointer' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}