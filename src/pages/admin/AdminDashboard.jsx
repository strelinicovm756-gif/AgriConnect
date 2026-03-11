import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved, faClockRotateLeft, faFlag, faLayerGroup, faUsers,
  faCheck, faXmark, faEye, faChevronRight, faSpinner, faSearch,
  faUserShield, faUser, faBan, faUnlock, faArrowRight, faArrowLeft,
  faPlus, faTrash, faPen, faFloppyDisk, faRotateLeft, faStar,
  faCircleCheck, faTriangleExclamation, faBoxOpen, faFileImage,
  faLocationDot, faTag, faCalendar, faCrown, faUserTie,
  faCartShopping, faIndustry
} from '@fortawesome/free-solid-svg-icons';

// ── Structura categorii implicită ──────────────────────────────
const DEFAULT_CATEGORIES = {
  b2c: [
    { id: 'Legume', name: 'Legume', subs: ['Rădăcinoase', 'Verzișuri', 'Roșii & Ardei', 'Dovlecei & Castraveți', 'Altele'] },
    { id: 'Fructe', name: 'Fructe', subs: ['Mere & Pere', 'Fructe de pădure', 'Citrice', 'Struguri', 'Altele'] },
    { id: 'Lactate', name: 'Lactate', subs: ['Lapte', 'Brânzeturi', 'Smântână & Unt', 'Iaurt', 'Altele'] },
    { id: 'Carne', name: 'Carne', subs: ['Carne de porc', 'Carne de vită', 'Pasăre', 'Mezeluri artizanale', 'Altele'] },
    { id: 'Ouă', name: 'Ouă', subs: ['Ouă de găină', 'Ouă de rață', 'Ouă de prepeliță', 'Altele'] },
    { id: 'Miere', name: 'Miere', subs: ['Miere de flori', 'Miere de salcâm', 'Miere de tei', 'Produse apicole', 'Altele'] },
    { id: 'Cereale', name: 'Cereale', subs: ['Grâu', 'Porumb', 'Floarea-soarelui', 'Orz & Ovăz', 'Altele'] },
  ],
  b2b: [
    { id: 'Servicii Teren', name: 'Servicii Teren', subs: ['Arat & Prelucrare sol', 'Semănat', 'Recoltare mecanizată', 'Transport agricol', 'Altele'] },
    { id: 'Protecția Plantelor', name: 'Protecția Plantelor', subs: ['Pesticide', 'Erbicide', 'Îngrășăminte organice', 'Fungicide', 'Altele'] },
    { id: 'Echipamente', name: 'Echipamente', subs: ['Unelte manuale', 'Piese schimb utilaje', 'Utilaje second-hand', 'Altele'] },
    { id: 'Sisteme de Irigare', name: 'Sisteme de Irigare', subs: ['Sisteme picurare', 'Pompe apă', 'Furtunuri & Accesorii', 'Altele'] },
  ]
};

const ROLE_LABELS = {
  user: { label: 'Utilizator', color: 'bg-gray-100 text-gray-700', icon: faUser },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700', icon: faUserShield },
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: faCrown },
};

const REPORT_REASONS = [
  'Conținut fals / înșelător',
  'Preț abuziv',
  'Produs interzis',
  'Imagini neadecvate',
  'Spam / duplicat',
  'Altele',
];

// ── Sub-componente helpers ─────────────────────────────────────
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
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
        active ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
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

