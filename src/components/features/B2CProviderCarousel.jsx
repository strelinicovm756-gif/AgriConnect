import useEmblaCarousel from 'embla-carousel-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { B2CFlipCard } from '../animate-ui/components/community/b2c-flip-card';

// ── Main Carousel ──────────────────────────────────────────────
export default function B2CProviderCarousel({ providers, onNavigate }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    dragFree: true,
  });

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <div className="relative">
      {/* Prev */}
      <button
        onClick={scrollPrev}
        aria-label="Înapoi"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-24 bg-white/80 backdrop-blur-sm border border-emerald-100 text-emerald-600 shadow-md transition-all duration-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:w-11 active:scale-95"
        style={{ borderRadius: '0 9999px 9999px 0' }}
      >
        <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
      </button>

      {/* Embla viewport */}
      <div className="overflow-hidden px-10" ref={emblaRef}>
        <div className="flex gap-5 py-4 items-start">
          {providers.map(p => (
            <div key={p.id} className="flex-shrink-0">
              <B2CFlipCard
                provider={p}
                onNavigate={() => onNavigate('producator', p.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Next */}
      <button
        onClick={scrollNext}
        aria-label="Înainte"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-24 bg-white/80 backdrop-blur-sm border border-emerald-100 text-emerald-600 shadow-md transition-all duration-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:w-11 active:scale-95"
        style={{ borderRadius: '9999px 0 0 9999px' }}
      >
        <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
      </button>
    </div>
  );
}
