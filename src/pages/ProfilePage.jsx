import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../i18n/LanguageContext';
import { getCategoryName } from '../i18n/categoryTranslations';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ProductCard } from '../components/features/ProductCard';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import EditProductModal from '../components/features/EditProductModal';
import { toast } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronDown, faBoxesStacked, faTriangleExclamation,
    faCircleCheck, faHourglassHalf, faXmark, faUser, faPhone,
    faLocationDot, faPenToSquare, faFloppyDisk, faBan,
    faRightFromBracket, faImages, faRotateRight,
    faCheck, faPen, faStar, faFileLines, faGear, faGlobe, faBell,
    faCarrot, faTractor, faUsers, faStore, faBuilding,
    faLock, faEye, faEyeSlash, faSpinner, faPlus,
} from '@fortawesome/free-solid-svg-icons';
import {
    Star, MessageSquare, Package,
    ExternalLink, Pencil, Trash2, Calendar, Bell
} from 'lucide-react';

function LangPills() {
    const { lang, setLang } = useLanguage();
    return (
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-0.5">
            {['ro', 'en', 'fr'].map(l => (
                <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 ${lang === l ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-800'}`}
                >
                    {l}
                </button>
            ))}
        </div>
    );
}

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
    const { t, lang } = useLanguage();
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
        if (!confirm(t.profile.confirmDeleteReview)) return;
        try {
            const { error } = await supabase.from('comments').delete().eq('id', id);
            if (error) throw error;
            toast.success(t.profile.toastReviewDeleted);
            setReviews(reviews.filter(r => r.id !== id));
        } catch { toast.error(t.profile.toastReviewDeleteError); }
    };

    const handleEdit = async (id) => {
        if (!editContent.trim()) return toast.error(t.profile.toastReviewEmpty);
        if (!editRating) return toast.error(t.profile.toastSelectRating);
        try {
            const { error } = await supabase.from('comments')
                .update({ content: editContent.trim(), rating: editRating }).eq('id', id);
            if (error) throw error;
            toast.success(t.profile.toastReviewUpdated);
            setEditingId(null);
            fetchReviews();
        } catch { toast.error(t.profile.toastReviewUpdateError); }
    };

    const ratingLabels = ['', t.profile.ratingPoor, t.profile.ratingFair, t.profile.ratingGood, t.profile.ratingVeryGood, t.profile.ratingExcellent];

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden mt-8">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                        <MessageSquare size={18} className="text-emerald-600" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-gray-900">{t.profile.myReviews}</p>
                        <p className="text-gray-500 text-sm">
                            {loading ? t.common.loading : `${reviews.length} review${reviews.length !== 1 ? 's' : ''} left`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!loading && reviews.length > 0 && (
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full ">
                            {reviews.length}
                        </span>
                    )}
                    <FontAwesomeIcon
                        icon={faChevronDown}
                        className="text-gray-400 text-sm"
                        style={{
                            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease-in-out',
                        }}
                    />
                </div>
            </button>

            <div
                style={{
                    overflow: 'hidden',
                    maxHeight: open ? '2000px' : '0px',
                    opacity: open ? 1 : 0,
                    transition: 'max-height 0.4s ease-in-out, opacity 0.3s ease-in-out',
                }}
            >
                <div className="border-t border-gray-100 p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Metronome size="30" speed="1.6" color="#059669" />
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-gray-500">{t.profile.noReviews}</p>
                            <p className="text-sm mt-1">{t.profile.noReviewsHint}</p>
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
                                                <p className="font-bold text-gray-900 truncate">{product?.name || 'Deleted product'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {product?.category && (
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{getCategoryName(product.category?.toLowerCase().replace(/ /g, '-'), lang)}</span>
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
                                                    <ExternalLink size={12} /> View
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
                                                            <FontAwesomeIcon icon={faCircleCheck} /> {t.profile.save}
                                                        </button>
                                                        <button onClick={() => setEditingId(null)}
                                                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition">
                                                            {t.profile.cancel}
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
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition" title="Edit">
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button onClick={() => handleDelete(review.id)}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Delete">
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 text-sm leading-relaxed">{review.content}</p>
                                                    <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
                                                        <Calendar size={11} />
                                                        {new Date(review.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        {review.updated_at !== review.created_at && <span className="ml-1 text-gray-300">{t.profile.edited}</span>}
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
            </div>
        </div>
    );
}

// ─── Profile completion helpers ───────────────────────────────
const getProfileCompletion = (profile) => {
    if (!profile) return 0;
    const fields = [
        profile.full_name && /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name)
        && profile.full_name.trim().length >= 2,
        profile.phone && profile.phone.length >= 10,
        profile.location && profile.location.trim().length > 0,
        profile.bio && profile.bio.trim().length > 0,
        profile.avatar_url && profile.avatar_url.length > 0,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
};

const getMissingFields = (profile, t) => {
    if (!profile) return [];
    const missing = [];
    const isNameValid = profile.full_name &&
        /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name) &&
        profile.full_name.trim().length >= 2;
    if (!isNameValid) missing.push({ key: 'full_name', label: t.profile.validName, desc: t.profile.validNameDesc, icon: faUser });
    if (!profile.phone || profile.phone.length < 10) missing.push({ key: 'phone', label: t.profile.phoneNumber, desc: t.profile.phoneNumberDesc, icon: faPhone });
    if (!profile.location) missing.push({ key: 'location', label: t.profile.locationField, desc: t.profile.locationFieldDesc, icon: faLocationDot });
    return missing;
};

function ProfileFieldRow({ icon, label, isEditing, isValid, onEdit, onSave, onCancel, displayValue, children }) {
    return (
        <div className={`group rounded-2xl transition-all duration-200 ${isEditing
                ? 'bg-gray-50 p-5'
                : 'border border-transparent hover:border-gray-100 hover:bg-gray-50/50 p-4'
            }`}>
            {isEditing ? (
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <FontAwesomeIcon icon={icon} className="text-emerald-500" />
                        {label}
                    </label>
                    {children}
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onSave}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                            <FontAwesomeIcon icon={faFloppyDisk} className="text-[10px]" />
                            Salvează
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl border border-gray-200 transition-colors"
                        >
                            Anulează
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isValid ? 'bg-white' : 'bg-white/50'
                        }`}>
                        <FontAwesomeIcon icon={icon} className={`text-sm ${isValid ? 'text-emerald-600' : 'text-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                        <div className="text-sm font-semibold text-gray-900 truncate">{displayValue}</div>
                    </div>
                    <button
                        type="button"
                        onClick={onEdit}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-xl transition-all duration-150 flex-shrink-0"
                    >
                        <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                        Editează
                    </button>
                </div>
            )}
        </div>
    );
}

function passwordStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
}

