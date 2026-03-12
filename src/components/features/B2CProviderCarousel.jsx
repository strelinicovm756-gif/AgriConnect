import { B2CFlipCard } from '../animate-ui/components/community/b2c-flip-card';

// ── Main Carousel ──────────────────────────────────────────────
export default function B2CProviderCarousel({ providers, onNavigate, scrollRef }) {
  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto gap-5 py-4 items-start snap-x snap-mandatory"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {providers.map(p => (
        <div key={p.id} className="flex-shrink-0">
          <B2CFlipCard
            provider={p}
            onNavigate={() => onNavigate('producator', p.id)}
          />
        </div>
      ))}
    </div>
  );
}
