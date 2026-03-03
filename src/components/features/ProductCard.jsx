import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot,
  faAppleWhole,
  faCow,
  faDrumstickBite,
  faEgg,
  faJar,
  faWheatAwn,
  faBox,
  faLocationDot,
  faEye,
  faCalendarDays,
  faImages,
  faLock
} from '@fortawesome/free-solid-svg-icons';

export function ProductCard({ product, session, onViewDetails, onContactClick }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  const categoryConfig = {
    'Legume': { icon: faCarrot, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
    'Fructe': { icon: faAppleWhole, bgColor: 'bg-red-50', iconColor: 'text-red-600' },
    'Lactate': { icon: faCow, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
    'Carne': { icon: faDrumstickBite, bgColor: 'bg-orange-50', iconColor: 'text-orange-600' },
    'Ouă': { icon: faEgg, bgColor: 'bg-yellow-50', iconColor: 'text-yellow-700' },
    'Miere': { icon: faJar, bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
    'Cereale': { icon: faWheatAwn, bgColor: 'bg-lime-50', iconColor: 'text-lime-700' },
    'Conserve': { icon: faJar, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
    'Altele': { icon: faBox, bgColor: 'bg-gray-50', iconColor: 'text-gray-600' }
  };

  const config = categoryConfig[product.category] || categoryConfig['Altele'];

  const getColorForName = (name) => {
    if (!name) return '#10b981';
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="flex flex-col h-full">

      
      <div className="relative h-40 bg-gray-100 rounded-t-xl overflow-hidden">
        {product.image_url ? (
          <>
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Counter Imagini */}
            {(() => {
              const galleryCount = product.gallery_images?.length || 0;
              const totalImages = 1 + galleryCount;

              if (totalImages > 1) {
                return (
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg">
                    <FontAwesomeIcon icon={faImages} className="text-[11px]" />
                    <span>{totalImages}</span>
                  </div>
                );
              }
              return null;
            })()}
          </>
        ) : (
          <div className={`flex items-center justify-center h-full ${config.bgColor}`}>
            <FontAwesomeIcon
              icon={config.icon}
              className={`text-7xl ${config.iconColor}`}
            />
          </div>
        )}

        {/* Badge categorie + VERIFICAT peste imagine */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <FontAwesomeIcon icon={config.icon} className={`text-xs ${config.iconColor}`} />
            {product.category}
          </span>
          {product.seller_verified && (
            <span className="bg-emerald-600/95 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md w-fit">
              ✓ VERIFICAT
            </span>
          )}
        </div>
      </div>

      {/* Content - spacing optimizat */}
      <div className="flex flex-col h-full p-4 bg-white rounded-b-xl">
        {/* Titlu - min-height pentru aliniament */}
        <h3
          className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 hover:text-emerald-600 transition-colors"
          style={{ minHeight: '2.8rem' }}
        >
          {product.name}
        </h3>

        {/* Locație - spacing redus */}
        <p className="text-gray-600 text-sm mb-3 flex items-center gap-1.5 font-medium">
          <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600" />
          {product.location}
        </p>

        {/* Badge NEGOCIABIL — VERIFICAT e acum pe imagine */}
        {product.is_negotiable && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              NEGOCIABIL
            </span>
          </div>
        )}

        {/* Descriere scurtă */}
        {product.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-1">
            {product.description}
          </p>
        )}

        {/* Spacer — impinge pret+buton la baza */}
        <div className="flex-grow" />

        {/* Pret + Vanzator + Buton — grupate la baza cardului */}
        <div className="mt-3">
          {/* Pret */}
          <div className="mb-2">
            {session ? (
              <div className="flex items-baseline gap-1.5">
                <p className="text-emerald-600 font-bold text-2xl leading-none">
                  {formatPrice(product.price)}
                </p>
                <span className="text-gray-600 font-semibold text-base">lei</span>
                {product.unit && (
                  <span className="text-gray-400 text-xs">/ {product.unit}</span>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                <p className="text-gray-500 text-xs flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                  Autentifică-te pentru preț
                </p>
              </div>
            )}
          </div>

          {/* Vanzator — fara background, curat */}
          {session && product.seller_name && (
            <div className="mb-3 flex items-center gap-2 py-2 border-t border-gray-100">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black text-white uppercase"
                style={{ background: getColorForName(product.seller_name) }}
              >
                {product.seller_name?.charAt(0) || '?'}
              </div>
              <p className="text-gray-600 text-xs font-medium truncate flex-1">{product.seller_name}</p>
              {product.seller_rating > 0 && (
                <span className="text-gray-400 text-xs flex-shrink-0">★ {product.seller_rating.toFixed(1)}</span>
              )}
            </div>
          )}

          {/* Buton — full width, aliniat la baza */}
          <button
            onClick={() => onViewDetails(product.id)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm hover:shadow-emerald-200/60 hover:shadow-md"
          >
            {session ? "Vezi detalii" : "Autentifică-te"}
          </button>
        </div>

        {/* Footer cu statistici - spacing redus */}
        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faEye} />
            {product.views_count || 0}
          </span>
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faCalendarDays} />
            {new Date(product.created_at).toLocaleDateString('ro-RO', {
              day: 'numeric',
              month: 'short'
            })}
          </span>
        </div>
      </div>
    </div>
  );
}