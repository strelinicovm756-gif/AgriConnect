import { useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft, faChevronRight, faXmark, faCalendarDays, faComment,
} from '@fortawesome/free-solid-svg-icons';
import { B2BFlipCard } from '../animate-ui/components/community/b2b-flip-card';

// ── Request Offer Modal ────────────────────────────────────────
function RequestModal({ provider, isOpen, onClose }) {
  const [form, setForm] = useState({
    serviceType: provider.services?.[0] || '',
    message: '',
    date: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (provider.phone) {
      const phone = provider.phone.replace(/\s/g, '');
      toast.success(
        <div>
          <p className="font-bold text-sm mb-1">Cerere trimisă! Contactați:</p>
          <p className="font-semibold">{provider.name}</p>
          <a href={`tel:${phone}`} className="text-emerald-500 underline text-base font-bold">
            {provider.phone}
          </a>
        </div>,
        { duration: 10000 }
      );
    } else {
      toast.error('Număr de telefon indisponibil pentru acest prestator.');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <div>
              <Dialog.Title className="text-lg font-bold text-gray-900">
                Solicită Ofertă
              </Dialog.Title>
              <p className="text-sm text-gray-500 mt-0.5">{provider.name}</p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
              <FontAwesomeIcon icon={faXmark} className="text-gray-500 text-sm" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tip serviciu
              </label>
              <select
                value={form.serviceType}
                onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              >
                {provider.services?.length > 0
                  ? provider.services.map(s => <option key={s} value={s}>{s}</option>)
                  : <option value="">General</option>
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <FontAwesomeIcon icon={faCalendarDays} className="mr-1.5 text-emerald-500" />
                Perioadă dorită
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <FontAwesomeIcon icon={faComment} className="mr-1.5 text-emerald-500" />
                Detalii lucrare
              </label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Descrieți lucrarea, suprafața, cerințe speciale..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Anulează
              </button>
              <button type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                Trimite cererea
              </button>
            </div>
          </form>

        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

// ── Per-card wrapper ───────────────────────────────────────────
function ProviderCard({ provider, onNavigate }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex-shrink-0">
      <B2BFlipCard
        provider={provider}
        onRequestOffer={() => setModalOpen(true)}
        onNavigate={() => onNavigate('producator', provider.id)}
      />

      <RequestModal
        provider={provider}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

// ── Main Carousel ──────────────────────────────────────────────
export default function B2BProviderCarousel({ providers, onNavigate }) {
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
            <ProviderCard key={p.id} provider={p} onNavigate={onNavigate} />
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