// ─── ProfilePage principal ────────────────────────────────────
export default function ProfilePage({ session, onNavigate }) {
    const { t } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingField, setEditingField] = useState(null);
    const [productsCount, setProductsCount] = useState(0);
    const [showProducts, setShowProducts] = useState(false);
    const [myProducts, setMyProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);
    const [dismissedBanner, setDismissedBanner] = useState(false);
    const [dismissedExpiryBanner, setDismissedExpiryBanner] = useState(false);
    const [notifyEvents, setNotifyEvents] = useState(false);
    const [notificationLocations, setNotificationLocations] = useState([]);
    const [newLocationInput, setNewLocationInput] = useState('');
    const [locationSaving, setLocationSaving] = useState(false);
    const [notificationLocationsCoords, setNotificationLocationsCoords] = useState([]);
    const [profileMarketType, setProfileMarketType] = useState('b2c');
    const [b2bVerified, setB2bVerified] = useState(false);
    const [b2bRequestedAt, setB2bRequestedAt] = useState(null);
    const [followedProducers, setFollowedProducers] = useState([]);
    const [loadingFollowed, setLoadingFollowed] = useState(false);
    const [showFollowed, setShowFollowed] = useState(false);

    // ── RATING STATE ──────────────────────────────────────────
    const [avgRating, setAvgRating] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);

    const [formData, setFormData] = useState({
        full_name: '', phone: '', location: '', bio: ''
    });

    // ── PASSWORD CHANGE STATE ─────────────────────────────────
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

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
    }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

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
            setNotifyEvents(!!data.notify_events);
            setNotificationLocations(data.notification_locations || []);
            setNotificationLocationsCoords(data.notification_locations_coords || []);
            setProfileMarketType(data.market_type || 'b2c');
            setB2bVerified(!!data.b2b_verified);
            setB2bRequestedAt(data.b2b_requested_at || null);
            setFormData({ full_name: data.full_name || '', phone: data.phone || '', location: data.location || '', bio: data.bio || '', idno: data.idno || '', company_name: data.company_name || '' });
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
            toast.success('Profile created! Please complete your details.');
        } catch (error) {
            if (error.code === '23505') { toast.error('Profile already exists. Reloading...'); loadProfile(); }
            else toast.error('Error: ' + error.message);
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
            toast.error('Error loading products');
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleToggleProducts = () => {
        if (!showProducts && myProducts.length === 0) loadMyProducts();
        setShowProducts(!showProducts);
    };

    const handleViewDetails = (productId) => onNavigate('detalii', productId);
    const handleContactClick = async () => { toast('This is your own product!', { icon: 'ℹ️' }); };

    const handleDeleteProduct = async (productId) => {
        if (!confirm('Are you sure you want to archive this product?')) return;
        try {
            const { error } = await supabase.rpc('archive_my_product', { product_id: productId });
            if (error) throw error;
            toast.success('Product archived successfully!');
            setMyProducts(myProducts.filter(p => p.id !== productId));
            setProductsCount(productsCount - 1);
        } catch (error) {
            console.error('Error:', error);
            if (error.message.includes('permission')) toast.error('You do not have permission to archive this product');
            else if (error.message.includes('not found')) toast.error('Product not found');
            else toast.error('Error: ' + error.message);
        }
    };

    const handleResubmit = async (productId) => {
        try {
            const { error } = await supabase.from('products')
                .update({ status: 'pending', reject_reason: null })
                .eq('id', productId);
            if (error) throw error;
            toast.success('Listing resubmitted for approval!');
            setMyProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'pending', reject_reason: null } : p));
        } catch { toast.error('Error resubmitting'); }
    };

    const handleToggleNotifyEvents = async () => {
        const next = !notifyEvents;
        setNotifyEvents(next);
        try {
            await supabase.from('profiles').update({ notify_events: next }).eq('id', session.user.id);
            toast.success(t.profile.settingsSaved);
        } catch {
            setNotifyEvents(!next);
        }
    };

    const handleAddNotificationLocation = async () => {
        const loc = newLocationInput.trim();
        if (!loc) return;
        if (notificationLocations.length >= 5) {
            toast.error(t.profile.maxLocationsReached ?? 'Poți adăuga maxim 5 localități');
            return;
        }
        if (notificationLocations.includes(loc)) {
            toast.error(t.profile.locationAlreadyAdded ?? 'Această localitate este deja adăugată');
            return;
        }

        setLocationSaving(true);
        try {
            // Geocodează locația nouă folosind Mapbox
            const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
            let coords = null;
            try {
                const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(loc)}.json?access_token=${MAPBOX_TOKEN}&country=md,ro&language=ro&limit=1`
                );
                const data = await res.json();
                if (data.features?.length > 0) {
                    const [lon, lat] = data.features[0].center;
                    coords = { lat, lon };
                }
            } catch (e) {
                console.error('Geocode error:', e);
            }

            const updatedLocations = [...notificationLocations, loc];
            const updatedCoords = [
                ...notificationLocationsCoords,
                { name: loc, lat: coords?.lat ?? null, lon: coords?.lon ?? null }
            ];

            const { error } = await supabase
                .from('profiles')
                .update({
                    notification_locations: updatedLocations,
                    notification_locations_coords: updatedCoords,
                })
                .eq('id', session.user.id);

            if (error) throw error;

            setNotificationLocations(updatedLocations);
            setNotificationLocationsCoords(updatedCoords);
            setNewLocationInput('');

            if (coords) {
                toast.success(`${loc} adăugat (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})`);
            } else {
                toast.success(`${loc} adăugat (coordonate negăsite)`);
            }
        } catch {
            toast.error(t.profile.toastProfileError);
        } finally {
            setLocationSaving(false);
        }
    };

    const handleRemoveNotificationLocation = async (locToRemove) => {
        const updated = notificationLocations.filter(l => l !== locToRemove);
        const updatedCoords = notificationLocationsCoords.filter(c => c.name !== locToRemove);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    notification_locations: updated,
                    notification_locations_coords: updatedCoords,
                })
                .eq('id', session.user.id);
            if (error) throw error;
            setNotificationLocations(updated);
            setNotificationLocationsCoords(updatedCoords);
            toast.success(t.profile.settingsSaved);
        } catch {
            toast.error(t.profile.toastProfileError);
        }
    };

    const handleMarketTypeChange = async (newType) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ market_type: newType })
                .eq('id', session.user.id);
            if (error) throw error;
            setProfileMarketType(newType);
            toast.success(t.profile.settingsSaved);
        } catch {
            toast.error(t.profile.toastProfileError);
        }
    };

    const handleSaveField = async (field) => {
        if (field === 'full_name') {
            if (!formData.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name))
                return toast.error('Numele poate conține doar litere și spații');
            if (formData.full_name.trim().length < 2)
                return toast.error('Numele trebuie să aibă minim 2 caractere');
        }
        if (field === 'phone') {
            if (!formData.phone || !/^\+373\d{8}$/.test(formData.phone))
                return toast.error('Telefonul trebuie să fie în formatul +373 + 8 cifre');
        }
        try {
            const updates = {};
            if (field === 'full_name') updates.full_name = formData.full_name.trim();
            if (field === 'phone') updates.phone = formData.phone;
            if (field === 'location') updates.location = formData.location.trim();
            if (field === 'bio') updates.bio = formData.bio.trim();
            if (field === 'b2b') {
                updates.company_name = formData.company_name?.trim() || null;
                updates.idno = formData.idno?.trim() || null;
            }
            const { error } = await supabase.from('profiles')
                .update(updates).eq('id', session.user.id);
            if (error) throw error;
            toast.success('Salvat!');
            setEditingField(null);
            loadProfile();
        } catch (err) {
            toast.error('Eroare: ' + err.message);
        }
    };

    const handleCancelField = () => {
        setFormData(prev => ({
            ...prev,
            full_name: profile?.full_name || '',
            phone: profile?.phone || '',
            location: profile?.location || '',
            bio: profile?.bio || '',
            company_name: profile?.company_name || '',
            idno: profile?.idno || '',
        }));
        setEditingField(null);
    };

    const loadFollowedProducers = async () => {
        setLoadingFollowed(true);
        try {
            const { data: follows, error: followsError } = await supabase
                .from('producer_follows')
                .select('producer_id, created_at')
                .eq('follower_id', session.user.id)
                .order('created_at', { ascending: false });
            if (followsError) throw followsError;
            if (!follows || follows.length === 0) { setFollowedProducers([]); return; }

            const ids = follows.map(f => f.producer_id);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, location, avatar_url, is_verified, market_type')
                .in('id', ids);
            if (profilesError) throw profilesError;

            const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
            setFollowedProducers(follows.map(f => ({ ...profileMap[f.producer_id], followedAt: f.created_at })).filter(p => p.id));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingFollowed(false);
        }
    };

    const handleUnfollow = async (producerId) => {
        await supabase.from('producer_follows')
            .delete()
            .eq('follower_id', session.user.id)
            .eq('producer_id', producerId);
        setFollowedProducers(prev => prev.filter(p => p.id !== producerId));
        toast.success('Ai încetat să urmărești acest producător');
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) toast.error('Error signing out');
        else toast.success('You have been signed out!');
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 8) {
            toast.error(t.profile.passwordTooShort);
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error(t.profile.passwordMismatch);
            return;
        }

        setPasswordLoading(true);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: session.user.email,
                password: currentPassword,
            });
            if (signInError) {
                toast.error(t.profile.passwordWrongCurrent);
                setPasswordLoading(false);
                return;
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            toast.success(t.profile.passwordChanged);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordForm(false);
        } catch (err) {
            toast.error(t.profile.passwordChangeError);
        } finally {
            setPasswordLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <Metronome size="40" speed="1.6" color="#059669" />
                    <p className="text-gray-500 mt-3 text-sm">{t.profile.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
                <div className="grid md:grid-cols-3 gap-10">

                    {/* ── SIDEBAR ── */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-4 sticky top-24">
                            {/* Avatar */}
                            <div className="relative">
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-black shadow-lg"
                                    style={{ background: getColorForName(profile?.id || profile?.full_name) }}
                                >
                                    {(profile?.full_name?.[0] || session.user.email[0]).toUpperCase()}
                                </div>
                                {profile?.is_verified && (
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                        <FontAwesomeIcon icon={faCircleCheck} className="text-white text-sm" />
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {profile?.full_name || 'New user'}
                                </h2>
                                <p className="text-sm text-gray-400">{session.user.email}</p>
                            </div>

                            {/* Trust badge */}
                            {profile?.is_verified ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                                    <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                                    Verified Profile
                                </span>
                            ) : getMissingFields(profile, t).length === 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">
                                    <FontAwesomeIcon icon={faUser} className="text-xs" />
                                    New seller
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs" />
                                    Incomplete profile
                                </span>
                            )}


                            {/* Stats */}
                            <div className="w-full grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-gray-900">{productsCount}</p>
                                    <p className="text-xs text-gray-400">Listings</p>
                                </div>
                                <div className="text-center">
                                    {avgRating > 0 ? (
                                        <>
                                            <p className="text-2xl font-black text-gray-900 flex items-center justify-center gap-1">
                                                <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-lg" />
                                                {avgRating.toFixed(1)}
                                            </p>
                                            <p className="text-xs text-gray-400">Rating</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-2xl font-black text-gray-300">—</p>
                                            <p className="text-xs text-gray-400">No reviews</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Logout */}
                            <div className="w-full">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-2xl transition-all"
                                >
                                    <span>Sign out</span>
                                    <FontAwesomeIcon icon={faRightFromBracket} className="text-[10px]" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── MAIN CONTENT ── */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-8">Profilul meu</h2>

                            <div className="space-y-1">

                                {/* FULL NAME */}
                                <ProfileFieldRow
                                    icon={faUser}
                                    label="Nume"
                                    isEditing={editingField === 'full_name'}
                                    isValid={!!(profile?.full_name && /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name))}
                                    onEdit={() => setEditingField('full_name')}
                                    onSave={() => handleSaveField('full_name')}
                                    onCancel={handleCancelField}
                                    displayValue={profile?.full_name || <span className="text-red-400 italic">Necompletat</span>}
                                >
                                    <Input
                                        value={formData.full_name}
                                        onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))}
                                        placeholder="Ex: Ion Popescu"
                                        autoFocus
                                    />
                                    {formData.full_name && !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name) && (
                                        <p className="text-xs text-red-500 mt-1">Doar litere și spații</p>
                                    )}
                                </ProfileFieldRow>

                                {/* PHONE */}
                                <ProfileFieldRow
                                    icon={faPhone}
                                    label="Telefon"
                                    isEditing={editingField === 'phone'}
                                    isValid={!!(profile?.phone && /^\+373\d{8}$/.test(profile.phone))}
                                    onEdit={() => setEditingField('phone')}
                                    onSave={() => handleSaveField('phone')}
                                    onCancel={handleCancelField}
                                    displayValue={profile?.phone || <span className="text-red-400 italic">Necompletat</span>}
                                >
                                    <div className="flex items-stretch rounded-xl overflow-hidden border border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 bg-white">
                                        <div className="px-4 py-2.5 bg-gray-50 text-emerald-600 font-bold font-mono border-r border-gray-200 flex items-center text-sm">
                                            +373
                                        </div>
                                        <input
                                            type="tel"
                                            value={formData.phone ? formData.phone.replace('+373', '') : ''}
                                            onChange={e => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                setFormData(f => ({ ...f, phone: value ? `+373${value}` : '' }));
                                            }}
                                            placeholder="12345678"
                                            maxLength={8}
                                            autoFocus
                                            className="flex-1 px-4 py-2.5 bg-transparent text-gray-900 focus:outline-none font-mono tracking-wider placeholder:text-gray-400 text-sm"
                                        />
                                    </div>
                                </ProfileFieldRow>

                                {/* LOCATION */}
                                <ProfileFieldRow
                                    icon={faLocationDot}
                                    label="Locație"
                                    isEditing={editingField === 'location'}
                                    isValid={!!profile?.location}
                                    onEdit={() => setEditingField('location')}
                                    onSave={() => handleSaveField('location')}
                                    onCancel={handleCancelField}
                                    displayValue={profile?.location || <span className="text-red-400 italic">Necompletat</span>}
                                >
                                    <Input
                                        value={formData.location}
                                        onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                                        placeholder="Chișinău, Moldova"
                                        autoFocus
                                    />
                                </ProfileFieldRow>

                                {/* BIO */}
                                <ProfileFieldRow
                                    icon={faFileLines}
                                    label="Despre mine"
                                    isEditing={editingField === 'bio'}
                                    isValid={!!profile?.bio}
                                    onEdit={() => setEditingField('bio')}
                                    onSave={() => handleSaveField('bio')}
                                    onCancel={handleCancelField}
                                    displayValue={
                                        profile?.bio
                                            ? <span className="text-gray-700 text-sm leading-relaxed line-clamp-2">{profile.bio}</span>
                                            : <span className="text-gray-300 italic text-sm">Nu ai adăugat o descriere</span>
                                    }
                                >
                                    <textarea
                                        value={formData.bio}
                                        onChange={e => setFormData(f => ({ ...f, bio: e.target.value }))}
                                        placeholder="Câteva cuvinte despre tine și activitatea ta..."
                                        rows={3}
                                        autoFocus
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                                    />
                                </ProfileFieldRow>

                            </div>

                            {/* Profile incomplete warning */}
                            {(!profile?.full_name || !profile?.phone || !profile?.location ||
                                !/^\+373\d{8}$/.test(profile?.phone || '') ||
                                !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile?.full_name || '')) && (
                                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 flex-shrink-0" />
                                        <p className="text-sm text-amber-800 font-medium">
                                            Completează profilul pentru a putea adăuga anunțuri
                                        </p>
                                    </div>
                                )}

                            {/* B2B status card */}
                            {(profileMarketType === 'b2b' || profileMarketType === 'both') && (
                                <div className={`rounded-2xl border p-4 mt-4 ${b2bVerified ? 'bg-emerald-50 border-emerald-200' : b2bRequestedAt ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${b2bVerified ? 'bg-emerald-100' : b2bRequestedAt ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                            <FontAwesomeIcon
                                                icon={b2bVerified ? faCircleCheck : b2bRequestedAt ? faHourglassHalf : faBuilding}
                                                className={`text-sm ${b2bVerified ? 'text-emerald-600' : b2bRequestedAt ? 'text-amber-600' : 'text-blue-600'}`}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900">
                                                {b2bVerified ? t.profile.b2bStatusVerified : b2bRequestedAt ? t.profile.b2bStatusPending : t.profile.b2bStatusIncomplete}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {b2bVerified
                                                    ? `${t.profile.b2bCompany}: ${profile?.company_name || '—'} · IDNO: ${profile?.idno || '—'}`
                                                    : b2bRequestedAt ? t.profile.b2bPendingHint : t.profile.b2bIncompleteHint}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Change Password Section */}
                            <div className="mt-6">
                                <button
                                    onClick={() => setShowPasswordForm(prev => !prev)}
                                    type="button"
                                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-600 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faLock} className="text-xs" />
                                    {t.profile.changePassword}
                                    <FontAwesomeIcon
                                        icon={faChevronDown}
                                        style={{ transition: 'transform 300ms ease', transform: showPasswordForm ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                        className="text-xs"
                                    />
                                </button>

                                <div style={{
                                    maxHeight: showPasswordForm ? '500px' : '0',
                                    opacity: showPasswordForm ? 1 : 0,
                                    overflow: 'hidden',
                                    transition: 'max-height 300ms ease, opacity 300ms ease',
                                }}>
                                    <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">

                                        {/* Current password */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                                                {t.profile.currentPassword}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showCurrent ? 'text' : 'password'}
                                                    value={currentPassword}
                                                    onChange={e => setCurrentPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white pr-10"
                                                />
                                                <button type="button" onClick={() => setShowCurrent(p => !p)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    <FontAwesomeIcon icon={showCurrent ? faEyeSlash : faEye} className="text-sm" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* New password */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                                                {t.profile.newPassword}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNew ? 'text' : 'password'}
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    placeholder={t.profile.newPasswordPlaceholder}
                                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white pr-10"
                                                />
                                                <button type="button" onClick={() => setShowNew(p => !p)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    <FontAwesomeIcon icon={showNew ? faEyeSlash : faEye} className="text-sm" />
                                                </button>
                                            </div>

                                            {newPassword.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4].map(i => (
                                                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength(newPassword)
                                                                    ? ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-600'][i]
                                                                    : 'bg-gray-200'
                                                                }`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-400">
                                                        {['', t.profile.passwordStrengthVeryWeak, t.profile.passwordStrengthWeak, t.profile.passwordStrengthGood, t.profile.passwordStrengthStrong][passwordStrength(newPassword)]}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm password */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                                                {t.profile.confirmNewPassword}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirm ? 'text' : 'password'}
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    placeholder={t.profile.confirmPasswordPlaceholder}
                                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 bg-white ${confirmPassword && newPassword !== confirmPassword
                                                            ? 'border-red-300 focus:ring-red-300'
                                                            : 'border-gray-200 focus:ring-emerald-400'
                                                        }`}
                                                />
                                                <button type="button" onClick={() => setShowConfirm(p => !p)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} className="text-sm" />
                                                </button>
                                            </div>
                                            {confirmPassword && newPassword !== confirmPassword && (
                                                <p className="text-xs text-red-500 mt-1">{t.profile.passwordMismatch}</p>
                                            )}
                                        </div>

                                        {/* Submit button */}
                                        <button
                                            type="button"
                                            onClick={handleChangePassword}
                                            disabled={passwordLoading || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                                        >
                                            {passwordLoading
                                                ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                                : <FontAwesomeIcon icon={faFloppyDisk} />
                                            }
                                            {passwordLoading ? t.profile.savingPassword : t.profile.savePassword}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── SETĂRI & PREFERINȚE ── */}
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden mt-8">
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faGear} className="text-emerald-600" />
                                    </div>
                                    <p className="font-bold text-gray-900">{t.profile.settingsTitle}</p>
                                </div>

                                {/* Row: notify_events toggle */}
                                <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <FontAwesomeIcon icon={faBell} className="text-emerald-600 text-sm" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{t.profile.settingsNotifyEvents}</p>
                                            <p className="text-xs text-gray-500">{t.profile.settingsNotifyEventsDesc}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleToggleNotifyEvents}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${notifyEvents ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notifyEvents ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {notifyEvents && (
                                    <div className="py-4 border-b border-gray-100 space-y-4">
                                        {/* Partea de sus: Iconiță și Text */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                <FontAwesomeIcon icon={faBell} className="text-blue-500 text-sm" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-sm font-semibold text-gray-900">{t.profile.notificationRadius}</p>
                                                    {/* Afișăm valoarea curentă în timp real */}
                                                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                                        {profile?.notification_radius_km ?? 10} km
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">{t.profile.notificationRadiusHint}</p>
                                            </div>
                                        </div>

                                        {/* Bara de selecție (Slider-ul) */}
                                        <div className="px-2">
                                            <input
                                                type="range"
                                                min="1"
                                                max="35"
                                                step="1"
                                                value={profile?.notification_radius_km ?? 10}
                                                onChange={(e) => {
                                                    const radius = parseInt(e.target.value);
                                                    // Actualizăm doar starea locală pentru a fi fluid (fără lag)
                                                    setProfile(prev => ({ ...prev, notification_radius_km: radius }));
                                                }}
                                                // Actualizăm baza de date doar când utilizatorul dă drumul la mouse
                                                onMouseUp={async (e) => {
                                                    const radius = parseInt(e.target.value);
                                                    await supabase.from('profiles')
                                                        .update({ notification_radius_km: radius })
                                                        .eq('id', session.user.id);
                                                    toast.success(t.profile.settingsSaved);
                                                }}
                                                // Pentru ecrane tactile (mobile)
                                                onTouchEnd={async (e) => {
                                                    const radius = parseInt(e.target.value);
                                                    await supabase.from('profiles')
                                                        .update({ notification_radius_km: radius })
                                                        .eq('id', session.user.id);
                                                    toast.success(t.profile.settingsSaved);
                                                }}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            />
                                            <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
                                                <span>1 km</span>
                                                <span>10 km</span>
                                                <span>20 km</span>
                                                <span>35 km</span>
                                            </div>
                                        </div>

                                        {/* Additional notification locations */}
                                        <div className="py-4 border-b border-gray-100">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                                    <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600 text-sm" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {t.profile.notificationLocations ?? 'Localități suplimentare'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {t.profile.notificationLocationsHint ?? 'Primești notificări și pentru evenimente din aceste localități (max. 5)'}
                                                    </p>
                                                </div>
                                            </div>

                                            {notificationLocations.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {notificationLocations.map(loc => (
                                                        <span
                                                            key={loc}
                                                            className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full"
                                                        >
                                                            <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                                                            {loc}
                                                            <button
                                                                onClick={() => handleRemoveNotificationLocation(loc)}
                                                                className="ml-1 text-emerald-400 hover:text-red-500 transition"
                                                            >
                                                                <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {notificationLocations.length < 5 ? (
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <FontAwesomeIcon
                                                            icon={faLocationDot}
                                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={newLocationInput}
                                                            onChange={e => setNewLocationInput(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleAddNotificationLocation()}
                                                            placeholder={t.profile.notificationLocationPlaceholder ?? 'Ex: Cahul, Bălți, Orhei...'}
                                                            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleAddNotificationLocation}
                                                        disabled={!newLocationInput.trim() || locationSaving}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
                                                    >
                                                        {locationSaving
                                                            ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                                                            : <FontAwesomeIcon icon={faPlus} className="text-xs" />
                                                        }
                                                        {t.common.add ?? 'Adaugă'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                                                    {t.profile.maxLocationsReached ?? 'Ai atins limita de 5 localități. Șterge una pentru a adăuga alta.'}
                                                </p>
                                            )}

                                            <p className="text-[10px] text-gray-400 mt-2 text-right">
                                                {notificationLocations.length}/5 {t.profile.locationsAdded ?? 'localități adăugate'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Row: Producer type */}
                                <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <FontAwesomeIcon icon={faStore} className="text-emerald-600 text-sm" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{t.profile.producerType}</p>
                                            <p className="text-xs text-gray-500">{t.profile.producerTypeHint}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                        <div className="flex gap-1.5">
                                            {[
                                                { key: 'b2c', label: t.profile.producerTypeFood, icon: faCarrot },
                                                { key: 'b2b', label: t.profile.producerTypeServices, icon: faTractor },
                                                { key: 'both', label: t.profile.producerTypeBoth, icon: faUsers },
                                            ].map(opt => (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => handleMarketTypeChange(opt.key)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${profileMarketType === opt.key
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                                                        }`}
                                                >
                                                    <FontAwesomeIcon icon={opt.icon} className="text-[10px]" />
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400">{t.profile.producerTypeAutoHint}</p>
                                    </div>
                                </div>

                                {/* Row: Language */}
                                <div className="flex items-center justify-between gap-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <FontAwesomeIcon icon={faGlobe} className="text-emerald-600 text-sm" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{t.profile.settingsLanguage}</p>
                                    </div>
                                    <LangPills />
                                </div>
                            </div>
                        </div>

                        {/* Recenzii lăsate */}
                        <MyReviewsSection session={session} onNavigate={onNavigate} />

                        {/* ── PRODUCĂTORI URMĂRIȚI ── */}
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden mt-8">
                            <button
                                onClick={() => {
                                    if (!showFollowed && followedProducers.length === 0) loadFollowedProducers();
                                    setShowFollowed(!showFollowed);
                                }}
                                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                                        <Bell size={18} className="text-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Producători urmăriți</p>
                                        <p className="text-gray-500 text-sm">
                                            {loadingFollowed ? 'Se încarcă...' : `${followedProducers.length} producător${followedProducers.length !== 1 ? 'i' : ''}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {followedProducers.length > 0 && (
                                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                            {followedProducers.length}
                                        </span>
                                    )}
                                    <FontAwesomeIcon
                                        icon={faChevronDown}
                                        className="text-gray-400 text-sm"
                                        style={{
                                            transform: showFollowed ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.3s ease-in-out',
                                        }}
                                    />
                                </div>
                            </button>

                            <div style={{
                                overflow: 'hidden',
                                maxHeight: showFollowed ? '2000px' : '0px',
                                opacity: showFollowed ? 1 : 0,
                                transition: 'max-height 0.4s ease-in-out, opacity 0.3s ease-in-out',
                            }}>
                                <div className="border-t border-gray-100 p-6">
                                    {loadingFollowed ? (
                                        <div className="flex justify-center py-8">
                                            <Metronome size="30" speed="1.6" color="#059669" />
                                        </div>
                                    ) : followedProducers.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            <Bell size={40} className="mx-auto mb-3 opacity-30" />
                                            <p className="font-medium text-gray-500">Nu urmărești niciun producător</p>
                                            <p className="text-sm mt-1">Vizitează profilul unui producător și apasă "Urmărește"</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {followedProducers.map((producer) => (
                                                <div key={producer.id}
                                                    className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                                                    {/* Avatar */}
                                                    <div
                                                        className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-base shadow-sm"
                                                        style={{ background: getColorForName(producer.id || producer.full_name) }}
                                                    >
                                                        {(producer.full_name?.[0] || '?').toUpperCase()}
                                                    </div>
                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-gray-900 text-sm truncate">{producer.full_name || 'Producător'}</p>
                                                            {producer.is_verified && (
                                                                <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 text-xs flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        {producer.location && (
                                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                                <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                                                                {producer.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => onNavigate('producator', producer.id)}
                                                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
                                                        >
                                                            Vezi profil
                                                        </button>
                                                        <button
                                                            onClick={() => handleUnfollow(producer.id)}
                                                            className="text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                            title="Dezabonează-te"
                                                        >
                                                            <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── ANUNȚURILE MELE ── */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-8">
                            <button
                                onClick={handleToggleProducts}
                                className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faBoxesStacked} className="text-emerald-600 text-sm" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900 text-sm">{t.profile.myProducts}</p>
                                        <p className="text-xs text-gray-400">
                                            {productsCount} active listing{productsCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className="text-gray-400 text-sm"
                                    style={{
                                        transform: showProducts ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease-in-out',
                                    }}
                                />
                            </button>

                            <div
                                style={{
                                    overflow: 'hidden',
                                    maxHeight: showProducts ? '2000px' : '0px',
                                    opacity: showProducts ? 1 : 0,
                                    transition: 'max-height 0.4s ease-in-out, opacity 0.3s ease-in-out',
                                }}
                            >
                                <div className="px-6 pb-6 border-t border-gray-50">
                                    {loadingProducts ? (
                                        <div className="text-center py-12">
                                            <Metronome size="40" speed="1.6" color="#059669" />
                                            <p className="text-gray-600 mt-3">Loading listings...</p>
                                        </div>
                                    ) : myProducts.length > 0 ? (
                                        <div className="grid md:grid-cols-2 gap-6 mt-4">
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
                                                        {/* Edit action bar */}
                                                        <div className="px-4 pb-3 bg-white flex gap-2 rounded-b-2xl">
                                                            <button
                                                                onClick={() => setEditingProductId(product.id)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all"
                                                            >
                                                                <FontAwesomeIcon icon={faPen} className="text-xs" />
                                                                Edit
                                                            </button>
                                                        </div>
                                                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                                                            {product.status === 'rejected' ? (
                                                                <button onClick={() => handleResubmit(product.id)}
                                                                    className="bg-orange-500 hover:bg-orange-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110"
                                                                    title="Resubmit for approval">
                                                                    <FontAwesomeIcon icon={faRotateRight} />
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => setEditingProductId(product.id)}
                                                                    className="bg-blue-500 hover:bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110" title="Edit photo gallery">
                                                                    <FontAwesomeIcon icon={faImages} />
                                                                </button>
                                                            )}
                                                            <button onClick={() => handleDeleteProduct(product.id)}
                                                                className="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110" title="Archive listing">
                                                                <FontAwesomeIcon icon={faXmark} />
                                                            </button>
                                                        </div>
                                                        {product.status === 'archived' && (
                                                            <div className="absolute top-16 right-4 z-10">
                                                                <Badge variant="default">ARCHIVED</Badge>
                                                            </div>
                                                        )}
                                                        {product.status === 'rejected' && (
                                                            <div className="absolute top-16 right-4 z-10" title={product.reject_reason || 'Does not comply with regulations'}>
                                                                <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full cursor-help">REJECTED</span>
                                                            </div>
                                                        )}
                                                        {product.status === 'pending' && (
                                                            <div className="absolute top-16 right-4 z-10">
                                                                <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2.5 py-1 rounded-full">PENDING</span>
                                                            </div>
                                                        )}
                                                        {(product.status === 'inactive' || isExpired) && (
                                                            <div className="absolute top-16 right-4 z-10">
                                                                <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">EXPIRED</span>
                                                            </div>
                                                        )}
                                                        {isExpiringSoon && product.status !== 'inactive' && (
                                                            <div className="absolute top-16 right-4 z-10">
                                                                <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">EXPIRING SOON</span>
                                                            </div>
                                                        )}
                                                        {expiresDate && (
                                                            <div className={`absolute bottom-0 left-0 right-0 px-4 py-1.5 text-xs flex items-center gap-1.5 ${isExpired || product.status === 'inactive' ? 'bg-red-50 text-red-500' :
                                                                isExpiringSoon ? 'bg-orange-50 text-orange-600' :
                                                                    'bg-gray-50 text-gray-400'
                                                                }`}>
                                                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                                                                Valid until: {expiresDate.toLocaleDateString('en-GB')}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <FontAwesomeIcon icon={faBoxesStacked} className="text-gray-400 text-6xl mb-4" />
                                            <p className="text-gray-600">You have no active listings yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BANNER ANUNȚURI RESPINSE ── */}
                {!dismissedBanner && myProducts.some(p => p.status === 'rejected') && (
                    <div className="mt-6 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-5 py-4 flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">⚠️</span>
                        <p className="flex-1 text-sm font-medium">One or more listings were rejected. Please review and correct your listings.</p>
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
                            <p className="flex-1 text-sm font-medium">You have listings expiring soon. Check your listings.</p>
                            <button onClick={() => setDismissedExpiryBanner(true)} className="text-orange-600 hover:text-orange-900 transition flex-shrink-0 mt-0.5">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
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