import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ProductCard } from '../components/features/ProductCard';
import { Navbar } from '../components/layout/Navbar';
import EditProductModal from '../components/features/EditProductModal';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronDown,
    faChevronUp,
    faBoxesStacked,
    faTriangleExclamation,
    faCircleCheck,
    faHourglassHalf,
    faXmark,
    faUser,
    faPhone,
    faLocationDot,
    faIdCard,
    faPenToSquare,
    faFloppyDisk,
    faBan,
    faEye,
    faRightFromBracket,
    faImages
} from '@fortawesome/free-solid-svg-icons';

/** Alert component */
function Alert({ variant = 'default', title, children, className = '' }) {
    const styles = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        danger: 'bg-red-50 border-red-200 text-red-800',
        default: 'bg-gray-50 border-gray-200 text-gray-800'
    };

    const icons = {
        success: faCircleCheck,
        warning: faTriangleExclamation,
        danger: faTriangleExclamation,
        info: faCircleCheck,
        default: faTriangleExclamation
    };

    return (
        <div className={`border rounded-xl p-4 ${styles[variant]} ${className}`}>
            <div className="flex gap-3">
                <div className="mt-0.5">
                    <FontAwesomeIcon icon={icons[variant]} />
                </div>
                <div className="flex-1">
                    {title && <p className="font-bold text-sm mb-1">{title}</p>}
                    <div className="text-sm leading-relaxed">{children}</div>
                </div>
            </div>
        </div>
    );
}

