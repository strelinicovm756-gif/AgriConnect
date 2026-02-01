export function Badge({ children, variant = 'default' }) {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
    default: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  };

  return (
    <span className={`
      ${variants[variant]}
      border px-3 py-1 rounded-full text-xs font-bold inline-block
    `}>
      {children}
    </span>
  );
}