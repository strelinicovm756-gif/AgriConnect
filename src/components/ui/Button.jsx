export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick,
  disabled = false,
  className = '',
  type = 'button'
}) {
  const baseStyles = 'font-bold rounded-xl transition-all duration-300 cursor-pointer';
  
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20',
    secondary: 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white',
    ghost: 'text-slate-400 hover:text-emerald-400 bg-transparent'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${className}
        ${disabled && 'opacity-50 cursor-not-allowed'}
      `}
    >
      {children}
    </button>
  );
}