/** Profile row */
function ProfileRow({ icon, label, value, sub, right, invalid = false }) {
    return (
        <div className={`
            flex items-start justify-between gap-4 p-4 rounded-xl 
            bg-gray-50 border border-gray-200
            hover:bg-gray-100 transition-colors
        `}>
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

export default function ProfilePage({ session, onNavigate }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [productsCount, setProductsCount] = useState(0);
    const [showProducts, setShowProducts] = useState(false);
    const [myProducts, setMyProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        location: '',
        bio: ''
    });

    useEffect(() => {
        if (session) {
            loadProfile();
            loadProductsCount();
        } else {
            setLoading(false);
        }
    }, [session]);

    const formatPhoneDisplay = (phone) => {
        if (!phone || phone.length !== 12) return phone;
        const digits = phone.replace('+373', '');
        return `+373 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
    };

    const getColorForName = (name, isDark = false) => {
        if (!name) return isDark ? '#059669' : '#10b981';

        const colors = [
            ['#10b981', '#059669'],
            ['#3b82f6', '#2563eb'],
            ['#8b5cf6', '#7c3aed'],
            ['#ec4899', '#db2777'],
            ['#f59e0b', '#d97706'],
            ['#ef4444', '#dc2626'],
            ['#06b6d4', '#0891b2'],
            ['#84cc16', '#65a30d']
        ];

        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colorPair = colors[hash % colors.length];

        return isDark ? colorPair[1] : colorPair[0];
    };

    const loadProfile = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (error) {
                console.error('Eroare query profil:', error);
                throw error;
            }

            if (!data) {
                console.log('Profil lipsește - se creează...');
                await createProfile();
                return;
            }

            setProfile(data);
            setFormData({
                full_name: data.full_name || '',
                phone: data.phone || '',
                location: data.location || '',
                bio: data.bio || ''
            });
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

            console.log('Creare profil pentru user:', session.user.id);

            // VERIFICĂ MAI ÎNTÂI DACĂ EXISTĂ
            const { data: existingProfile, error: checkError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Eroare verificare profil:', checkError);
                throw checkError;
            }

            // DACĂ EXISTĂ DEJA, ÎNCARCĂ-L
            if (existingProfile) {
                console.log('Profilul există deja, se încarcă...');
                setProfile(existingProfile);
                setFormData({
                    full_name: existingProfile.full_name || '',
                    phone: existingProfile.phone || '',
                    location: existingProfile.location || '',
                    bio: existingProfile.bio || ''
                });
                setLoading(false);
                return;
            }

            // DOAR ACUM CREEAZĂ PROFIL NOU
            console.log('Creez profil nou...');
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || ''
                })
                .select()
                .single();

            if (error) {
                console.error('Eroare la creare profil:', error);
                throw error;
            }

            console.log('Profil creat cu succes!');

            setProfile(data);
            setFormData({
                full_name: data.full_name || '',
                phone: '',
                location: '',
                bio: ''
            });

            toast.success('Profil creat! Completează-ți datele.');
        } catch (error) {
            console.error('Eroare crearea profilului:', error);

            // Mesaj specific pentru duplicate key
            if (error.code === '23505') {
                toast.error('Profilul există deja. Se reîncarcă...');
                // Încearcă să încarce profilul existent
                loadProfile();
            } else {
                toast.error('Eroare: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadProductsCount = async () => {
        try {
            const { count, error } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)
                .eq('status', 'active');

            if (!error) {
                setProductsCount(count || 0);
            }
        } catch (error) {
            console.error('Eroare la numărarea produselor:', error);
            setProductsCount(0);
        }
    };

    const loadMyProducts = async () => {
        try {
            setLoadingProducts(true);

            const { data, error } = await supabase
                .from('products_with_user')
                .select('*')
                .eq('user_id', session.user.id)
                .in('status', ['active', 'archived'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            setMyProducts(data || []);
        } catch (error) {
            console.error('Eroare:', error);
            toast.error('Eroare la încărcarea produselor');
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleToggleProducts = () => {
        if (!showProducts && myProducts.length === 0) {
            loadMyProducts();
        }
        setShowProducts(!showProducts);
    };

    const handleViewDetails = (productId) => {
        onNavigate('detalii', productId);
    };

    const handleContactClick = async (product) => {
        toast('Acesta este propriul tău produs!', { icon: 'ℹ️' });
    };

    const handleDeleteProduct = async (productId) => {
        if (!confirm('Sigur vrei să arhivezi acest produs?')) return;

        try {
            const { error } = await supabase.rpc('archive_my_product', {
                product_id: productId
            });

            if (error) throw error;

            toast.success('Produs arhivat cu succes!');

            setMyProducts(myProducts.filter((p) => p.id !== productId));
            setProductsCount(productsCount - 1);
        } catch (error) {
            console.error('Eroare:', error);

            if (error.message.includes('permission')) {
                toast.error('Nu ai permisiunea să arhivezi acest produs');
            } else if (error.message.includes('not found')) {
                toast.error('Produsul nu a fost găsit');
            } else {
                toast.error('Eroare: ' + error.message);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.phone || !/^\+373\d{8}$/.test(formData.phone)) {
            toast.error('Telefonul trebuie să aibă formatul: +373 + 8 cifre');
            return;
        }

        if (!formData.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name)) {
            toast.error('Numele poate conține doar litere și spații');
            return;
        }

        if (formData.full_name.trim().length < 2) {
            toast.error('Numele trebuie să aibă minim 2 caractere');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name.trim(),
                    phone: formData.phone,
                    location: formData.location.trim(),
                    bio: formData.bio.trim()
                })
                .eq('id', session.user.id);

            if (error) throw error;

            toast.success('Profil actualizat cu succes!');
            setEditing(false);
            loadProfile();
        } catch (error) {
            console.error('Eroare la actualizare:', error);
            toast.error('Eroare la actualizare: ' + error.message);
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error('Eroare la deconectare');
        } else {
            toast.success('Te-ai deconectat cu succes!');
        }
    };

    const nameInvalidLive =
        !!formData.full_name && !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name);

    const nameValidLive =
        !!formData.full_name &&
        /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name) &&
        formData.full_name.trim().length >= 2;

    const phoneDigits = formData.phone ? formData.phone.replace('+373', '') : '';
    const phoneComplete = formData.phone && formData.phone.length === 12;
    const phoneValid = formData.phone && /^\+373\d{8}$/.test(formData.phone);

    const profileNameInvalid =
        !!profile?.full_name && !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile.full_name);

    const profilePhoneInvalid = !!profile?.phone && !/^\+373\d{8}$/.test(profile.phone);

    const missingOrInvalidForAds =
        (!profile?.phone ||
            !profile?.location ||
            !profile?.full_name ||
            !/^\+373\d{8}$/.test(profile?.phone || '') ||
            !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile?.full_name || ''));

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center relative overflow-hidden">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
                    <p className="text-emerald-600">Se încarcă profilul...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white">
            {/* Navbar */}
            <Navbar session={session} onNavigate={onNavigate} hideDropdown={true} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid md:grid-cols-3 gap-10">
                    {/* Sidebar */}
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

                            <p className="text-gray-900 font-bold text-xl mb-2">
                                {profile?.full_name || 'Nume necunoscut'}
                            </p>
                            <p className="text-gray-500 text-sm mb-6">{session.user.email}</p>

                            <div className="flex flex-wrap justify-center gap-2 mb-8">
                                <span className="px-3 py-1.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                                    <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-500" />
                                    Vânzător
                                </span>

                                {profile?.is_verified ? (
                                    <Badge variant="success">
                                        <span className="inline-flex items-center gap-2">
                                            <FontAwesomeIcon icon={faCircleCheck} />
                                            VERIFICAT
                                        </span>
                                    </Badge>
                                ) : (
                                    <Badge variant="default">NEVERIFICAT</Badge>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="pt-6 border-t border-gray-200 mb-6">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                                        <p className="text-3xl font-bold text-emerald-600">{productsCount}</p>
                                        <p className="text-gray-600 text-xs font-medium mt-1">Anunțuri Active</p>
                                    </div>
                                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                                        <p className="text-3xl font-bold text-blue-600">0</p>
                                        <p className="text-gray-600 text-xs font-medium mt-1">Recenzii</p>
                                    </div>
                                </div>
                            </div>

                            {/* Toggle products */}
                            {productsCount > 0 && (
                                <div className="mb-4">
                                    <button
                                        id="toggle-products-button"
                                        onClick={handleToggleProducts}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 group"
                                    >
                                        <span>
                                            {showProducts ? 'Ascunde anunțurile' : `Vezi anunțurile (${productsCount})`}
                                        </span>
                                        <div className="bg-white/20 w-5 h-5 rounded-full flex items-center justify-center">
                                            <FontAwesomeIcon
                                                icon={showProducts ? faChevronUp : faChevronDown}
                                                className="text-[10px]"
                                            />
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Buton Logout - Ghost Style */}
                            <button
                                onClick={handleLogout}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 group"
                            >
                                <span>Deconectare</span>
                                <div className="bg-white/20 w-5 h-5 rounded-full flex items-center justify-center">
                                    <FontAwesomeIcon icon={faRightFromBracket} className="text-[10px]" />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Main content */}
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
                                    {/* Name */}
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
                                                Numele poate conține <strong>doar litere și spații</strong> (fără cifre sau caractere speciale
                                                precum _, -, @, etc.)
                                                <div className="text-xs text-red-700 mt-2">
                                                    ✓ Exemple valide: "Maxim", "Ion Popescu", "Maria Ștefan"
                                                </div>
                                            </Alert>
                                        )}

                                        {nameValidLive && (
                                            <Alert variant="success" className="mt-3" title="Nume valid">
                                                Poți adăuga anunțuri cu acest nume.
                                            </Alert>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Telefon <span className="text-red-500">*</span>
                                        </label>

                                        <div className="relative">
                                            <div
                                                className={`
                                                    flex items-stretch rounded-xl overflow-hidden bg-white transition-colors
                                                    border
                                                    ${formData.phone && !phoneValid ? 'border-amber-300' : 'border-gray-200'}
                                                    focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200
                                                `}
                                            >
                                                <div className="px-4 py-3 bg-gray-100 text-gray-700 font-mono flex items-center border-r border-gray-200">
                                                    <span className="text-emerald-600 font-bold">+373</span>
                                                </div>

                                                <input
                                                    type="tel"
                                                    value={formData.phone ? formData.phone.replace('+373', '') : ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                        setFormData({
                                                            ...formData,
                                                            phone: value ? `+373${value}` : ''
                                                        });
                                                    }}
                                                    placeholder="12345678"
                                                    maxLength={8}
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
                                                            <span>Număr complet și valid: {formatPhoneDisplay(formData.phone)}</span>
                                                        </p>
                                                    ) : (
                                                        <p className="text-amber-600 text-sm flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faHourglassHalf} />
                                                            <span>Mai trebuie {8 - phoneDigits.length} cifre</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-gray-500 text-xs mt-1">Exemplu: +373 12 34 56 78</p>
                                    </div>

                                    {/* Location */}
                                    <Input
                                        label="Locație"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Iași, România"
                                        required
                                        error={!formData.location ? '' : ''}
                                    />

                                    {/* Bio */}
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

                                    {/* Warning */}
                                    {(!formData.phone ||
                                        !formData.location ||
                                        !formData.full_name ||
                                        !/^\+373\d{8}$/.test(formData.phone) ||
                                        !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name)) && (
                                            <Alert variant="warning" title="Pentru a adăuga anunțuri trebuie să completezi:">
                                                <ul className="text-amber-800 text-sm space-y-1">
                                                    {(!formData.full_name || !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name)) && (
                                                        <li>• Nume oficial valid (fără cifre sau caractere speciale)</li>
                                                    )}
                                                    {(!formData.phone || !/^\+373\d{8}$/.test(formData.phone)) && (
                                                        <li>• Telefon complet (+373 + 8 cifre)</li>
                                                    )}
                                                    {!formData.location && <li>• Locație</li>}
                                                </ul>
                                            </Alert>
                                        )}

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            type="submit"
                                            disabled={
                                                loading ||
                                                !formData.full_name ||
                                                !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(formData.full_name) ||
                                                !formData.phone ||
                                                !/^\+373\d{8}$/.test(formData.phone) ||
                                                !formData.location
                                            }
                                            className="flex items-center gap-2 shadow-lg shadow-emerald-600/15"
                                        >
                                            <FontAwesomeIcon icon={faFloppyDisk} />
                                            {loading ? 'Se salvează...' : 'Salvează'}
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                setEditing(false);
                                                setFormData({
                                                    full_name: profile?.full_name || '',
                                                    phone: profile?.phone || '',
                                                    location: profile?.location || '',
                                                    bio: profile?.bio || ''
                                                });
                                            }}
                                            type="button"
                                            className="flex items-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faBan} />
                                            Anulează
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <ProfileRow
                                        icon={faIdCard}
                                        label="Nume"
                                        value={
                                            profile?.full_name ? (
                                                profile.full_name
                                            ) : (
                                                <span className="inline-flex items-center gap-2 text-red-600">
                                                    <FontAwesomeIcon icon={faTriangleExclamation} />
                                                    Nu e setat
                                                </span>
                                            )
                                        }
                                        invalid={!profile?.full_name || profileNameInvalid}
                                        right={
                                            profile?.full_name && !profileNameInvalid ? (
                                                <Badge variant="success">
                                                    <span className="inline-flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faCircleCheck} />
                                                        OK
                                                    </span>
                                                </Badge>
                                            ) : (
                                                <Badge variant="danger">
                                                    <span className="inline-flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faTriangleExclamation} />
                                                        INVALID
                                                    </span>
                                                </Badge>
                                            )
                                        }
                                        sub={
                                            profileNameInvalid
                                                ? 'Numele conține caractere invalide (cifre sau simboluri).'
                                                : 'Acest nume apare în anunțuri.'
                                        }
                                    />

                                    <ProfileRow
                                        icon={faPhone}
                                        label="Telefon"
                                        value={
                                            profile?.phone ? (
                                                <span className="font-mono text-lg">{formatPhoneDisplay(profile.phone)}</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 text-red-600">
                                                    <FontAwesomeIcon icon={faTriangleExclamation} />
                                                    Nu e setat (necesar pentru anunțuri)
                                                </span>
                                            )
                                        }
                                        invalid={!profile?.phone || profilePhoneInvalid}
                                        right={
                                            profile?.phone && !profilePhoneInvalid ? (
                                                <Badge variant="success">
                                                    <span className="inline-flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faCircleCheck} />
                                                        OK
                                                    </span>
                                                </Badge>
                                            ) : (
                                                <Badge variant="danger">
                                                    <span className="inline-flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faTriangleExclamation} />
                                                        INVALID
                                                    </span>
                                                </Badge>
                                            )
                                        }
                                        sub={profilePhoneInvalid ? 'Format invalid (trebuie +373 + 8 cifre).' : 'Format: +373 + 8 cifre.'}
                                    />

                                    <ProfileRow
                                        icon={faLocationDot}
                                        label="Locație"
                                        value={
                                            profile?.location ? (
                                                profile.location
                                            ) : (
                                                <span className="inline-flex items-center gap-2 text-red-600">
                                                    <FontAwesomeIcon icon={faTriangleExclamation} />
                                                    Nu e setată (necesară pentru anunțuri)
                                                </span>
                                            )
                                        }
                                        invalid={!profile?.location}
                                        right={
                                            profile?.location ? (
                                                <Badge variant="success">
                                                    <span className="inline-flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faCircleCheck} />
                                                        OK
                                                    </span>
                                                </Badge>
                                            ) : (
                                                <Badge variant="danger">
                                                    <span className="inline-flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faTriangleExclamation} />
                                                        LIPSEȘTE
                                                    </span>
                                                </Badge>
                                            )
                                        }
                                        sub="Ajută utilizatorii să găsească anunțuri în zona ta."
                                    />

                                    <ProfileRow
                                        icon={faUser}
                                        label="Despre mine"
                                        value={profile?.bio || 'Nu există descriere'}
                                        invalid={false}
                                    />

                                    {missingOrInvalidForAds && (
                                        <Alert
                                            variant="danger"
                                            title="Nu poți adăuga anunțuri!"
                                            className="mt-6"
                                        >
                                            Trebuie să completezi/corectezi următoarele:
                                            <ul className="text-red-800 text-sm space-y-1 mt-2">
                                                {(!profile?.full_name ||
                                                    !/^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(profile?.full_name || '')) && (
                                                        <li>• Nume oficial valid (doar litere și spații)</li>
                                                    )}
                                                {(!profile?.phone || !/^\+373\d{8}$/.test(profile?.phone || '')) && (
                                                    <li>• Telefon valid (+373 + 8 cifre)</li>
                                                )}
                                                {!profile?.location && <li>• Locație</li>}
                                            </ul>

                                            <div className="mt-3">
                                                <Button
                                                    onClick={() => setEditing(true)}
                                                    size="sm"
                                                    className="w-full flex items-center justify-center gap-2"
                                                >
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                    Completează Acum
                                                </Button>
                                            </div>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Products */}
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
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
                                    <p className="text-gray-600">Se încarcă anunțurile...</p>
                                </div>
                            ) : myProducts.length > 0 ? (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {myProducts.map((product) => (
                                        <div
                                            key={product.id}
                                            className="relative rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all duration-300 overflow-hidden"
                                        >
                                            <ProductCard
                                                product={product}
                                                session={session}
                                                onViewDetails={handleViewDetails}
                                                onContactClick={handleContactClick}
                                            />

                                            {/* Butoane Acțiuni */}
                                            <div className="absolute top-4 right-4 flex gap-2 z-10">
                                                {/* Buton Edit Galerie */}
                                                <button
                                                    onClick={() => setEditingProductId(product.id)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110"
                                                    title="Editează galeria foto"
                                                >
                                                    <FontAwesomeIcon icon={faImages} />
                                                </button>

                                                {/* Buton Delete */}
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110"
                                                    title="Arhivează anunțul"
                                                >
                                                    <FontAwesomeIcon icon={faXmark} />
                                                </button>
                                            </div>

                                            {/* Archived badge */}
                                            {product.status === 'archived' && (
                                                <div className="absolute top-16 right-4 z-10">
                                                    <Badge variant="default">ARHIVAT</Badge>
                                                </div>
                                            )}
                                        </div>
                                    ))}
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

            {/* Modal Edit Galerie */}
            {editingProductId && (
                <EditProductModal
                    isOpen={!!editingProductId}
                    onClose={() => setEditingProductId(null)}
                    product={myProducts.find(p => p.id === editingProductId)}
                    onSuccess={() => {
                        loadMyProducts();
                        setEditingProductId(null);
                    }}
                />
            )}
        </div>
    );
}