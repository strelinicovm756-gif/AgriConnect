import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getColorForName } from '../../lib/utils';
import { supabase } from '../../services/supabaseClient';
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
  faCalendarDays,
  faImages,
  faLock,
  faFlag
} from '@fortawesome/free-solid-svg-icons';

export function ProductCard({ product, session, onViewDetails, onContactClick }) {
  const { t } = useLanguage();
  const [isReported, setIsReported] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const handleQuickReport = async (e) => {
    e.stopPropagation();
    if (!session || isReported || isReporting) return;
    setIsReporting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: session.user.id, product_id: product.id, reason: 'Spam sau duplicat'
      });
      if (error) throw error;
      setIsReported(true);
    } catch {
      // Dacă există deja o raportare, marcăm oricum ca raportat
      setIsReported(true);
    } finally {
      setIsReporting(false);
    }
  };
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  const categoryConfig = {
    'Legume': { icon: faCarrot, bgColor: 'bg-gray-100', iconColor: 'text-emerald-600' },
    'Fructe': { icon: faAppleWhole, bgColor: 'bg-red-50', iconColor: 'text-red-600' },
    'Lactate': { icon: faCow, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
    'Carne': { icon: faDrumstickBite, bgColor: 'bg-orange-50', iconColor: 'text-orange-600' },
    'Ouă': { icon: faEgg, bgColor: 'bg-yellow-50', iconColor: 'text-yellow-700' },
    'Miere': { icon: faJar, bgColor: 'bg-amber-50', iconColor: 'text-amber-700' },
    'Cereale': { icon: faWheatAwn, bgColor: 'bg-lime-50', iconColor: 'text-lime-700' },
    'Conserve': { icon: faJar, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
    'Altele': { icon: faBox, bgColor: 'bg-gray-50', iconColor: 'text-gray-600' }
  };

  const categoryName = product.categories?.name ?? product.category;
  const config = categoryConfig[categoryName] || categoryConfig['Altele'];


  return (
    <div className="flex flex-col h-full">


      <div className="relative h-36 bg-gray-100 rounded-t-xl overflow-hidden">
        {product.image_url ? (
          <>
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </>
        ) : (
          <div className={`flex items-center justify-center h-full ${config.bgColor}`}>
            <FontAwesomeIcon
              icon={config.icon}
              className={`text-7xl ${config.iconColor}`}
            />
          </div>
        )}

        {/* Badge categorie */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <FontAwesomeIcon icon={config.icon} className={`text-xs ${config.iconColor}`} />
            {product.categories?.name ?? product.category}
          </span>
        </div>

        {/* Negotiable badge */}
        {product.is_negotiable && (
          <span className="absolute top-4 right-2 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">NEGOTIABLE</span>
        )}

        {/* Buton raportare — vizibil la hover */}
        {session && session.user?.id !== product.user_id && (
          <button
            onClick={handleQuickReport}
            disabled={isReported || isReporting}
            title={isReported ? t.features.alreadyReported : t.features.reportListing}
            className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow transition-all duration-200 opacity-0 group-hover:opacity-100 ${isReported ? 'bg-red-500 text-white cursor-default' : 'bg-white/80 text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
          >
            <FontAwesomeIcon icon={faFlag} className="text-[9px]" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 bg-white rounded-b-xl">

        {/* Top content — grows to fill space */}
        <div className="flex-1">
          <h3
            className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 hover:text-emerald-600 transition-colors"
            style={{ minHeight: '3.5rem' }}
          >
            {product.name}
          </h3>

          <p className="text-gray-600 text-sm mb-3 flex items-center gap-1.5 font-medium">
            <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600" />
            {product.location}
          </p>

          {product.description && (
            <p className="text-gray-500 text-sm mb-3 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Footer — always at bottom */}
        <div className="mt-auto pt-3 border-t border-gray-50">
          <div className="mb-3">
            {session ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-emerald-600 font-bold text-3xl">
                    {formatPrice(product.price)}
                  </p>
                  <span className="text-gray-900 font-semibold text-lg">lei</span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <FontAwesomeIcon icon={faLock} className="text-emerald-700" />
                  {t.features.signInToSeePrice}
                </p>
              </div>
            )}
          </div>

          {session && product.seller_name && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                  style={{
                    background: getColorForName(product.user_id || product.seller_name),
                    borderColor: getColorForName(product.user_id || product.seller_name) + '50'
                  }}
                >
                  <span className="text-white text-sm font-black uppercase">
                    {product.seller_name?.charAt(0) || '?'}
                  </span>
                </div>

                <div className="flex-grow min-w-0">
                  <p className="text-gray-900 text-sm font-semibold truncate">{product.seller_name}</p>
                  {product.seller_rating > 0 && (
                    <p className="text-gray-500 text-xs">
                      Rating: {product.seller_rating.toFixed(1)}/5.0
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            variant={session ? "primary" : "secondary"}
            onClick={() => onViewDetails(product.id)}
            className="w-full"
          >
            {session ? t.features.viewDetails : t.features.signIn}
          </button>

          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end text-xs text-gray-500">
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
    </div>
  );
}