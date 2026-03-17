import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClockRotateLeft, faFlag, faLayerGroup, faUsers,
  faCheck, faXmark, faChevronRight, faSpinner, faSearch,
  faUserShield, faUser, faBan, faUnlock, faArrowRight, faArrowLeft,
  faPlus, faTrash, faPen, faFloppyDisk,
  faCircleCheck, faTriangleExclamation, faBoxOpen, faFileImage,
  faLocationDot, faCrown,
  faCartShopping, faIndustry, faCalendarDays
} from '@fortawesome/free-solid-svg-icons';


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

// Queue de Aprobare
function ApprovalQueue({ userRole }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null);
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

// Sistem de Flag-uri 
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

// Management Categorii 
function CategoryManagement() {
  const [b2cCategories, setB2cCategories] = useState([]);
  const [b2bCategories, setB2bCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState(null);
  const [newSubInput, setNewSubInput] = useState({ catId: null, group: null, value: '' });
  const [newCatInput, setNewCatInput] = useState({ group: null, value: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, subcategories(id, name, slug, sort_order, is_active)')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      setB2cCategories(data.filter(c => c.market_type !== 'b2b'));
      setB2bCategories(data.filter(c => c.market_type !== 'b2c'));
    } catch {
      toast.error('Eroare la încărcarea categoriilor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddCategory = async (group, name) => {
    if (!name.trim()) return;
    const slug = name.trim().toLowerCase()
      .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
      .replace(/ș/g, 's').replace(/ț/g, 't')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const market_type = group === 'b2c' ? 'b2c' : 'b2b';
    const maxOrder = b2cCategories.length + b2bCategories.length + 1;
    try {
      const { error } = await supabase.from('categories').insert({
        name: name.trim(), slug, market_type, sort_order: maxOrder, is_active: true,
      });
      if (error) throw error;
      toast.success('Categorie adăugată!');
      setNewCatInput({ group: null, value: '' });
      load();
    } catch (e) {
      toast.error(e.message.includes('unique') ? 'Această categorie există deja' : 'Eroare la adăugare');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Ștergi această categorie? Produsele asociate nu vor fi afectate.')) return;
    try {
      const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', catId);
      if (error) throw error;
      toast.success('Categorie dezactivată!');
      load();
    } catch {
      toast.error('Eroare la ștergere');
    }
  };

  const handleMoveCategory = async (catId, toGroup) => {
    try {
      const { error } = await supabase.from('categories').update({ market_type: toGroup }).eq('id', catId);
      if (error) throw error;
      toast.success('Categorie mutată!');
      load();
    } catch {
      toast.error('Eroare la mutare');
    }
  };

  const handleAddSubcategory = async (catId, name) => {
    if (!name.trim()) return;
    const slug = name.trim().toLowerCase()
      .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
      .replace(/ș/g, 's').replace(/ț/g, 't')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      const { error } = await supabase.from('subcategories').insert({
        category_id: catId, name: name.trim(), slug, sort_order: 0, is_active: true,
      });
      if (error) throw error;
      toast.success('Subcategorie adăugată!');
      setNewSubInput({ catId: null, group: null, value: '' });
      load();
    } catch (e) {
      toast.error(e.message.includes('unique') ? 'Subcategoria există deja' : 'Eroare la adăugare');
    }
  };

  const handleDeleteSubcategory = async (subId) => {
    try {
      const { error } = await supabase.from('subcategories').update({ is_active: false }).eq('id', subId);
      if (error) throw error;
      toast.success('Subcategorie eliminată!');
      load();
    } catch {
      toast.error('Eroare la ștergere');
    }
  };

  const renderGroup = (group, categoriesArray, title) => (
    <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${group === 'b2c' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
          <FontAwesomeIcon
            icon={group === 'b2c' ? faCartShopping : faIndustry}
            className={`text-base ${group === 'b2c' ? 'text-emerald-600' : 'text-blue-600'}`}
          />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-tight">{title}</h3>
          <span className="text-xs font-medium text-gray-400">
            {categoriesArray?.length || 0} categorii
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {categoriesArray.map(cat => {
          const isExpanded = expandedCat === cat.id + '_' + group;
          const otherGroup = group === 'b2c' ? 'b2b' : 'b2c';
          const subs = (cat.subcategories || []).filter(s => s.is_active);
          return (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all duration-200">
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Grab handle — decorative only */}
                <div className="flex flex-col gap-0.5 flex-shrink-0 cursor-grab opacity-30 hover:opacity-60 transition-opacity">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                  </div>
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                  </div>
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                  </div>
                </div>
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id + '_' + group)}
                  className="flex-1 text-left flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faChevronRight} className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  <span className="font-semibold text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-400">({subs.length} sub.)</span>
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleMoveCategory(cat.id, otherGroup)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition text-xs"
                    title={`Mută în ${group === 'b2c' ? 'B2B' : 'B2C'}`}
                  >
                    {group === 'b2c' ? <FontAwesomeIcon icon={faArrowRight} /> : <FontAwesomeIcon icon={faArrowLeft} />}
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition text-xs"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 mt-3">
                    {subs.map(sub => (
                      <span key={sub.id} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                        {sub.name}
                        <button onClick={() => handleDeleteSubcategory(sub.id)} className="text-gray-400 hover:text-red-500 transition ml-1">
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
                        onKeyDown={e => e.key === 'Enter' && handleAddSubcategory(cat.id, newSubInput.value)}
                        placeholder="Nume subcategorie..."
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <button onClick={() => handleAddSubcategory(cat.id, newSubInput.value)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition">
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
              onKeyDown={e => e.key === 'Enter' && handleAddCategory(group, newCatInput.value)}
              placeholder="Nume categorie nouă..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            />
            <button onClick={() => handleAddCategory(group, newCatInput.value)} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition">
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button onClick={() => setNewCatInput({ group: null, value: '' })} className="px-4 py-2.5 bg-white text-gray-600 rounded-xl text-sm hover:bg-gray-100 transition">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNewCatInput({ group, value: '' })}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all duration-200"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderGroup('b2c', b2cCategories, <span className="flex items-center gap-2">Produse Alimentare</span>)}
        {renderGroup('b2b', b2bCategories, <span className="flex items-center gap-2">Servicii &amp; Utilități</span>)}
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch {
      toast.error('Eroare la încărcarea evenimentelor');
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
    if (!form.title.trim()) return toast.error('Titlul este obligatoriu');
    if (!form.event_date) return toast.error('Data evenimentului este obligatorie');
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
        toast.success('Eveniment actualizat!');
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
        toast.success('Eveniment creat!');
      }
      setShowForm(false);
      setEditingEvent(null);
      setForm(emptyForm);
      load();
    } catch {
      toast.error('Eroare la salvare');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (ev) => {
    setActionLoading(ev.id + '_publish');
    try {
      const { error } = await supabase.from('events').update({ is_published: !ev.is_published }).eq('id', ev.id);
      if (error) throw error;
      toast.success(ev.is_published ? 'Eveniment ascuns!' : 'Eveniment publicat!');
      load();
    } catch {
      toast.error('Eroare');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ștergi definitiv acest eveniment?')) return;
    setActionLoading(id + '_delete');
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      toast.success('Eveniment șters!');
      load();
    } catch {
      toast.error('Eroare la ștergere');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selectează un fișier imagine (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imaginea trebuie să fie sub 5MB');
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
      toast.success('Imagine încărcată!');
    } catch (err) {
      toast.error('Eroare la încărcarea imaginii: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const TYPE_CONFIG = {
    iarmaroc:     { label: 'Iarmaroc',     color: 'bg-emerald-100 text-emerald-700' },
    curs_agricol: { label: 'Curs Agricol', color: 'bg-blue-100 text-blue-700' },
    piata_locala: { label: 'Piață Locală', color: 'bg-amber-100 text-amber-800' },
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-sm text-gray-500">
          Evenimentele publicate apar în slider-ul de pe pagina principală.
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-md"
        >
          <FontAwesomeIcon icon={faPlus} />
          Eveniment nou
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-600" />
                {editingEvent ? 'Editează eveniment' : 'Eveniment nou'}
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
                  Titlu <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="ex: Iarmaroc de Toamnă Pirita 2026"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Tip + Publicat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tip eveniment</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  >
                    <option value="iarmaroc">Iarmaroc</option>
                    <option value="curs_agricol">Curs Agricol</option>
                    <option value="piata_locala">Piață Locală</option>
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
                      {form.is_published ? 'Publicat' : 'Ascuns'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Data start <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.event_date}
                    onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data sfârșit</label>
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
                    Locație
                  </label>
                  {/* Toggle buttons */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setLocationMode('map')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        locationMode === 'map'
                          ? 'bg-white text-emerald-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Hartă
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode('manual')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        locationMode === 'manual'
                          ? 'bg-white text-emerald-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {/* Location text input — always visible */}
                <input
                  value={form.location_text}
                  onChange={e => setForm(p => ({ ...p, location_text: e.target.value }))}
                  placeholder="ex: s. Pîrița, Școala Gimnazială"
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
                          Click pe hartă pentru a seta locația exactă
                        </span>
                      )}
                      {form.latitude && form.longitude && (
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, latitude: '', longitude: '' }))}
                          className="text-xs text-red-400 hover:text-red-600 transition"
                        >
                          Șterge pin
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
                          <span className="text-xs text-gray-600 font-medium">Se caută...</span>
                        </div>
                      )}

                      {!form.latitude && !geocoding && locationMode === 'map' && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2
                          bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5
                          rounded-full pointer-events-none z-10">
                          Click pe hartă pentru a plasa pin-ul
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 mb-1">
                      Scrie adresa mai sus pentru geocodare automată, sau click direct pe hartă.
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
                        Latitudine
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
                        Longitudine
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
                      Găsește coordonatele pe
                      <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
                        className="text-emerald-600 underline ml-1">Google Maps</a>
                      → click dreapta pe locație.
                    </p>
                  </div>
                </div>
              </div>

              {/* Imagine eveniment */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Imagine eveniment (opțional)
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
                        <p className="text-xs text-gray-500">Se încarcă...</p>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faFileImage} className="text-gray-300 text-2xl" />
                        <p className="text-sm font-medium text-gray-500">
                          Click pentru a alege imaginea
                        </p>
                        <p className="text-xs text-gray-400">JPG, PNG, WebP · max 5MB</p>
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
                      Schimbă
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descriere</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descrie evenimentul..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Program */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Program (opțional)</label>
                <textarea
                  value={form.schedule}
                  onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))}
                  placeholder={'ex: 09:00 — Deschidere\n10:00 — Concurs produse locale\n14:00 — Premierea câștigătorilor'}
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
                Anulează
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
                {editingEvent ? 'Salvează modificările' : 'Creează evenimentul'}
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
        <EmptyState icon={faCalendarDays} message="Niciun eveniment creat încă" />
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
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        ev.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {ev.is_published ? '● Publicat' : '○ Ascuns'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleTogglePublish(ev)}
                        disabled={!!actionLoading}
                        title={ev.is_published ? 'Ascunde' : 'Publică'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                          ev.is_published
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {ev.is_published ? 'Ascunde' : 'Publică'}
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
    { key: 'events', label: 'Evenimente', icon: faCalendarDays, badge: 0 },
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
          {activeTab === 'events' && <EventManagement />}
          {activeTab === 'users' && <UserManagement userRole={userRole} />}
        </div>
      </div>
    </div>
  );
}
