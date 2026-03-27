import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar, faMapMarkerAlt, faCircleCheck,
  faSeedling, faCarrot, faAppleWhole, faCow,
  faDrumstickBite, faEgg, faJar, faWheatAwn, faLeaf,
} from '@fortawesome/free-solid-svg-icons';
import { getColorForName } from '../../../../lib/utils';

const CATEGORY_ICON = {
  'Legume':   faCarrot,
  'Fructe':   faAppleWhole,
  'Lactate':  faCow,
  'Carne':    faDrumstickBite,
  'Ouă':      faEgg,
  'Conserve': faJar,
  'Cereale':  faWheatAwn,
  'Bio':      faLeaf,
};
function catIcon(cat) {
  for (const [key, icon] of Object.entries(CATEGORY_ICON)) {
    if (cat?.includes(key)) return icon;
  }
  return faSeedling;
}

export function B2CFlipCard({ provider, onNavigate }) {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const color = getColorForName(provider.id || provider.name);

  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  const handleClick = () => { if (isTouchDevice) setIsFlipped(f => !f); };
  const handleEnter = () => { if (!isTouchDevice) setIsFlipped(true); };
  const handleLeave = () => { if (!isTouchDevice) setIsFlipped(false); };

  return (
    <div
      className="mt-2 w-40 h-60 md:w-[262px] md:h-80 [perspective:1000px] cursor-pointer mx-auto"
      onClick={handleClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* ── FRONT: alb curat ── */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl border border-gray-200 bg-white flex flex-col items-center justify-center px-4 py-6 gap-3 text-center">
          {/* Avatar */}
          <div className="relative">
            <div
              className="size-20 md:size-24 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              {(provider.name || '?').charAt(0).toUpperCase()}
            </div>
            {provider.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                <FontAwesomeIcon icon={faCircleCheck} className="text-white text-[10px]" />
              </div>
            )}
          </div>

          <h2 className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
            {provider.name}
          </h2>

          {provider.rating > 0 && (
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-sm" />
              <span className="text-sm font-bold text-gray-700">
                {Number(provider.rating).toFixed(1)}
              </span>
            </div>
          )}

          {provider.location && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px]" />
              {provider.location}
            </span>
          )}

          <p className="text-[10px] text-gray-300 mt-auto">Hover for details</p>
        </div>

        {/* ── BACK: întunecat cu categorii + buton ── */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl bg-emerald-700 flex flex-col p-5 gap-4">
          {/* Categories */}
          <div className="flex-1">
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Products Offered
            </p>
            <ul className="space-y-2">
              {provider.categories?.slice(0, 4).map(cat => (
                <li key={cat} className="flex items-center gap-2 text-sm text-white">
                  <FontAwesomeIcon icon={catIcon(cat)} className="text-emerald-400 text-xs flex-shrink-0" />
                  <span className="truncate">{cat}</span>
                </li>
              ))}
              {(!provider.categories || provider.categories.length === 0) && (
                <li className="text-sm text-gray-400 italic">General products</li>
              )}
            </ul>
          </div>

          {/* Products count + button */}
          <div className="flex flex-col gap-2">
            {provider.productsCount > 0 && (
              <p className="text-center text-xs text-white font-medium">
                <span className="text-white font-bold">{provider.productsCount}</span> active products
              </p>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              View Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
