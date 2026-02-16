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
        <label className="block text-gray-700 text-sm font-medium mb-2">
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
          bg-gray-50 border rounded-lg text-gray-900 
          focus:outline-none focus:ring-2 focus:border-transparent
          transition-colors duration-200
          placeholder:text-gray-400
          ${error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500'
          }
          ${className}
        `}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}