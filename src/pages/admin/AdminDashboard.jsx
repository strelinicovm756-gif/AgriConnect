import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLanguage } from '../../i18n/LanguageContext';
import { getCategoryName, getSubcategoryName } from '../../i18n/categoryTranslations';
import {
  faClockRotateLeft, faFlag, faLayerGroup, faUsers,
  faCheck, faXmark, faChevronRight, faSpinner, faSearch,
  faUserShield, faUser, faBan, faUnlock, faArrowRight, faArrowLeft,
  faPlus, faTrash, faPen, faFloppyDisk,
  faCircleCheck, faTriangleExclamation, faShoppingCart, faBoxOpen, faFileImage,
  faLocationDot, faCrown,
  faIndustry, faCalendarDays, faBell, faBuilding,
  faEye, faChevronLeft
} from '@fortawesome/free-solid-svg-icons';


const ROLE_LABELS = {
  user: { label: 'User', color: 'bg-gray-100 text-gray-700', icon: faUser },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700', icon: faUserShield },
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: faCrown },
};

const REPORT_REASONS = [
  'False / misleading content',
  'Abusive price',
  'Prohibited product',
  'Inappropriate images',
  'Spam / duplicate',
  'Other',
];

// Sub-componente helpers
function StatBadge({ icon, value, label, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colors[color]}`}>
      <FontAwesomeIcon icon={icon} className="text-sm" />
      <span className="font-bold text-base leading-none">{value}</span>
      <span className="text-xs opacity-70 font-medium">{label}</span>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${active ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
      <FontAwesomeIcon icon={icon} />
      <span>{label}</span>
      {badge > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <FontAwesomeIcon icon={icon} className="text-4xl mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// Queue de Aprobare
function ApprovalQueue({ userRole, onNavigate }) {
  const { t, lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_with_user')
        .select('*')
        .eq('status', filter)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setProducts(data || []);
    } catch (e) {
      toast.error(t.admin.loading);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    try {
      const { error } = await supabase.from('products').update({ status: 'active' }).eq('id', id);
      if (error) throw error;
      toast.success(t.admin.approve + '!');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error(t.admin.approve + ' error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.admin.deleteListingConfirm)) return;
    setActionLoading(id + '_delete');
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success(t.admin.delete + '!');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error(t.admin.delete + ' error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal + '_reject');
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'rejected', reject_reason: rejectReason || t.admin.rejectReasons[0] })
        .eq('id', rejectModal);
      if (error) throw error;
      toast.success(t.admin.reject + '!');
      setProducts(prev => prev.filter(p => p.id !== rejectModal));
      setRejectModal(null);
      setRejectReason('');
    } catch {
      toast.error(t.admin.reject + ' error');
    } finally {
      setActionLoading(null);
    }
  };

  const filterBtns = [
    { key: 'pending', label: t.admin.pending },
    { key: 'active', label: t.admin.approved },
    { key: 'rejected', label: t.admin.rejected },
  ];

  return (
    <div>
      {/* Filtre */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filterBtns.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${filter === f.key
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-600 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={faBoxOpen} message={t.admin.noProductsFound} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">{t.admin.image}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.product}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t.admin.location}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.price}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t.admin.date}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.status}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p, i) => (
                <tr key={p.id} className={`hover:bg-emerald-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                  <td className="px-3 py-2.5">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                          <FontAwesomeIcon icon={faFileImage} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <p className="font-semibold text-gray-900 truncate text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {getCategoryName(p.category?.toLowerCase().replace(/ /g, '-'), lang)}
                      {p.subcategory ? ` › ${getSubcategoryName(p.subcategory?.toLowerCase().replace(/ /g, '-'), lang)}` : ''}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap">{p.location || '—'}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">{p.price} lei/{p.unit}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('ro-RO')}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                      }`}>
                      {p.status === 'active' ? t.admin.active : p.status === 'rejected' ? t.admin.rejected : t.admin.pending}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => setPreviewProduct(p)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition">
                        <FontAwesomeIcon icon={faEye} />
                        {t.admin.details}
                      </button>
                      {filter === 'pending' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={actionLoading === p.id + '_approve'}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
                          >
                            {actionLoading === p.id + '_approve' ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
                            {t.admin.approve}
                          </button>
                          <button
                            onClick={() => { setRejectModal(p.id); setRejectReason(''); }}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition disabled:opacity-60"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                            {t.admin.reject}
                          </button>
                        </div>
                      )}
                      {filter === 'active' && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={actionLoading === p.id + '_delete'}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition disabled:opacity-60"
                        >
                          {actionLoading === p.id + '_delete' ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faTrash} />}
                          {t.admin.delete}
                        </button>
                      )}
                      {filter === 'rejected' && p.reject_reason && (
                        <p className="text-xs text-red-500 max-w-[140px] truncate" title={p.reject_reason}>
                          <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" />
                          {p.reject_reason}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal respingere */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faXmark} className="text-red-500" />
              {t.admin.rejectionReason}
            </h3>
            <div className="space-y-2 mb-4">
              {t.admin.rejectReasons.map(r => (
                <button
                  key={r}
                  onClick={() => setRejectReason(r)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition ${rejectReason === r ? 'bg-red-100 text-red-700 font-semibold' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              placeholder={t.admin.rejectionReasonPlaceholder}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectModal(null)} className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">{t.admin.cancel}</button>
              <button
                onClick={handleReject}
                disabled={actionLoading?.includes('_reject')}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {actionLoading?.includes('_reject') ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" /> : null}
                {t.admin.reject}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewProduct && (
        <ProductDetailModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

// Sistem de Flag-uri 
function FlagSystem() {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(full_name),
          product:products(name, category, image_url, status)
        `)
        .eq('status', filter)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setReports(data || []);
    } catch (e) {
      console.error(e);
      toast.error(t.admin.reportsTitle + ' error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (reportId, productId, action) => {
    setActionLoading(reportId + '_' + action);
    try {
      if (action === 'remove_product') {
        const { error: pe } = await supabase.from('products').update({ status: 'rejected' }).eq('id', productId);
        if (pe) throw pe;
      }
      const { error } = await supabase
        .from('reports')
        .update({ status: action === 'dismiss' ? 'dismissed' : 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', reportId);
      if (error) throw error;
      toast.success(action === 'dismiss' ? t.admin.dismissed : t.admin.resolved + '!');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch {
      toast.error(t.admin.reportsTitle + ' error');
    } finally {
      setActionLoading(null);
    }
  };

  const filterBtns = [
    { key: 'pending', label: t.admin.pending },
    { key: 'resolved', label: t.admin.resolved },
    { key: 'dismissed', label: t.admin.dismissed },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {filterBtns.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${filter === f.key ? 'bg-emerald-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-600 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState icon={faFlag} message={t.admin.noReportsFound} />
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-orange-300 transition">
              <div className="flex gap-4">
                {/* Imagine produs */}
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                  {r.product?.image_url ? (
                    <img src={r.product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <FontAwesomeIcon icon={faFileImage} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-bold text-gray-900">{r.product?.name || t.admin.deletedProduct}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.admin.category}: <span className="font-medium">{r.product?.category || '—'}</span>
                        {' · '}
                        {t.admin.reportedBy}: <span className="font-medium">{r.reporter?.full_name || t.admin.anonymous}</span>
                        {' · '}
                        {new Date(r.created_at).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-600'
                      }`}>
                      {r.status === 'pending' ? t.admin.pending : r.status === 'resolved' ? t.admin.resolved : t.admin.dismissed}
                    </span>
                  </div>

                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                    <p className="text-xs font-semibold text-orange-700 mb-0.5">{t.admin.reportReason}:</p>
                    <p className="text-sm text-orange-800">{r.reason}</p>
                    {r.description && <p className="text-xs text-orange-600 mt-1">{r.description}</p>}
                  </div>

                  {filter === 'pending' && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button
                        onClick={() => handleAction(r.id, r.product_id, 'remove_product')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-60"
                      >
                        <FontAwesomeIcon icon={faBan} />
                        {t.admin.removeProduct}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, r.product_id, 'resolve')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition disabled:opacity-60"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                        {t.admin.markResolved}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, r.product_id, 'dismiss')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-60"
                      >
                        <FontAwesomeIcon icon={faXmark} />
                        {t.admin.dismissReport}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Management Categorii 

// ── User Detail Modal ──────────────────────────────────────────
function UserDetailModal({ user, onClose, onNavigate }) {
  const { t } = useLanguage();
  const [userProducts, setUserProducts] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      setLoading(true);
      const [productsRes, eventsRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, status, price, unit, category, created_at, image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('event_subscriptions')
          .select('event_id, created_at, events(id, title, event_date, type, location_text)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      setUserProducts(productsRes.data || []);
      setUserEvents(eventsRes.data || []);
      setLoading(false);
    };
    fetchUserData();
  }, [user]);

  if (!user) return null;

  const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.user;
  const isBanned = user.role === 'banned';

  const EVENT_TYPE_COLORS = {
    iarmaroc: 'bg-emerald-100 text-emerald-700',
    curs_agricol: 'bg-blue-100 text-blue-700',
    piata_locala: 'bg-amber-100 text-amber-800',
  };


  {/*user*/ }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">



        {/* Header */}
        <div className="overflow-hidden flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black ${isBanned ? 'bg-red-400' : 'bg-emerald-500'}`}>
              {(user.full_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user.full_name || t.admin.noName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${isBanned ? 'bg-red-100 text-red-700' : roleInfo.color}`}>
                  <FontAwesomeIcon icon={isBanned ? faBan : roleInfo.icon} className="text-[10px]" />
                  {isBanned ? 'Banned' : roleInfo.label}
                </span>
                {user.is_verified && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                    <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />
                    {t.admin.verified}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar">

          <div className="p-8 space-y-6 ">


            {/* User info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t.admin.phone, value: user.phone },
                { label: t.admin.location, value: user.location },
                { label: t.admin.registered, value: user.created_at ? new Date(user.created_at).toLocaleDateString() : null },
              ].filter(i => i.value).map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <FontAwesomeIcon icon={faSpinner} className="text-2xl text-emerald-600 animate-spin" />
              </div>
            ) : (
              <>
                {/* User's products */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FontAwesomeIcon icon={faBoxOpen} />
                    {t.admin.product} ({userProducts.length})
                  </p>
                  {userProducts.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">{t.admin.noProductsFound}</p>
                  ) : (
                    <div className="space-y-2">
                      {userProducts.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                            {p.image_url
                              ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-gray-300"><FontAwesomeIcon icon={faFileImage} /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.category} · {p.price} lei/{p.unit}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                            {p.status === 'active' ? t.admin.active :
                              p.status === 'rejected' ? t.admin.rejected : t.admin.pending}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event subscriptions */}
                <div>
                  <p className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendarDays} />
                    {t.admin.events} ({userEvents.length})
                  </p>
                  {userEvents.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      {t.admin.noEventsYet}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userEvents.map(sub => {
                        const ev = sub.events;
                        if (!ev) return null;
                        return (
                          <div key={sub.event_id} className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <FontAwesomeIcon icon={faCalendarDays} className="text-blue-600 text-sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {ev.event_date && (
                                  <p className="text-xs text-gray-500">
                                    {new Date(ev.event_date).toLocaleDateString()}
                                  </p>
                                )}
                                {ev.location_text && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <FontAwesomeIcon icon={faLocationDot} className="text-[9px]" />
                                    {ev.location_text}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${EVENT_TYPE_COLORS[ev.type] || 'bg-gray-100 text-gray-600'}`}>
                              {ev.type === 'iarmaroc' ? t.admin.eventTypeFair
                                : ev.type === 'curs_agricol' ? t.admin.eventTypeCourse
                                  : t.admin.eventTypeMarket}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

          
        </div>

        {/* View profile button */}
          <div className=" p-4 flex justify-end pt-2 border-t border-gray-100">
            <button
              onClick={() => { onClose(); onNavigate('producator', user.id); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition"
            >
              <FontAwesomeIcon icon={faUser} />
              {t.admin.viewProfile}
            </button>
          </div>

      </div>
    </div>

  );
}

// ── Gestionare Utilizatori ─────────────────────────────────────
function UserManagement({ userRole, onNavigate }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, location, role, is_verified, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setUsers(data || []);
    } catch {
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (userId, newRole) => {
    if (userRole !== 'super_admin') return toast.error('Only Super Admin can change roles');
    setActionLoading(userId + '_role');
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated!');
    } catch {
      toast.error('Error changing role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async (userId, currentRole) => {
    if (userRole !== 'super_admin') return toast.error('Only Super Admin can ban users');
    const newRole = currentRole === 'banned' ? 'user' : 'banned';
    setActionLoading(userId + '_ban');
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(newRole === 'banned' ? 'User banned!' : 'User reactivated!');
    } catch {
      toast.error('Error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.full_name?.toLowerCase().includes(q) || u.location?.toLowerCase().includes(q);
  });

  if (userRole !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FontAwesomeIcon icon={faCrown} className="text-4xl mb-3 opacity-30" />
        <p className="text-sm">{t.admin.superAdminOnly}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.admin.search}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-600 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={faUsers} message={t.admin.noUsersFound} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">Av.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.name}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t.admin.phone}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t.admin.location}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.status}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t.admin.registered}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u, i) => {
                const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.user;
                const isBanned = u.role === 'banned';
                return (
                  <tr key={u.id} className={`transition-colors ${isBanned ? 'bg-red-50/60' : i % 2 === 1 ? 'bg-gray-50/40 hover:bg-emerald-50/20' : 'bg-white hover:bg-emerald-50/20'}`}>
                    <td className="px-3 py-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isBanned ? 'bg-red-400' : 'bg-emerald-500'}`}>
                        {(u.full_name || '?')[0].toUpperCase()}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900 text-sm">{u.full_name || t.admin.noName}</span>
                        {u.is_verified && <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 text-xs" title="Verificat" />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 hidden sm:table-cell">{u.phone || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 hidden md:table-cell">{u.location || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${isBanned ? 'bg-red-100 text-red-700' : roleInfo.color}`}>
                        <FontAwesomeIcon icon={isBanned ? faBan : roleInfo.icon} />
                        {isBanned ? 'Banned' : roleInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('ro-RO')}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5 items-center">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition">
                          <FontAwesomeIcon icon={faEye} />
                          {t.admin.details}
                        </button>
                        {!isBanned && u.role !== 'super_admin' && (
                          <select
                            value={u.role || 'user'}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            disabled={actionLoading === u.id + '_role'}
                            className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        )}
                        <button
                          onClick={() => handleBan(u.id, u.role)}
                          disabled={!!actionLoading || u.role === 'super_admin'}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${isBanned ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                        >
                          <FontAwesomeIcon icon={isBanned ? faUnlock : faBan} />
                          {isBanned ? t.admin.unban : t.admin.ban}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

// ── Management Evenimente ──────────────────────────────────────
async function geocodeLocation(locationText) {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationText)}.json?access_token=${MAPBOX_TOKEN}&country=md,ro&language=ro&limit=1`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].center;
      return { lat, lon, name: data.features[0].place_name };
    }
    return null;
  } catch { return null; }
}

async function reverseGeocode(lat, lon) {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&language=ro&limit=1`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const parts = data.features[0].place_name.split(', ');
      // Remove last segment (country)
      if (parts.length > 1) parts.pop();
      return parts.join(', ');
    }
    return null;
  } catch { return null; }
}

function EventManagement() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [subscriberCounts, setSubscriberCounts] = useState({});
  const [mapReady, setMapReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const eventMapRef = useRef(null);
  const eventMapContainerRef = useRef(null);
  const eventMarkerRef = useRef(null);
  const geocodeTimerRef = useRef(null);
  const imageInputRef = useRef(null);
  const [locationMode, setLocationMode] = useState('map'); // 'map' | 'manual'
  const [uploadingImage, setUploadingImage] = useState(false);

  const getNextHour = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const emptyForm = {
    title: '',
    description: '',
    type: 'iarmaroc',
    event_date: getNextHour(),
    end_date: '',
    location_text: '',
    latitude: '',
    longitude: '',
    schedule: '',
    image_url: '',
    is_published: true,
  };
  const [form, setForm] = useState(emptyForm);

  const loadSubscriberCounts = async (eventsList) => {
    if (!eventsList.length) return;
    const { data } = await supabase
      .from('event_subscriptions')
      .select('event_id')
      .in('event_id', eventsList.map(e => e.id));
    if (data) {
      const counts = {};
      data.forEach(row => {
        counts[row.event_id] = (counts[row.event_id] || 0) + 1;
      });
      setSubscriberCounts(counts);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
      loadSubscriberCounts(data || []);
    } catch {
      toast.error('Error loading events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showForm || locationMode !== 'map') {
      if (locationMode !== 'map' && eventMapRef.current) {
        eventMapRef.current.remove();
        eventMapRef.current = null;
        eventMarkerRef.current = null;
        setMapReady(false);
      }
      if (!showForm && eventMapRef.current) {
        eventMapRef.current.remove();
        eventMapRef.current = null;
        eventMarkerRef.current = null;
        setMapReady(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!eventMapContainerRef.current) return;
      if (eventMapRef.current) {
        eventMapRef.current.remove();
        eventMapRef.current = null;
        eventMarkerRef.current = null;
        setMapReady(false);
      }

      const initLat = form.latitude ? parseFloat(form.latitude) : 47.0105;
      const initLon = form.longitude ? parseFloat(form.longitude) : 28.8638;

      eventMapRef.current = new mapboxgl.Map({
        container: eventMapContainerRef.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [initLon, initLat],
        zoom: form.latitude ? 13 : 7,
      });

      eventMapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      const markerEl = document.createElement('div');
      markerEl.innerHTML = `
        <div style="cursor:pointer">
          <svg width="36" height="44" viewBox="0 0 40 50" fill="none">
            <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 30 20 30s20-15 20-30C40 8.95 31.05 0 20 0z" fill="#10b981"/>
            <circle cx="20" cy="20" r="8" fill="white"/>
            <circle cx="20" cy="20" r="5" fill="#10b981"/>
          </svg>
        </div>
      `;

      if (form.latitude && form.longitude) {
        eventMarkerRef.current = new mapboxgl.Marker({ element: markerEl, draggable: true })
          .setLngLat([parseFloat(form.longitude), parseFloat(form.latitude)])
          .addTo(eventMapRef.current);

        eventMarkerRef.current.on('dragend', async () => {
          const lngLat = eventMarkerRef.current.getLngLat();
          setForm(p => ({
            ...p,
            latitude: lngLat.lat.toFixed(6),
            longitude: lngLat.lng.toFixed(6),
          }));
          const address = await reverseGeocode(lngLat.lat, lngLat.lng);
          if (address) {
            setForm(p => ({ ...p, location_text: address }));
          }
        });
      }

      eventMapRef.current.on('click', async (e) => {
        const { lat, lng } = e.lngLat;
        setForm(p => ({
          ...p,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
        const address = await reverseGeocode(lat, lng);
        if (address) {
          setForm(p => ({ ...p, location_text: address }));
        }
        if (eventMarkerRef.current) {
          eventMarkerRef.current.setLngLat([lng, lat]);
        } else {
          const el = document.createElement('div');
          el.innerHTML = `
            <div style="cursor:pointer">
              <svg width="36" height="44" viewBox="0 0 40 50" fill="none">
                <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 30 20 30s20-15 20-30C40 8.95 31.05 0 20 0z" fill="#10b981"/>
                <circle cx="20" cy="20" r="8" fill="white"/>
                <circle cx="20" cy="20" r="5" fill="#10b981"/>
              </svg>
            </div>
          `;
          eventMarkerRef.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat])
            .addTo(eventMapRef.current);

          eventMarkerRef.current.on('dragend', async () => {
            const ll = eventMarkerRef.current.getLngLat();
            setForm(p => ({
              ...p,
              latitude: ll.lat.toFixed(6),
              longitude: ll.lng.toFixed(6),
            }));
            const address = await reverseGeocode(ll.lat, ll.lng);
            if (address) {
              setForm(p => ({ ...p, location_text: address }));
            }
          });
        }
      });

      setMapReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [showForm, locationMode]);

  useEffect(() => {
    if (!form.location_text.trim() || !mapReady || locationMode !== 'map') return;
    clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(async () => {
      setGeocoding(true);
      const result = await geocodeLocation(form.location_text);
      if (result && eventMapRef.current) {
        setForm(p => ({
          ...p,
          latitude: result.lat.toFixed(6),
          longitude: result.lon.toFixed(6),
        }));
        eventMapRef.current.flyTo({ center: [result.lon, result.lat], zoom: 13, duration: 1000 });
        if (eventMarkerRef.current) {
          eventMarkerRef.current.setLngLat([result.lon, result.lat]);
        } else {
          const el = document.createElement('div');
          el.innerHTML = `
            <div style="cursor:pointer">
              <svg width="36" height="44" viewBox="0 0 40 50" fill="none">
                <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 30 20 30s20-15 20-30C40 8.95 31.05 0 20 0z" fill="#10b981"/>
                <circle cx="20" cy="20" r="8" fill="white"/>
                <circle cx="20" cy="20" r="5" fill="#10b981"/>
              </svg>
            </div>
          `;
          eventMarkerRef.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([result.lon, result.lat])
            .addTo(eventMapRef.current);

          eventMarkerRef.current.on('dragend', () => {
            const ll = eventMarkerRef.current.getLngLat();
            setForm(p => ({
              ...p,
              latitude: ll.lat.toFixed(6),
              longitude: ll.lng.toFixed(6),
            }));
          });
        }
      }
      setGeocoding(false);
    }, 800);
    return () => clearTimeout(geocodeTimerRef.current);
  }, [form.location_text, mapReady, locationMode]);

  const openCreate = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setLocationMode('map');
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      type: ev.type || 'iarmaroc',
      event_date: ev.event_date ? ev.event_date.slice(0, 16) : '',
      end_date: ev.end_date ? ev.end_date.slice(0, 16) : '',
      location_text: ev.location_text || '',
      latitude: ev.latitude || '',
      longitude: ev.longitude || '',
      schedule: ev.schedule || '',
      image_url: ev.image_url || '',
      is_published: ev.is_published || false,
    });
    setLocationMode('map');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.event_date) return toast.error('Event date is required');
    setActionLoading('save');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        event_date: form.event_date || null,
        end_date: form.end_date || null,
        location_text: form.location_text.trim() || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        schedule: form.schedule.trim() || null,
        image_url: form.image_url.trim() || null,
        is_published: form.is_published,
      };
      if (editingEvent) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id);
        if (error) throw error;
        toast.success('Event updated!');
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
        toast.success('Event created!');
      }
      setShowForm(false);
      setEditingEvent(null);
      setForm(emptyForm);
      load();
    } catch {
      toast.error('Error saving event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (ev) => {
    setActionLoading(ev.id + '_publish');
    try {
      const newPublished = !ev.is_published;
      const updatePayload = {
        is_published: newPublished,
        ...(newPublished ? { notifications_sent: false } : {}),
      };
      const { error } = await supabase.from('events').update(updatePayload).eq('id', ev.id);
      if (error) throw error;
      toast.success(newPublished ? 'Event published!' : 'Event hidden!');
      load();
    } catch {
      toast.error('Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.admin.deleteEventConfirm)) return;
    setActionLoading(id + '_delete');
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      toast.success('Event deleted!');
      load();
    } catch {
      toast.error('Error deleting event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Select an image file (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `event_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('events')
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('events')
        .getPublicUrl(fileName);
      setForm(p => ({ ...p, image_url: urlData.publicUrl }));
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Error uploading image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const TYPE_CONFIG = {
    iarmaroc: { label: t.admin.eventTypeFair, color: 'bg-emerald-100 text-emerald-700' },
    curs_agricol: { label: t.admin.eventTypeCourse, color: 'bg-blue-100 text-blue-700' },
    piata_locala: { label: t.admin.eventTypeMarket, color: 'bg-amber-100 text-amber-800' },
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-sm text-gray-500">
          {t.admin.publishedEvents}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-nearby-events`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                  }
                );
                const data = await res.json();
                toast.success(`${t.admin.subscribersCount}: ${data.notificationsSent ?? 0}`);
              } catch {
                toast.error('Error sending notifications');
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-md"
          >
            <FontAwesomeIcon icon={faBell} />
            {t.admin.subscribersCount}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-md"
          >
            <FontAwesomeIcon icon={faPlus} />
            {t.admin.newEvent}
          </button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-600" />
                {editingEvent ? t.admin.editEvent : t.admin.newEvent}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingEvent(null); }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Titlu */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t.admin.eventTitle} <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={t.admin.eventTitlePlaceholder}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Tip + Publicat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.admin.eventType}</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  >
                    <option value="iarmaroc">{t.admin.eventTypeFair}</option>
                    <option value="curs_agricol">{t.admin.eventTypeCourse}</option>
                    <option value="piata_locala">{t.admin.eventTypeMarket}</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer w-full px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                    <div
                      onClick={() => setForm(p => ({ ...p, is_published: !p.is_published }))}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.is_published ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {form.is_published ? t.admin.published : t.admin.hidden}
                    </span>
                  </label>
                </div>
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t.admin.startDate} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.event_date}
                    onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.admin.endDate}</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {/* Location section with mode toggle */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    <FontAwesomeIcon icon={faLocationDot} className="text-emerald-500 mr-1.5" />
                    {t.admin.locationLabel}
                  </label>
                  {/* Toggle buttons */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setLocationMode('map')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${locationMode === 'map'
                          ? 'bg-white text-emerald-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {t.admin.mapMode}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode('manual')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${locationMode === 'manual'
                          ? 'bg-white text-emerald-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {t.admin.manualMode}
                    </button>
                  </div>
                </div>

                {/* Location text input — always visible */}
                <input
                  value={form.location_text}
                  onChange={e => setForm(p => ({ ...p, location_text: e.target.value }))}
                  placeholder={t.admin.locationPlaceholder}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl
                    text-sm text-gray-900 placeholder-gray-400
                    focus:outline-none focus:border-emerald-500 focus:bg-white
                    focus:ring-1 focus:ring-emerald-500 transition-all mb-3"
                />

                {/* MAP MODE — animated */}
                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: locationMode === 'map' ? '400px' : '0px',
                    opacity: locationMode === 'map' ? 1 : 0,
                    transition: 'max-height 0.35s ease-in-out, opacity 0.25s ease-in-out',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      {form.latitude && form.longitude ? (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <FontAwesomeIcon icon={faLocationDot} className="text-emerald-500 text-xs" />
                          {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {t.admin.clickMapToPin}
                        </span>
                      )}
                      {form.latitude && form.longitude && (
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, latitude: '', longitude: '' }))}
                          className="text-xs text-red-400 hover:text-red-600 transition"
                        >
                          {t.admin.removePinBtn}
                        </button>
                      )}
                    </div>

                    <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-100"
                      style={{ height: '240px' }}>
                      <div ref={eventMapContainerRef} className="w-full h-full" />

                      {geocoding && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm
                          px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 z-10">
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-emerald-600 text-xs" />
                          <span className="text-xs text-gray-600 font-medium">{t.admin.searching}</span>
                        </div>
                      )}

                      {!form.latitude && !geocoding && locationMode === 'map' && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2
                          bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5
                          rounded-full pointer-events-none z-10">
                          {t.admin.clickMapToPin}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 mb-1">
                      {t.admin.geocodingHint}
                    </p>
                  </div>
                </div>

                {/* MANUAL MODE — animated */}
                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: locationMode === 'manual' ? '200px' : '0px',
                    opacity: locationMode === 'manual' ? 1 : 0,
                    transition: 'max-height 0.35s ease-in-out, opacity 0.25s ease-in-out',
                  }}
                >
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={form.latitude}
                        onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))}
                        placeholder="ex: 47.0284"
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl
                          text-sm text-gray-900 placeholder-gray-400
                          focus:outline-none focus:border-emerald-500 focus:bg-white
                          focus:ring-1 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={form.longitude}
                        onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))}
                        placeholder="ex: 28.8575"
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl
                          text-sm text-gray-900 placeholder-gray-400
                          focus:outline-none focus:border-emerald-500 focus:bg-white
                          focus:ring-1 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                    <p className="col-span-2 text-xs text-gray-400">
                      {t.admin.googleMapsHint}
                      <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
                        className="text-emerald-600 underline ml-1">Google Maps</a>
                      → {t.admin.coordsHint}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Imagine eveniment */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t.admin.eventImage}
                </label>

                {!form.image_url ? (
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl
                      flex flex-col items-center justify-center gap-2 cursor-pointer
                      hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
                  >
                    {uploadingImage ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-emerald-600 text-xl" />
                        <p className="text-xs text-gray-500">{t.admin.uploadingImage}</p>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faFileImage} className="text-gray-300 text-2xl" />
                        <p className="text-sm font-medium text-gray-500">
                          {t.admin.clickToChooseImage}
                        </p>
                        <p className="text-xs text-gray-400">{t.admin.imageFormatHint}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-gray-100">
                    <img
                      src={form.image_url}
                      alt="preview"
                      className="w-full h-40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-red-500
                        text-white rounded-full flex items-center justify-center transition"
                    >
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/50
                        hover:bg-black/70 text-white text-xs rounded-lg transition"
                    >
                      {t.admin.changeImage}
                    </button>
                  </div>
                )}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Descriere */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.admin.descriptionLabel}</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder={t.admin.descriptionPlaceholder}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Program */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.admin.scheduleLabel}</label>
                <textarea
                  value={form.schedule}
                  onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))}
                  placeholder={t.admin.schedulePlaceholder}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); setEditingEvent(null); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                {t.admin.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === 'save'}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
              >
                {actionLoading === 'save'
                  ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  : <FontAwesomeIcon icon={faFloppyDisk} />
                }
                {editingEvent ? t.admin.saveChanges : t.admin.createEvent}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-600 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon={faCalendarDays} message={t.admin.noEventsYet} />
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const typeInfo = TYPE_CONFIG[ev.type] || TYPE_CONFIG.iarmaroc;
            return (
              <div key={ev.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 hover:border-emerald-200 transition">
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                  {ev.image_url ? (
                    <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <FontAwesomeIcon icon={faCalendarDays} className="text-white text-2xl opacity-60" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ev.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {ev.is_published ? `● ${t.admin.published}` : `○ ${t.admin.hidden}`}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleTogglePublish(ev)}
                        disabled={!!actionLoading}
                        title={ev.is_published ? 'Hide' : 'Publish'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${ev.is_published
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                      >
                        {ev.is_published ? t.admin.hidden : t.admin.published}
                      </button>
                      <button
                        onClick={() => openEdit(ev)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        disabled={actionLoading === ev.id + '_delete'}
                        className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50"
                      >
                        {actionLoading === ev.id + '_delete'
                          ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          : <FontAwesomeIcon icon={faTrash} />
                        }
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mt-1.5 truncate">{ev.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {ev.event_date && (
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-500" />
                        {new Date(ev.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {ev.end_date && ` — ${new Date(ev.end_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                      </span>
                    )}
                    {ev.location_text && (
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faLocationDot} className="text-emerald-700" />
                        {ev.location_text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Product Detail Modal ───────────────────────────────────────
function ProductDetailModal({ product, onClose, onNavigate }) {
  const { t } = useLanguage();
  const [imgIdx, setImgIdx] = useState(0);
  if (!product) return null;

  const images = [product.image_url, ...(product.gallery_images || [])].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">ID: {product.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Image gallery */}
          {images.length > 0 && (
            <div>
              <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ height: '280px' }}>
                <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} disabled={imgIdx === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow disabled:opacity-30 transition">
                      <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                    </button>
                    <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))} disabled={imgIdx === images.length - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow disabled:opacity-30 transition">
                      <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button key={i} onClick={() => setImgIdx(i)}
                          className={`w-2 h-2 rounded-full transition ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${i === imgIdx ? 'border-emerald-500' : 'border-gray-200'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Product details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.admin.category, value: product.category },
              { label: t.admin.price, value: product.price ? `${product.price} lei / ${product.unit || '—'}` : null },
              { label: t.admin.location, value: product.location },
              { label: t.admin.status, value: product.status },
              { label: t.common.negotiable, value: product.is_negotiable ? 'Da' : 'Nu' },
              { label: t.admin.date, value: product.created_at ? new Date(product.created_at).toLocaleDateString('ro-RO') : null },
            ].filter(item => item.value).map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5 capitalize">{value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t.admin.descriptionLabel}</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Reject reason */}
          {product.reject_reason && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">{t.admin.rejectionReason}</p>
              <p className="text-sm text-red-700">{product.reject_reason}</p>
            </div>
          )}

          {/* Seller info */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{t.admin.product}</p>
              <p className="text-sm font-bold text-gray-900">{product.seller_name || '—'}</p>
              <p className="text-xs text-gray-500">{product.seller_phone || '—'}</p>
            </div>
            <button
              onClick={() => { onClose(); onNavigate('producator', product.user_id); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition">
              <FontAwesomeIcon icon={faUser} />
              {t.admin.viewProfile}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── B2B Management ─────────────────────────────────────────────
function B2BManagement({ onStatsChange }) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, idno, b2b_verified, b2b_requested_at, location')
        .not('idno', 'is', null)
        .order('b2b_requested_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      toast.error(t.admin.providerRequests + ' error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleVerify = async (profileId) => {
    setActionLoading(profileId + '_verify');
    const { error } = await supabase.from('profiles').update({ b2b_verified: true }).eq('id', profileId);
    if (!error) {
      toast.success(t.admin.verified + '!');
      setRequests(prev => prev.map(r => r.id === profileId ? { ...r, b2b_verified: true } : r));
      onStatsChange?.();
    } else {
      toast.error(t.admin.verifyBtn + ' error');
    }
    setActionLoading(null);
  };

  const handleRevoke = async (profileId) => {
    setActionLoading(profileId + '_revoke');
    const { error } = await supabase.from('profiles').update({ b2b_verified: false }).eq('id', profileId);
    if (!error) {
      toast.success(t.admin.revokeBtn + '!');
      setRequests(prev => prev.map(r => r.id === profileId ? { ...r, b2b_verified: false } : r));
      onStatsChange?.();
    } else {
      toast.error(t.admin.revokeBtn + ' error');
    }
    setActionLoading(null);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-600 animate-spin" />
    </div>
  );

  if (requests.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <FontAwesomeIcon icon={faBuilding} className="text-5xl mb-4 opacity-20" />
      <p className="font-medium">{t.admin.noProviderRequests}</p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-left">
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.name}</th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.company}</th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.idno}</th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t.admin.location}</th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t.admin.requestedAt}</th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.status}</th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requests.map(r => (
            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-3 font-medium text-gray-900">{r.full_name || '—'}</td>
              <td className="px-3 py-3 text-gray-700">{r.company_name || '—'}</td>
              <td className="px-3 py-3 font-mono text-xs text-gray-600">{r.idno}</td>
              <td className="px-3 py-3 text-gray-500 hidden md:table-cell">{r.location || '—'}</td>
              <td className="px-3 py-3 text-gray-400 text-xs hidden lg:table-cell">
                {r.b2b_requested_at ? new Date(r.b2b_requested_at).toLocaleDateString('ro-RO') : '—'}
              </td>
              <td className="px-3 py-3">
                {r.b2b_verified ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" /> {t.admin.verified}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {t.admin.waitingVerification}
                  </span>
                )}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  {!r.b2b_verified ? (
                    <button
                      onClick={() => handleVerify(r.id)}
                      disabled={actionLoading === r.id + '_verify'}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {actionLoading === r.id + '_verify' ? '...' : t.admin.verifyBtn}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRevoke(r.id)}
                      disabled={actionLoading === r.id + '_revoke'}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {actionLoading === r.id + '_revoke' ? '...' : t.admin.revokeBtn}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main AdminDashboard ────────────────────────────────────────
export default function AdminDashboard({ session, onNavigate }) {
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('approvals');
  const [stats, setStats] = useState({ pending: 0, reports: 0, users: 0, subscriptions: 0, b2bPending: 0 });

  useEffect(() => {
    if (!session) { onNavigate('home'); return; }
    loadRoleAndStats();
  }, [session]);

  const loadRoleAndStats = async () => {
    try {
      const [profileRes, pendingRes, reportsRes, usersRes, subsRes, b2bRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle(),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('event_subscriptions').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).not('idno', 'is', null).eq('b2b_verified', false),
      ]);

      const role = profileRes.data?.role;
      if (!role || !['admin', 'super_admin'].includes(role)) {
        toast.error('Access denied');
        onNavigate('home');
        return;
      }
      setUserRole(role);
      setStats({
        pending: pendingRes.count || 0,
        reports: reportsRes.count || 0,
        users: usersRes.count || 0,
        subscriptions: subsRes.count || 0,
        b2bPending: b2bRes.count || 0,
      });
    } catch {
      toast.error('Error verifying access');
      onNavigate('home');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!userRole) return null;

  const tabs = [
    { key: 'approvals', label: t.admin.products, icon: faClockRotateLeft, badge: stats.pending },
    { key: 'flags', label: t.admin.reports, icon: faFlag, badge: stats.reports },
    { key: 'events', label: t.admin.events, icon: faCalendarDays, badge: 0 },
    { key: 'users', label: t.admin.users, icon: faUsers, badge: 0 },
    { key: 'b2b', label: t.admin.providerRequests, icon: faBuilding, badge: stats.b2bPending },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 flex-wrap sm:flex-nowrap">
          {tabs.map(t => (
            <TabBtn
              key={t.key}
              active={activeTab === t.key}
              onClick={() => setActiveTab(t.key)}
              icon={t.icon}
              label={t.label}
              badge={t.badge}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-50 rounded-2xl">
          {activeTab === 'approvals' && <ApprovalQueue userRole={userRole} onNavigate={onNavigate} />}
          {activeTab === 'flags' && <FlagSystem />}
          {activeTab === 'events' && <EventManagement />}
          {activeTab === 'users' && <UserManagement userRole={userRole} onNavigate={onNavigate} />}
          {activeTab === 'b2b' && <B2BManagement onStatsChange={() => loadRoleAndStats()} />}
        </div>
      </div>
    </div>
  );
}
