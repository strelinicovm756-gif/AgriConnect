import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faCalendarDays, faComment,
} from '@fortawesome/free-solid-svg-icons';
import { B2BFlipCard } from '../animate-ui/components/community/b2b-flip-card';

// ── Request Offer Modal ────────────────────────────────────────
function RequestModal({ provider, isOpen, onClose }) {
  const { t } = useLanguage();
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
          <p className="font-bold text-sm mb-1">{t.features.requestSentContact}</p>
          <p className="font-semibold">{provider.name}</p>
          <a href={`tel:${phone}`} className="text-emerald-500 underline text-base font-bold">
            {provider.phone}
          </a>
        </div>,
        { duration: 10000 }
      );
    } else {
      toast.error(t.features.phoneUnavailable);
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
                {t.features.requestQuote}
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
                {t.features.serviceType}
              </label>
              <select
                value={form.serviceType}
                onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              >
                {provider.services?.length > 0
                  ? provider.services.map(s => <option key={s} value={s}>{s}</option>)
                  : <option value="">{t.features.general}</option>
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <FontAwesomeIcon icon={faCalendarDays} className="mr-1.5 text-emerald-500" />
                {t.features.desiredPeriod}
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
                {t.features.workDetails}
              </label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder={t.features.workDetailsPlaceholder}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                {t.features.cancel}
              </button>
              <button type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                {t.features.sendRequest}
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
export default function B2BProviderCarousel({ providers, onNavigate, scrollRef }) {
  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto gap-5 py-4 items-start snap-x snap-mandatory"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {providers.slice(0, 8).map(p => (
        <ProviderCard key={p.id} provider={p} onNavigate={onNavigate} />
      ))}
    </div>
  );
}
