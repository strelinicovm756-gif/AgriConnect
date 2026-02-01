export function Input({ 
  type = 'text', 
  placeholder = '', 
  value, 
  onChange, 
  label = '',
  error = '',
  required = false,
  className = ''
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-slate-300 text-sm font-medium mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-full px-4 py-3 
          bg-slate-800 border border-slate-700 
          rounded-xl text-white 
          focus:outline-none focus:border-emerald-500 
          transition-colors duration-200
          placeholder:text-slate-500
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}