// ── Queue de Aprobare ──────────────────────────────────────────
function ApprovalQueue({ userRole }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null); // product id
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

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
      toast.error('Eroare la încărcarea produselor');
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
      toast.success('Produs aprobat!');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error('Eroare la aprobare');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ești sigur că vrei să ștergi definitiv acest anunț?')) return;
    setActionLoading(id + '_delete');
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Anunț șters!');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error('Eroare la ștergere');
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
        .update({ status: 'rejected', reject_reason: rejectReason || 'Neconform cu regulamentul platformei' })
        .eq('id', rejectModal);
      if (error) throw error;
      toast.success('Produs respins!');
      setProducts(prev => prev.filter(p => p.id !== rejectModal));
      setRejectModal(null);
      setRejectReason('');
    } catch {
      toast.error('Eroare la respingere');
    } finally {
      setActionLoading(null);
    }
  };

  const filterBtns = [
    { key: 'pending', label: 'În așteptare' },
    { key: 'active', label: 'Aprobate' },
    { key: 'rejected', label: 'Respinse' },
  ];

  return (
    <div>
      {/* Filtre */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filterBtns.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              filter === f.key
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
        <EmptyState icon={faBoxOpen} message={`Niciun produs ${filter === 'pending' ? 'în așteptare' : filter === 'active' ? 'aprobat' : 'respins'}`} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Img</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produs</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vânzător</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Locație</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preț</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Data</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acțiuni</th>
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
                    <p className="text-xs text-gray-400 truncate">{p.category}{p.subcategory ? ` › ${p.subcategory}` : ''}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{p.full_name || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap">{p.location || '—'}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">{p.price} lei/{p.unit}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('ro-RO')}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      p.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.status === 'active' ? 'Activ' : p.status === 'rejected' ? 'Respins' : 'Așteptare'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {filter === 'pending' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleApprove(p.id)}
                          disabled={actionLoading === p.id + '_approve'}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
                        >
                          {actionLoading === p.id + '_approve' ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
                          Aprobă
                        </button>
                        <button
                          onClick={() => { setRejectModal(p.id); setRejectReason(''); }}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition disabled:opacity-60"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                          Respinge
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
                        Șterge
                      </button>
                    )}
                    {filter === 'rejected' && p.reject_reason && (
                      <p className="text-xs text-red-500 max-w-[140px] truncate" title={p.reject_reason}>
                        <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" />
                        {p.reject_reason}
                      </p>
                    )}
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
              Motiv respingere
            </h3>
            <div className="space-y-2 mb-4">
              {['Neconform cu regulamentul platformei', 'Produs interzis', 'Imagini neadecvate', 'Descriere falsă / înșelătoare', 'Preț abuziv'].map(r => (
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
              placeholder="Sau scrie un motiv personalizat..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectModal(null)} className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">Anulează</button>
              <button
                onClick={handleReject}
                disabled={actionLoading?.includes('_reject')}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {actionLoading?.includes('_reject') ? <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" /> : null}
                Respinge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sistem de Flag-uri ─────────────────────────────────────────
function FlagSystem() {
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
      toast.error('Eroare la încărcarea raportărilor');
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
      toast.success(action === 'dismiss' ? 'Raportare respinsă' : 'Raportare rezolvată!');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch {
      toast.error('Eroare la procesarea raportării');
    } finally {
      setActionLoading(null);
    }
  };

  const filterBtns = [
    { key: 'pending', label: 'În așteptare' },
    { key: 'resolved', label: 'Rezolvate' },
    { key: 'dismissed', label: 'Respinse' },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {filterBtns.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              filter === f.key ? 'bg-emerald-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
        <EmptyState icon={faFlag} message="Nicio raportare în această categorie" />
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
                      <h3 className="font-bold text-gray-900">{r.product?.name || 'Produs șters'}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Categorie: <span className="font-medium">{r.product?.category || '—'}</span>
                        {' · '}
                        Raportat de: <span className="font-medium">{r.reporter?.full_name || 'Anonim'}</span>
                        {' · '}
                        {new Date(r.created_at).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {r.status === 'pending' ? 'În așteptare' : r.status === 'resolved' ? 'Rezolvat' : 'Respins'}
                    </span>
                  </div>

                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                    <p className="text-xs font-semibold text-orange-700 mb-0.5">Motiv raportare:</p>
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
                        Elimină produsul
                      </button>
                      <button
                        onClick={() => handleAction(r.id, r.product_id, 'resolve')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition disabled:opacity-60"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                        Marchează rezolvat
                      </button>
                      <button
                        onClick={() => handleAction(r.id, r.product_id, 'dismiss')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-60"
                      >
                        <FontAwesomeIcon icon={faXmark} />
                        Respinge raportarea
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

// ── Management Categorii ───────────────────────────────────────
function CategoryManagement() {
  const [categories, setCategories] = useState({ b2c: [], b2b: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [newSubInput, setNewSubInput] = useState({ catId: null, group: null, value: '' });
  const [newCatInput, setNewCatInput] = useState({ group: null, value: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'categories')
        .maybeSingle();
      if (data?.value) {
        setCategories(data.value);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markDirty = (updated) => {
    setCategories(updated);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_config')
        .upsert({ key: 'categories', value: categories, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Categorii salvate!');
      setDirty(false);
    } catch {
      toast.error('Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCategories(DEFAULT_CATEGORIES);
    setDirty(true);
  };

  const moveCategory = (catId, fromGroup, toGroup) => {
    const cat = categories[fromGroup].find(c => c.id === catId);
    if (!cat) return;
    markDirty({
      ...categories,
      [fromGroup]: categories[fromGroup].filter(c => c.id !== catId),
      [toGroup]: [...categories[toGroup], cat],
    });
  };

  const deleteCategory = (catId, group) => {
    markDirty({ ...categories, [group]: categories[group].filter(c => c.id !== catId) });
  };

  const addSubcategory = (catId, group) => {
    const val = newSubInput.value.trim();
    if (!val) return;
    markDirty({
      ...categories,
      [group]: categories[group].map(c =>
        c.id === catId ? { ...c, subs: [...(c.subs || []), val] } : c
      ),
    });
    setNewSubInput({ catId: null, group: null, value: '' });
  };

  const deleteSubcategory = (catId, group, sub) => {
    markDirty({
      ...categories,
      [group]: categories[group].map(c =>
        c.id === catId ? { ...c, subs: c.subs.filter(s => s !== sub) } : c
      ),
    });
  };

  const addCategory = (group) => {
    const val = newCatInput.value.trim();
    if (!val) return;
    const newCat = { id: val, name: val, subs: ['Altele'] };
    markDirty({ ...categories, [group]: [...categories[group], newCat] });
    setNewCatInput({ group: null, value: '' });
  };

  const renderGroup = (group, title, color) => (
    <div className={`border-2 rounded-2xl p-5 ${color}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <span className="text-xs bg-white px-2 py-1 rounded-full font-semibold text-gray-600">{categories[group]?.length || 0} categorii</span>
      </div>

      <div className="space-y-3">
        {(categories[group] || []).map(cat => {
          const isExpanded = expandedCat === cat.id + '_' + group;
          const otherGroup = group === 'b2c' ? 'b2b' : 'b2c';
          return (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id + '_' + group)}
                  className="flex-1 text-left flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faChevronRight} className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  <span className="font-semibold text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-400">({cat.subs?.length || 0} sub.)</span>
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveCategory(cat.id, group, otherGroup)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      group === 'b2c' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                    title={`Mută în ${group === 'b2c' ? 'B2B' : 'B2C'}`}
                  >
                    {group === 'b2c' ? <FontAwesomeIcon icon={faArrowRight} /> : <FontAwesomeIcon icon={faArrowLeft} />}
                    <span className="hidden sm:inline">{group === 'b2c' ? 'B2B' : 'B2C'}</span>
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id, group)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition text-xs"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 mt-3">
                    {cat.subs?.map(sub => (
                      <span key={sub} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                        {sub}
                        <button onClick={() => deleteSubcategory(cat.id, group, sub)} className="text-gray-400 hover:text-red-500 transition ml-1">
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {newSubInput.catId === cat.id && newSubInput.group === group ? (
                    <div className="flex gap-2 mt-3">
                      <input
                        autoFocus
                        value={newSubInput.value}
                        onChange={e => setNewSubInput(prev => ({ ...prev, value: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addSubcategory(cat.id, group)}
                        placeholder="Nume subcategorie..."
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <button onClick={() => addSubcategory(cat.id, group)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition">
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                      <button onClick={() => setNewSubInput({ catId: null, group: null, value: '' })} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition">
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewSubInput({ catId: cat.id, group, value: '' })}
                      className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Adaugă subcategorie
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Adaugă categorie nouă */}
        {newCatInput.group === group ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newCatInput.value}
              onChange={e => setNewCatInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addCategory(group)}
              placeholder="Nume categorie nouă..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            />
            <button onClick={() => addCategory(group)} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition">
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button onClick={() => setNewCatInput({ group: null, value: '' })} className="px-4 py-2.5 bg-white text-gray-600 rounded-xl text-sm hover:bg-gray-100 transition">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNewCatInput({ group, value: '' })}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:border-emerald-400 hover:text-emerald-600 transition"
          >
            <FontAwesomeIcon icon={faPlus} />
            Adaugă categorie
          </button>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center py-16"><FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-600 animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-sm text-gray-500">Modificările se salvează în baza de date și afectează formularul de adăugare produse.</p>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
          >
            <FontAwesomeIcon icon={faRotateLeft} />
            Reset implicit
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} />}
            Salvează
          </button>
        </div>
      </div>

      {dirty && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          Ai modificări nesalvate. Apasă "Salvează" pentru a le aplica.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderGroup('b2c', <span className="flex items-center gap-2"><FontAwesomeIcon icon={faCartShopping} className="text-emerald-600" /> B2C — Produse Alimentare</span>, 'border-emerald-200 bg-emerald-50/30')}
        {renderGroup('b2b', <span className="flex items-center gap-2"><FontAwesomeIcon icon={faIndustry} className="text-blue-600" /> B2B — Servicii &amp; Utilități</span>, 'border-blue-200 bg-blue-50/30')}
      </div>
    </div>
  );
}

// ── Gestionare Utilizatori ─────────────────────────────────────
function UserManagement({ userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

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
      toast.error('Eroare la încărcarea utilizatorilor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (userId, newRole) => {
    if (userRole !== 'super_admin') return toast.error('Doar Super Admin poate schimba rolurile');
    setActionLoading(userId + '_role');
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Rol actualizat!');
    } catch {
      toast.error('Eroare la schimbarea rolului');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async (userId, currentRole) => {
    if (userRole !== 'super_admin') return toast.error('Doar Super Admin poate bana utilizatori');
    const newRole = currentRole === 'banned' ? 'user' : 'banned';
    setActionLoading(userId + '_ban');
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(newRole === 'banned' ? 'Utilizator banat!' : 'Utilizator reactivat!');
    } catch {
      toast.error('Eroare');
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
        <p className="text-sm">Această secțiune este accesibilă doar Super Adminilor</p>
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
          placeholder="Caută utilizatori după nume sau localitate..."
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-600 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={faUsers} message="Niciun utilizator găsit" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">Av.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nume</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Telefon</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Locație</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Înregistrat</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acțiuni</th>
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
                        <span className="font-semibold text-gray-900 text-sm">{u.full_name || 'Fără nume'}</span>
                        {u.is_verified && <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 text-xs" title="Verificat" />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 hidden sm:table-cell">{u.phone || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 hidden md:table-cell">{u.location || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${isBanned ? 'bg-red-100 text-red-700' : roleInfo.color}`}>
                        <FontAwesomeIcon icon={isBanned ? faBan : roleInfo.icon} />
                        {isBanned ? 'Banat' : roleInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('ro-RO')}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5 items-center">
                        {!isBanned && u.role !== 'super_admin' && (
                          <select
                            value={u.role || 'user'}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            disabled={actionLoading === u.id + '_role'}
                            className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                          >
                            <option value="user">Utilizator</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        )}
                        <button
                          onClick={() => handleBan(u.id, u.role)}
                          disabled={!!actionLoading || u.role === 'super_admin'}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                            isBanned ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          <FontAwesomeIcon icon={isBanned ? faUnlock : faBan} />
                          {isBanned ? 'Reactivează' : 'Banează'}
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
    </div>
  );
}

// ── Main AdminDashboard ────────────────────────────────────────
export default function AdminDashboard({ session, onNavigate }) {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('approvals');
  const [stats, setStats] = useState({ pending: 0, reports: 0, users: 0 });

  useEffect(() => {
    if (!session) { onNavigate('home'); return; }
    loadRoleAndStats();
  }, [session]);

  const loadRoleAndStats = async () => {
    try {
      const [profileRes, pendingRes, reportsRes, usersRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle(),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      const role = profileRes.data?.role;
      if (!role || !['admin', 'super_admin'].includes(role)) {
        toast.error('Acces interzis');
        onNavigate('home');
        return;
      }
      setUserRole(role);
      setStats({
        pending: pendingRes.count || 0,
        reports: reportsRes.count || 0,
        users: usersRes.count || 0,
      });
    } catch {
      toast.error('Eroare la verificarea accesului');
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
    { key: 'approvals', label: 'Queue Aprobare', icon: faClockRotateLeft, badge: stats.pending },
    { key: 'flags', label: 'Raportări', icon: faFlag, badge: stats.reports },
    { key: 'categories', label: 'Categorii', icon: faLayerGroup, badge: 0 },
    { key: 'users', label: 'Utilizatori', icon: faUsers, badge: 0 },
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
          {activeTab === 'approvals' && <ApprovalQueue userRole={userRole} />}
          {activeTab === 'flags' && <FlagSystem />}
          {activeTab === 'categories' && <CategoryManagement />}
          {activeTab === 'users' && <UserManagement userRole={userRole} />}
        </div>
      </div>
    </div>
  );
}
