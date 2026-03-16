import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ProductCard } from '../components/features/ProductCard';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import EditProductModal from '../components/features/EditProductModal';
import { toast, Toaster } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronDown, faChevronUp, faBoxesStacked, faTriangleExclamation,
    faCircleCheck, faHourglassHalf, faXmark, faUser, faPhone,
    faLocationDot, faIdCard, faPenToSquare, faFloppyDisk, faBan,
     faRightFromBracket, faImages, faScroll, faRotateRight
} from '@fortawesome/free-solid-svg-icons';
import {
    Star, MessageSquare, Package, ChevronDown, ChevronUp,
    ExternalLink, Pencil, Trash2, Calendar
} from 'lucide-react';

function Alert({ variant = 'default', title, children, className = '' }) {
    const styles = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        danger: 'bg-red-50 border-red-200 text-red-800',
        default: 'bg-gray-50 border-gray-200 text-gray-800'
    };
    const icons = {
        success: faCircleCheck, warning: faTriangleExclamation,
        danger: faTriangleExclamation, info: faCircleCheck, default: faTriangleExclamation
    };
    return (
        <div className={`border rounded-xl p-4 ${styles[variant]} ${className}`}>
            <div className="flex gap-3">
                <div className="mt-0.5"><FontAwesomeIcon icon={icons[variant]} /></div>
                <div className="flex-1">
                    {title && <p className="font-bold text-sm mb-1">{title}</p>}
                    <div className="text-sm leading-relaxed">{children}</div>
                </div>
            </div>
        </div>
    );
}

function ProfileRow({ icon, label, value, sub, right, invalid = false }) {
    return (
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${invalid ? 'text-red-400' : 'text-gray-400'}`}>
                    <FontAwesomeIcon icon={icon} />
                </div>
                <div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</p>
                    <p className={`text-gray-900 font-semibold ${invalid ? 'text-red-600' : ''}`}>{value}</p>
                    {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
                </div>
            </div>
            {right && <div className="shrink-0">{right}</div>}
        </div>
    );
}


function StarDisplay({ value = 0, size = 14 }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={size}
                    className={s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-100'} />
            ))}
        </div>
    );
}

function MyReviewsSection({ session, onNavigate }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editRating, setEditRating] = useState(0);
    const [hovered, setHovered] = useState(0);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('comments')
                .select(`
                    id, content, rating, created_at, updated_at, id_produit,
                    products ( id, name, image_url, category, location, status )
                `)
                .eq('id_profiles', session.user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setReviews(data || []);
        } catch (err) {
            console.error('Eroare la recenzii:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (session) fetchReviews(); }, [session]);

    const handleDelete = async (id) => {
        if (!confirm('Sigur vrei să ștergi această recenzie?')) return;
        try {
            const { error } = await supabase.from('comments').delete().eq('id', id);
            if (error) throw error;
            toast.success('Recenzie ștearsă!');
            setReviews(reviews.filter(r => r.id !== id));
        } catch { toast.error('Eroare la ștergere'); }
    };

    const handleEdit = async (id) => {
        if (!editContent.trim()) return toast.error('Recenzia nu poate fi goală');
        if (!editRating) return toast.error('Selectează un rating');
        try {
            const { error } = await supabase.from('comments')
                .update({ content: editContent.trim(), rating: editRating }).eq('id', id);
            if (error) throw error;
            toast.success('Recenzie actualizată!');
            setEditingId(null);
            fetchReviews();
        } catch { toast.error('Eroare la actualizare'); }
    };

    const ratingLabels = ['', 'Slab', 'Acceptabil', 'Bun', 'Foarte bun', 'Excelent'];

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden mt-8">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                        <MessageSquare size={18} className="text-emerald-600" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-gray-900">Recenziile mele</p>
                        <p className="text-gray-500 text-sm">
                            {loading ? 'Se încarcă...' : `${reviews.length} recenzie${reviews.length !== 1 ? 'i' : ''} lăsate`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!loading && reviews.length > 0 && (
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-200">
                            {reviews.length}
                        </span>
                    )}
                    {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Metronome size="30" speed="1.6" color="#059669" />
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-gray-500">Nu ai lăsat nicio recenzie încă</p>
                            <p className="text-sm mt-1">Cumpără produse și lasă feedback producătorilor!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => {
                                const product = review.products;
                                const isEditing = editingId === review.id;
                                return (
                                    <div key={review.id} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                                        {/* Produs info */}
                                        <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100">
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                {product?.image_url ? (
                                                    <img src={product.image_url} alt={product?.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package size={20} className="text-gray-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{product?.name || 'Produs șters'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {product?.category && (
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{product.category}</span>
                                                    )}
                                                    {product?.location && (
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                                                            {product.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {product?.status === 'active' && (
                                                <button onClick={() => onNavigate('detalii', product.id)}
                                                    className="flex-shrink-0 flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200">
                                                    <ExternalLink size={12} /> Vezi
                                                </button>
                                            )}
                                        </div>

                                        {/* Recenzia */}
                                        <div className="p-4">
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1.5 font-medium">Rating</p>
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <button key={s} type="button"
                                                                    onClick={() => setEditRating(s)}
                                                                    onMouseEnter={() => setHovered(s)}
                                                                    onMouseLeave={() => setHovered(0)}
                                                                    className="transition-transform hover:scale-125">
                                                                    <Star size={24}
                                                                        className={s <= (hovered || editRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-100'} />
                                                                </button>
                                                            ))}
                                                            {(hovered || editRating) > 0 && (
                                                                <span className="text-xs text-emerald-600 font-medium ml-2">
                                                                    {ratingLabels[hovered || editRating]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                                                        rows={3} maxLength={1000}
                                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleEdit(review.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5">
                                                            <FontAwesomeIcon icon={faCircleCheck} /> Salvează
                                                        </button>
                                                        <button onClick={() => setEditingId(null)}
                                                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition">
                                                            Anulează
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <StarDisplay value={review.rating || 0} />
                                                            <span className="text-xs font-semibold text-gray-700">{ratingLabels[review.rating] || ''}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button onClick={() => { setEditingId(review.id); setEditContent(review.content); setEditRating(review.rating || 0); setHovered(0); }}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition" title="Editează">
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button onClick={() => handleDelete(review.id)}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Șterge">
                                                                <Trash2 size={13} />
                                                            </button>
                                                            <Toaster
                                                                position="bottom-right"
                                                                reverseOrder={false}
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 text-sm leading-relaxed">{review.content}</p>
                                                    <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
                                                        <Calendar size={11} />
                                                        {new Date(review.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        {review.updated_at !== review.created_at && <span className="ml-1 text-gray-300">(editat)</span>}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── ProfilePage principal ────────────────────────────────────
export default function ProfilePage({ session, onNavigate }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [productsCount, setProductsCount] = useState(0);
    const [showProducts, setShowProducts] = useState(false);
    const [myProducts, setMyProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);
    const [dismissedBanner, setDismissedBanner] = useState(false);
    const [dismissedExpiryBanner, setDismissedExpiryBanner] = useState(false);

    // ── RATING STATE ──────────────────────────────────────────
    const [avgRating, setAvgRating] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);

    const [formData, setFormData] = useState({
        full_name: '', phone: '', location: '', bio: ''
    });

    useEffect(() => {
        if (session) {
            loadProfile();
            loadProductsCount();
            loadRating();
        } else {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (!session) onNavigate('home');
    }, [session, onNavigate]);

    if (!session) return null;

    const formatPhoneDisplay = (phone) => {
        if (!phone || phone.length !== 12) return phone;
        const digits = phone.replace('+373', '');
        return `+373 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
    };

    const getColorForName = (name, isDark = false) => {
        if (!name) return isDark ? '#059669' : '#10b981';
        const colors = [
            ['#10b981', '#059669'], ['#3b82f6', '#2563eb'], ['#8b5cf6', '#7c3aed'],
            ['#ec4899', '#db2777'], ['#f59e0b', '#d97706'], ['#ef4444', '#dc2626'],
            ['#06b6d4', '#0891b2'], ['#84cc16', '#65a30d']
        ];
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return isDark ? colors[hash % colors.length][1] : colors[hash % colors.length][0];
    };

    const loadProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            if (error) throw error;
            if (!data) { await createProfile(); return; }
            setProfile(data);
            setFormData({ full_name: data.full_name || '', phone: data.phone || '', location: data.location || '', bio: data.bio || '' });
        } catch (error) {
            console.error('Eroare la încărcarea profilului:', error);
            toast.error('Eroare: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async () => {
        try {
            setLoading(true);
            const { data: existingProfile, error: checkError } = await supabase
                .from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            if (checkError && checkError.code !== 'PGRST116') throw checkError;
            if (existingProfile) {
                setProfile(existingProfile);
                setFormData({ full_name: existingProfile.full_name || '', phone: existingProfile.phone || '', location: existingProfile.location || '', bio: existingProfile.bio || '' });
                setLoading(false);
                return;
            }
            const { data, error } = await supabase.from('profiles')
                .insert({ id: session.user.id, full_name: session.user.user_metadata?.full_name || '' })
                .select().single();
            if (error) throw error;
            setProfile(data);
            setFormData({ full_name: data.full_name || '', phone: '', location: '', bio: '' });
            toast.success('Profil creat! Completează-ți datele.');
        } catch (error) {
            if (error.code === '23505') { toast.error('Profilul există deja. Se reîncarcă...'); loadProfile(); }
            else toast.error('Eroare: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadProductsCount = async () => {
        try {
            const { count, error } = await supabase.from('products')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id).eq('status', 'active');
            if (!error) setProductsCount(count || 0);
        } catch { setProductsCount(0); }
    };

    //FETCH RATING DIN RECENZII 
    const loadRating = async () => {
        try {
            const { data: sellerProducts } = await supabase
                .from('products')
                .select('id')
                .eq('user_id', session.user.id);

            if (sellerProducts?.length > 0) {
                const productIds = sellerProducts.map(p => p.id);
                const { data, error } = await supabase
                    .from('comments')
                    .select('rating')
                    .in('id_produit', productIds);
                if (error) throw error;
                const valid = (data || []).filter(r => r.rating > 0);
                if (valid.length > 0) {
                    const avg = valid.reduce((s, r) => s + r.rating, 0) / valid.length;
                    setAvgRating(parseFloat(avg.toFixed(1)));
                    setReviewCount(valid.length);
                }
            }
        } catch (err) {
            console.error('Eroare la rating:', err);
        }
    };

    const loadMyProducts = async () => {
        try {
            setLoadingProducts(true);
            const { data, error } = await supabase.from('products_with_user')
                .select('*').eq('user_id', session.user.id)
                .in('status', ['active', 'archived', 'pending', 'rejected', 'inactive']).order('created_at', { ascending: false });
            if (error) throw error;
            const now = new Date();
            const toMark = (data || []).filter(p => p.expires_at && new Date(p.expires_at) < now && p.status !== 'inactive');
            if (toMark.length > 0) {
                await Promise.all(toMark.map(p => supabase.from('products').update({ status: 'inactive' }).eq('id', p.id)));
            }
            setMyProducts((data || []).map(p => toMark.find(m => m.id === p.id) ? { ...p, status: 'inactive' } : p));
        } catch (error) {
            toast.error('Eroare la încărcarea produselor');
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleToggleProducts = () => {
        if (!showProducts && myProducts.length === 0) loadMyProducts();
        setShowProducts(!showProducts);
    };

    const handleViewDetails = (productId) => onNavigate('detalii', productId);
    const handleContactClick = async () => { toast('Acesta este propriul tău produs!', { icon: 'ℹ️' }); };

    const handleDeleteProduct = async (productId) => {
        if (!confirm('Sigur vrei să arhivezi acest produs?')) return;
        try {
            const { error } = await supabase.rpc('archive_my_product', { product_id: productId });
            if (error) throw error;
            toast.success('Produs arhivat cu succes!');
            setMyProducts(myProducts.filter(p => p.id !== productId));
            setProductsCount(productsCount - 1);
        } catch (error) {
            console.error('Eroare:', error);
            if (error.message.includes('permission')) toast.error('Nu ai permisiunea să arhivezi acest produs');
            else if (error.message.includes('not found')) toast.error('Produsul nu a fost găsit');
            else toast.error('Eroare: ' + error.message);
        }
    };

    const handleResubmit = async (productId) => {
        try {
            const { error } = await supabase.from('products')
                .update({ status: 'pending', reject_reason: null })
                .eq('id', productId);
            if (error) throw error;
            toast.success('Anunț retrimis pentru aprobare!');
            setMyProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'pending', reject_reason: null } : p));
        } catch { toast.error('Eroare la retrimitere'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.phone || !/^\+373\d{8}$/.test(formData.phone)) return toast.error('Telefonul trebuie să aibă formatul: +373 + 8 cifre');
        if (!formData.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name)) return toast.error('Numele poate conține doar litere și spații');
        if (formData.full_name.trim().length < 2) return toast.error('Numele trebuie să aibă minim 2 caractere');
        try {
            setLoading(true);
            const { error } = await supabase.from('profiles').update({
                full_name: formData.full_name.trim(), phone: formData.phone,
                location: formData.location.trim(), bio: formData.bio.trim()
            }).eq('id', session.user.id);
            if (error) throw error;
            toast.success('Profil actualizat cu succes!');
            setEditing(false);
            loadProfile();
        } catch (error) {
            toast.error('Eroare la actualizare: ' + error.message);
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) toast.error('Eroare la deconectare');
        else toast.success('Te-ai deconectat cu succes!');
    };

    const nameInvalidLive = !!formData.full_name && !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name);
    const nameValidLive = !!formData.full_name && /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name) && formData.full_name.trim().length >= 2;
    const phoneDigits = formData.phone ? formData.phone.replace('+373', '') : '';
    const phoneComplete = formData.phone && formData.phone.length === 12;
    const phoneValid = formData.phone && /^\+373\d{8}$/.test(formData.phone);
    const profileNameInvalid = !!profile?.full_name && !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name);
    const profilePhoneInvalid = !!profile?.phone && !/^\+373\d{8}$/.test(profile.phone);
    const missingOrInvalidForAds = (!profile?.phone || !profile?.location || !profile?.full_name || !/^\+373\d{8}$/.test(profile?.phone || '') || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile?.full_name || ''));

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <Metronome size="40" speed="1.6" color="#059669" />
                    <p className="text-gray-500 mt-3 text-sm">Se încarcă profilul...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid md:grid-cols-3 gap-10">

                    {/* ── SIDEBAR ── */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-lg sticky top-24">
                            {/* Avatar */}
                            <div
                                className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer group shadow-lg"
                                style={{
                                    background: `linear-gradient(135deg, ${getColorForName(profile?.full_name || session.user.email)} 0%, ${getColorForName(profile?.full_name || session.user.email, true)} 100%)`,
                                    borderColor: getColorForName(profile?.full_name || session.user.email) + '40'
                                }}
                            >
                                <span className="text-white text-5xl font-black uppercase drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    {profile?.full_name?.charAt(0) || session.user.email?.charAt(0) || '?'}
                                </span>
                            </div>

                            <p className="text-gray-900 font-bold text-xl mb-2">{profile?.full_name || 'Nume necunoscut'}</p>
                            <p className="text-gray-500 text-sm mb-6">{session.user.email}</p>

                            <div className="flex flex-wrap justify-center gap-2 mb-8">
                                <span className="px-3 py-1.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                                    <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-500" />
                                    Vânzător
                                </span>
                            </div>

                            {/* STATS cu rating real  */}
                            <div className="pt-6 border-t border-gray-100 mb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Card Anunțuri */}
                                    <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2">
                                           <FontAwesomeIcon icon={faScroll} className="text-emerald-600" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 leading-none">{productsCount}</p>
                                        <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mt-2">Anunțuri</p>
                                    </div>

                                    {/* Card Rating */}
                                    <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2">
                                            <Star size={20} className="text-yellow-300 fill-yellow-400" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 leading-none">
                                            {avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
                                        </p>
                                        <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mt-2">
                                            Rating {reviewCount > 0 ? `(${reviewCount})` : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Toggle products */}
                            {productsCount > 0 && (
                                <div className="mb-4">
                                    <button
                                        id="toggle-products-button"
                                        onClick={handleToggleProducts}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        <span>{showProducts ? 'Ascunde anunțurile' : `Vezi anunțurile (${productsCount})`}</span>
                                        <div className="bg-white/20 w-5 h-5 rounded-full flex items-center justify-center">
                                            <FontAwesomeIcon icon={showProducts ? faChevronUp : faChevronDown} className="text-[10px]" />
                                        </div>
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleLogout}
                                className="w-full bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                            >
                                <span>Deconectare</span>
                                <div className="bg-white/20 w-5 h-5 rounded-full flex items-center justify-center">
                                    <FontAwesomeIcon icon={faRightFromBracket} className="text-[10px]" />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* ── MAIN CONTENT ── */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Informații Profil</h2>
                                {!editing && (
                                    <Button onClick={() => setEditing(true)} size="sm" className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faPenToSquare} />
                                        Editează Profil
                                    </Button>
                                )}
                            </div>

                            {editing ? (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Nume */}
                                    <div>
                                        <Input
                                            label="Nume (pentru anunțuri)"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            placeholder="ex: Maxim, Ion Popescu"
                                            required
                                            error={nameInvalidLive ? 'Doar litere și spații (fără cifre sau simboluri).' : ''}
                                            className={nameValidLive ? 'border-emerald-500/60' : ''}
                                        />
                                        {nameInvalidLive && (
                                            <Alert variant="danger" className="mt-3" title="Nume invalid">
                                                Numele poate conține <strong>doar litere și spații</strong>.
                                                <div className="text-xs text-red-700 mt-2">✓ Exemple: "Maxim", "Ion Popescu", "Maria Ștefan"</div>
                                            </Alert>
                                        )}
                                        {nameValidLive && <Alert variant="success" className="mt-3" title="Nume valid">Poți adăuga anunțuri cu acest nume.</Alert>}
                                    </div>

                                    {/* Telefon */}
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Telefon <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className={`flex items-stretch rounded-xl overflow-hidden bg-white transition-colors border ${formData.phone && !phoneValid ? 'border-amber-300' : 'border-gray-200'} focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200`}>
                                                <div className="px-4 py-3 bg-gray-100 text-gray-700 font-mono flex items-center border-r border-gray-200">
                                                    <span className="text-emerald-600 font-bold">+373</span>
                                                </div>
                                                <input
                                                    type="tel"
                                                    value={formData.phone ? formData.phone.replace('+373', '') : ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                        setFormData({ ...formData, phone: value ? `+373${value}` : '' });
                                                    }}
                                                    placeholder="12345678" maxLength={8}
                                                    className="flex-1 px-4 py-3 bg-transparent text-gray-900 focus:outline-none font-mono text-lg tracking-wider placeholder:text-gray-400"
                                                    required
                                                />
                                                {phoneComplete && (
                                                    <div className="px-3 flex items-center">
                                                        <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-600 text-xl" />
                                                    </div>
                                                )}
                                            </div>
                                            {formData.phone && formData.phone !== '+373' && (
                                                <div className="mt-2">
                                                    {phoneValid ? (
                                                        <p className="text-emerald-600 text-sm flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faCircleCheck} />
                                                            Număr complet și valid: {formatPhoneDisplay(formData.phone)}
                                                        </p>
                                                    ) : (
                                                        <p className="text-amber-600 text-sm flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faHourglassHalf} />
                                                            Mai trebuie {8 - phoneDigits.length} cifre
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-xs mt-1">Exemplu: +373 12 34 56 78</p>
                                    </div>

                                    <Input
                                        label="Locație" value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Chișinău, Moldova" required
                                    />

                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">Despre mine</label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            placeholder="Scrie câteva cuvinte despre tine și activitatea ta..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors placeholder:text-gray-400"
                                        />
                                    </div>

                                    {(!formData.phone || !formData.location || !formData.full_name || !/^\+373\d{8}$/.test(formData.phone) || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name)) && (
                                        <Alert variant="warning" title="Pentru a adăuga anunțuri trebuie să completezi:">
                                            <ul className="text-amber-800 text-sm space-y-1">
                                                {(!formData.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name)) && <li>• Nume oficial valid</li>}
                                                {(!formData.phone || !/^\+373\d{8}$/.test(formData.phone)) && <li>• Telefon complet (+373 + 8 cifre)</li>}
                                                {!formData.location && <li>• Locație</li>}
                                            </ul>
                                        </Alert>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button type="submit"
                                            disabled={loading || !formData.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name) || !formData.phone || !/^\+373\d{8}$/.test(formData.phone) || !formData.location}
                                            className="flex items-center gap-2 shadow-lg shadow-emerald-600/15">
                                            <FontAwesomeIcon icon={faFloppyDisk} />
                                            {loading ? 'Se salvează...' : 'Salvează'}
                                        </Button>
                                        <Button variant="secondary"
                                            onClick={() => { setEditing(false); setFormData({ full_name: profile?.full_name || '', phone: profile?.phone || '', location: profile?.location || '', bio: profile?.bio || '' }); }}
                                            type="button" className="flex items-center gap-2">
                                            <FontAwesomeIcon icon={faBan} />
                                            Anulează
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <ProfileRow icon={faIdCard} label="Nume"
                                        value={profile?.full_name ? profile.full_name : <span className="inline-flex items-center gap-2 text-red-600"><FontAwesomeIcon icon={faTriangleExclamation} />Nu e setat</span>}
                                        invalid={!profile?.full_name || profileNameInvalid}
                                        right={profile?.full_name && !profileNameInvalid
                                            ? <Badge variant="success"><span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faCircleCheck} />OK</span></Badge>
                                            : <Badge variant="danger"><span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faTriangleExclamation} />INVALID</span></Badge>}
                                        sub={profileNameInvalid ? 'Numele conține caractere invalide.' : 'Acest nume apare în anunțuri.'}
                                    />
                                    <ProfileRow icon={faPhone} label="Telefon"
                                        value={profile?.phone ? <span className="font-mono text-lg">{formatPhoneDisplay(profile.phone)}</span> : <span className="inline-flex items-center gap-2 text-red-600"><FontAwesomeIcon icon={faTriangleExclamation} />Nu e setat</span>}
                                        invalid={!profile?.phone || profilePhoneInvalid}
                                        right={profile?.phone && !profilePhoneInvalid
                                            ? <Badge variant="success"><span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faCircleCheck} />OK</span></Badge>
                                            : <Badge variant="danger"><span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faTriangleExclamation} />INVALID</span></Badge>}
                                        sub={profilePhoneInvalid ? 'Format invalid.' : 'Format: +373 + 8 cifre.'}
                                    />
                                    <ProfileRow icon={faLocationDot} label="Locație"
                                        value={profile?.location ? profile.location : <span className="inline-flex items-center gap-2 text-red-600"><FontAwesomeIcon icon={faTriangleExclamation} />Nu e setată</span>}
                                        invalid={!profile?.location}
                                        right={profile?.location
                                            ? <Badge variant="success"><span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faCircleCheck} />OK</span></Badge>
                                            : <Badge variant="danger"><span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faTriangleExclamation} />LIPSEȘTE</span></Badge>}
                                        sub="Ajută utilizatorii să găsească anunțuri în zona ta."
                                    />
                                    <ProfileRow icon={faUser} label="Despre mine" value={profile?.bio || 'Nu există descriere'} />

                                    {missingOrInvalidForAds && (
                                        <Alert variant="danger" title="Nu poți adăuga anunțuri!" className="mt-6">
                                            Trebuie să completezi/corectezi:
                                            <ul className="text-red-800 text-sm space-y-1 mt-2">
                                                {(!profile?.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile?.full_name || '')) && <li>• Nume oficial valid</li>}
                                                {(!profile?.phone || !/^\+373\d{8}$/.test(profile?.phone || '')) && <li>• Telefon valid</li>}
                                                {!profile?.location && <li>• Locație</li>}
                                            </ul>
                                            <div className="mt-3">
                                                <Button onClick={() => setEditing(true)} size="sm" className="w-full flex items-center justify-center gap-2">
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                    Completează Acum
                                                </Button>
                                            </div>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Recenzii lăsate */}
                        <MyReviewsSection session={session} onNavigate={onNavigate} />
                    </div>
                </div>

                {/* ── BANNER ANUNȚURI RESPINSE ── */}
                {!dismissedBanner && myProducts.some(p => p.status === 'rejected') && (
                    <div className="mt-6 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-5 py-4 flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">⚠️</span>
                        <p className="flex-1 text-sm font-medium">Unul sau mai multe anunțuri au fost respinse. Verifică și corectează anunțurile tale.</p>
                        <button onClick={() => setDismissedBanner(true)} className="text-amber-600 hover:text-amber-900 transition flex-shrink-0 mt-0.5">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                )}

                {/* ── BANNER ANUNȚURI EXPIRATE ── */}
                {!dismissedExpiryBanner && myProducts.some(p => {
                    const exp = p.expires_at ? new Date(p.expires_at) : null;
                    return exp && (exp - new Date()) < 48 * 60 * 60 * 1000;
                }) && (
                        <div className="mt-4 bg-orange-50 border border-orange-300 text-orange-800 rounded-xl px-5 py-4 flex items-start gap-3">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="flex-shrink-0 mt-0.5" />
                            <p className="flex-1 text-sm font-medium">Ai anunțuri care expiră în curând. Verifică anunțurile tale.</p>
                            <button onClick={() => setDismissedExpiryBanner(true)} className="text-orange-600 hover:text-orange-900 transition flex-shrink-0 mt-0.5">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>
                    )}

                {/* ── PRODUSE ── */}
                {showProducts && (
                    <div className="mt-10" id="my-products">
                        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faBoxesStacked} className="text-emerald-600" />
                                    Anunțurile Mele
                                </h2>
                                <span className="text-gray-500 text-sm">
                                    {productsCount} {productsCount === 1 ? 'anunț activ' : 'anunțuri active'}
                                </span>
                            </div>

                            {loadingProducts ? (
                                <div className="text-center py-12">
                                    <Metronome size="40" speed="1.6" color="#059669" />
                                    <p className="text-gray-600 mt-3">Se încarcă anunțurile...</p>
                                </div>
                            ) : myProducts.length > 0 ? (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {myProducts.map((product) => {
                                        const now = new Date();
                                        const expiresDate = product.expires_at ? new Date(product.expires_at) : null;
                                        const isExpired = expiresDate && expiresDate < now;
                                        const isExpiringSoon = expiresDate && !isExpired && (expiresDate - now) < 48 * 60 * 60 * 1000;
                                        return (
                                            <div key={product.id} className={`relative rounded-2xl border bg-white hover:shadow-lg transition-all duration-300 overflow-hidden ${product.status === 'rejected' ? 'border-red-400' :
                                                    product.status === 'inactive' || isExpired ? 'border-red-300' :
                                                        isExpiringSoon ? 'border-orange-400' :
                                                            product.status === 'pending' ? 'border-yellow-400' :
                                                                'border-gray-200'
                                                }`}>
                                                <ProductCard product={product} session={session} onViewDetails={handleViewDetails} onContactClick={handleContactClick} />
                                                <div className="absolute top-4 right-4 flex gap-2 z-10">
                                                    {product.status === 'rejected' ? (
                                                        <button onClick={() => handleResubmit(product.id)}
                                                            className="bg-orange-500 hover:bg-orange-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110"
                                                            title="Retrimite pentru aprobare">
                                                            <FontAwesomeIcon icon={faRotateRight} />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setEditingProductId(product.id)}
                                                            className="bg-blue-500 hover:bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110" title="Editează galeria foto">
                                                            <FontAwesomeIcon icon={faImages} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteProduct(product.id)}
                                                        className="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110" title="Arhivează anunțul">
                                                        <FontAwesomeIcon icon={faXmark} />
                                                    </button>
                                                    <Toaster position="bottom-right" reverseOrder={false} />
                                                </div>
                                                {product.status === 'archived' && (
                                                    <div className="absolute top-16 right-4 z-10">
                                                        <Badge variant="default">ARHIVAT</Badge>
                                                    </div>
                                                )}
                                                {product.status === 'rejected' && (
                                                    <div className="absolute top-16 right-4 z-10" title={product.reject_reason || 'Neconform cu regulamentul'}>
                                                        <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full cursor-help">RESPINS</span>
                                                    </div>
                                                )}
                                                {product.status === 'pending' && (
                                                    <div className="absolute top-16 right-4 z-10">
                                                        <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-1 rounded-full">ÎN AȘTEPTARE</span>
                                                    </div>
                                                )}
                                                {(product.status === 'inactive' || isExpired) && (
                                                    <div className="absolute top-16 right-4 z-10">
                                                        <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">EXPIRAT</span>
                                                    </div>
                                                )}
                                                {isExpiringSoon && product.status !== 'inactive' && (
                                                    <div className="absolute top-16 right-4 z-10">
                                                        <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">EXPIRĂ ÎN CURÂND</span>
                                                    </div>
                                                )}
                                                {expiresDate && (
                                                    <div className={`absolute bottom-0 left-0 right-0 px-4 py-1.5 text-xs flex items-center gap-1.5 ${isExpired || product.status === 'inactive' ? 'bg-red-50 text-red-500' :
                                                            isExpiringSoon ? 'bg-orange-50 text-orange-600' :
                                                                'bg-gray-50 text-gray-400'
                                                        }`}>
                                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                                                        Valabil până: {expiresDate.toLocaleDateString('ro-RO')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <FontAwesomeIcon icon={faBoxesStacked} className="text-gray-400 text-6xl mb-4" />
                                    <p className="text-gray-600">Nu ai încă anunțuri active</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {editingProductId && (
                <EditProductModal
                    isOpen={!!editingProductId}
                    onClose={() => setEditingProductId(null)}
                    product={myProducts.find(p => p.id === editingProductId)}
                    onSuccess={() => { loadMyProducts(); setEditingProductId(null); }}
                />
            )}
        </div>
    );
}