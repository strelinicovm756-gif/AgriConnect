import { useState, useEffect, useMemo, useRef } from 'react';
import { getColorForName } from '../lib/utils';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ProductCard } from '../components/features/ProductCard';
import ChatModal from '../components/features/ChatModal';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';
import {
    Star, Phone, MessageSquare, MapPin, Leaf, Package,
    TrendingUp, ChevronDown, ChevronUp, BadgeCheck,
    Search, X, SlidersHorizontal, MessageCircle, Calendar,
    ChevronLeft, ChevronRight, User
} from 'lucide-react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

async function geocodeLocation(locationName) {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !locationName) return null;
    try {
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${token}&country=md,ro&language=ro&limit=1`
        );
        const data = await res.json();
        if (data.features?.length > 0) {
            const [lon, lat] = data.features[0].center;
            return { lat, lon };
        }
        return null;
    } catch { return null; }
}

function Stars({ value = 0, size = 14 }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={size}
                    className={s <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-100'} />
            ))}
        </div>
    );
}

function ProducerMap({ location }) {
    const ref = useRef(null);
    const map = useRef(null);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!location || map.current) return;
        geocodeLocation(location).then(coords => {
            if (!coords) { setStatus('error'); return; }
            const m = new mapboxgl.Map({
                container: ref.current,
                style: 'mapbox://styles/mapbox/outdoors-v12',
                center: [coords.lon, coords.lat],
                zoom: 11,
                interactive: false,
            });
            new mapboxgl.Marker({ color: '#059669' }).setLngLat([coords.lon, coords.lat]).addTo(m);
            m.on('load', () => setStatus('ready'));
            map.current = m;
        });
        return () => { map.current?.remove(); map.current = null; };
    }, [location]);

    return (
        <div className="relative rounded-2xl overflow-hidden border border-gray-100" style={{ height: 160 }}>
            <div ref={ref} className="w-full h-full" />
            {status === 'loading' && (
                <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                    <Metronome size="22" speed="1.6" color="#059669" />
                </div>
            )}
            {status === 'error' && (
                <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                    <p className="text-gray-400 text-xs text-center px-4">Harta indisponibilă</p>
                </div>
            )}
            {status === 'ready' && (
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(location)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 bg-white text-xs font-semibold text-emerald-700 px-2.5 py-1 rounded-lg shadow-sm hover:bg-emerald-50 transition border border-gray-100 flex items-center gap-1">
                    <MapPin size={10} /> Deschide
                </a>
            )}
        </div>
    );
}

function ReviewCard({ review }) {
    const name = review.profiles?.full_name || 'Utilizator';
    const color = getColorForName(name);
    const labels = ['', 'Slab', 'Acceptabil', 'Bun', 'Foarte bun', 'Excelent'];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-black text-sm uppercase shadow-sm"
                    style={{ background: color }}>
                    {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Stars value={review.rating || 0} size={11} />
                        {review.rating > 0 && (
                            <span className="text-xs text-emerald-600 font-medium">{labels[review.rating]}</span>
                        )}
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(review.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
                {review.products?.name && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 max-w-[90px] truncate border border-gray-200">
                        {review.products.name}
                    </span>
                )}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{review.content}</p>
        </div>
    );
}

const PRODUCTS_PER_PAGE = 6;
const REVIEWS_PER_PAGE = 4;

export default function ProducerPublicProfile({ session, onNavigate }) {
    const { id: producerId } = useParams();

    const [producer, setProducer] = useState(null);
    const [products, setProducts] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ avg: 0, count: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [category, setCategory] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [productPage, setProductPage] = useState(1);
    const [reviewsOpen, setReviewsOpen] = useState(false);
    const [reviewPage, setReviewPage] = useState(1);
    const [showChatModal, setShowChatModal] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedQ(searchQuery); setProductPage(1); }, 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => { if (producerId) fetchAll(); }, [producerId]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [profileRes, productsRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', producerId).single(),
                supabase.from('products_with_user').select('*').eq('user_id', producerId).eq('status', 'active').order('created_at', { ascending: false }),
            ]);

            if (profileRes.error) throw profileRes.error;
            setProducer(profileRes.data);
            setProducts(productsRes.data || []);

            // Fetch recenzii din toate produsele, inclusiv arhivate
            const { data: allProducerProducts } = await supabase
                .from('products')
                .select('id')
                .eq('user_id', producerId);

            let rv = [];
            if (allProducerProducts?.length > 0) {
                const productIds = allProducerProducts.map(p => p.id);
                const { data: reviewsData } = await supabase
                    .from('comments')
                    .select('id, content, rating, created_at, id_profiles, profiles(full_name), id_produit, products(name)')
                    .in('id_produit', productIds)
                    .order('created_at', { ascending: false });
                rv = reviewsData || [];
            }
            setReviews(rv);
            if (rv.length > 0) {
                const avg = rv.reduce((s, r) => s + (r.rating || 0), 0) / rv.length;
                const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                rv.forEach(r => { if (r.rating) dist[r.rating]++; });
                setReviewStats({ avg: parseFloat(avg.toFixed(2)), count: rv.length, dist });
            }
        } catch (err) {
            console.error(err);
            toast.error('Producătorul nu a fost găsit');
            onNavigate('home');
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        if (!products) return [];
        return [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            const q = debouncedQ.toLowerCase();
            const matchQ = !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
            const matchC = !category || p.category === category;
            return matchQ && matchC;
        });
    }, [products, debouncedQ, category]);

    const totalProductPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    const pagedProducts = filteredProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);
    const totalReviewPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
    const pagedReviews = reviews.slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE);

    const getColor = (name, dark = false) => {
        if (!name) return dark ? '#059669' : '#10b981';
        const p = [['#10b981', '#059669'], ['#3b82f6', '#2563eb'], ['#8b5cf6', '#7c3aed'], ['#ec4899', '#db2777'], ['#f59e0b', '#d97706'], ['#ef4444', '#dc2626'], ['#06b6d4', '#0891b2'], ['#84cc16', '#65a30d']];
        const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return dark ? p[h % p.length][1] : p[h % p.length][0];
    };

    const formatPhone = (ph) => {
        if (!ph || ph.length !== 12) return ph;
        const d = ph.replace('+373', '');
        return `+373 ${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)}`;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center">
                <Metronome size="40" speed="1.6" color="#059669" />
                <p className="text-gray-500 mt-3 text-sm">Se încarcă profilul...</p>
            </div>
        </div>
    );
    if (!producer) return null;

    const color = getColor(producer.full_name);
    const colorDark = getColor(producer.full_name, true);
    const initial = producer.full_name?.charAt(0) || producer.email?.charAt(0) || '?';
    const isOwnProfile = session?.user?.id === producerId;

    return (
        <div className="min-h-screen bg-white">

            {/* ── PAGE WRAPPER matches DetailsPage / AllProductsPage style ── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* ─── PROFILE HEADER CARD ─── */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-6">
                    <div className="p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)` }}>
                                <span className="text-white text-3xl font-black uppercase">{initial}</span>
                            </div>

                            {/* Identity */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-bold text-gray-900">{producer.full_name || 'Producător'}</h1>

                                </div>
                                {producer.official_name && producer.official_name !== producer.full_name && (
                                    <p className="text-gray-500 text-sm mb-2">{producer.official_name}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                    {producer.location && (
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={13} className="text-emerald-600" />
                                            {producer.location}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {!isOwnProfile ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                if (!session) { onNavigate('login'); return; }
                                                setShowChatModal(true);
                                            }}
                                            className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-700 font-semibold px-5 py-2.5 rounded-xl transition-all text-sm">
                                            <MessageSquare size={14} />Mesaj
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => onNavigate('profil')}
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm">
                                        Editează Profilul
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 items-start">

                    {/* SIDEBAR */}
                    <div className="lg:col-span-1 space-y-5 sticky top-24">

                        {/* Rating Card */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Rating Global</p>
                            <div className="flex items-center gap-4 mb-4">
                                <div>
                                    <p className="text-5xl font-black text-gray-900 leading-none">
                                        {reviewStats.avg > 0 ? reviewStats.avg.toFixed(1) : '—'}
                                    </p>
                                    {reviewStats.avg > 0 && <p className="text-gray-400 text-xs mt-1">din 5.0</p>}
                                </div>
                                <div className="flex-1">
                                    <Stars value={reviewStats.avg} size={16} />
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        {reviewStats.count > 0 ? `${reviewStats.count} recenzie${reviewStats.count !== 1 ? 'i' : ''}` : 'Nicio recenzie încă'}
                                    </p>
                                </div>
                            </div>
                            {reviewStats.count > 0 && (
                                <div className="space-y-1.5">
                                    {[5, 4, 3, 2, 1].map(s => {
                                        const cnt = reviewStats.dist[s] || 0;
                                        const pct = reviewStats.count ? Math.round(cnt / reviewStats.count * 100) : 0;
                                        return (
                                            <div key={s} className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 w-2">{s}</span>
                                                <Star size={8} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                    <div className="h-1.5 bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-[10px] text-gray-400 w-3 text-right">{cnt}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Map Card */}
                        {/* {producer.location && (
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Locație</p>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={13} className="text-emerald-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{producer.location}</span>
                </div>
                <ProducerMap location={producer.location} />
              </div>
            )} */}
                    </div>

                    {/*MAIN CONTENT*/}
                    <div className="lg:col-span-2 space-y-6">

                        {/* About */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5 mb-5">
                                <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                                    <Leaf size={16} className="text-emerald-600" />
                                </div>
                                Despre {producer.official_name || producer.full_name || 'Producător'}
                            </h2>
                            {producer.bio ? (
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{producer.bio}</p>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <Leaf size={32} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Nicio descriere adăugată momentan.</p>
                                </div>
                            )}
                        </div>

                        {/* Products */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                                    <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                                        <Package size={16} className="text-emerald-600" />
                                    </div>
                                    Produse Disponibile
                                </h2>
                                {products && filteredProducts.length > 0 && (
                                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                                        {filteredProducts.length} {filteredProducts.length === 1 ? 'produs' : 'produse'}
                                    </span>
                                )}
                            </div>

                            {products && products.length > 0 && (
                                <div className="flex gap-3 mb-5">
                                    <div className={`relative flex-1 transition-all duration-200 ${searchFocused ? 'ring-2 ring-emerald-300 rounded-xl' : ''}`}>
                                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text" value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            onFocus={() => setSearchFocused(true)}
                                            onBlur={() => setSearchFocused(false)}
                                            placeholder="Caută produse..."
                                            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-300 rounded-xl text-sm placeholder-gray-400 focus:outline-none transition-all"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>
                                    {categories.length > 1 && (
                                        <div className="relative">
                                            <SlidersHorizontal size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <select value={category} onChange={e => { setCategory(e.target.value); setProductPage(1); }}
                                                className="pl-8 pr-7 py-2.5 bg-gray-50 border border-gray-200 hover:border-emerald-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 appearance-none cursor-pointer transition-all">
                                                <option value="">Toate</option>
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {products === null ? (
                                <div className="flex justify-center py-12"><Metronome size="32" speed="1.6" color="#059669" /></div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Package size={36} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm text-gray-500">
                                        {searchQuery || category ? 'Niciun produs nu corespunde filtrelor.' : 'Niciun produs activ momentan.'}
                                    </p>
                                    {(searchQuery || category) && (
                                        <button onClick={() => { setSearchQuery(''); setCategory(''); }}
                                            className="mt-2 text-emerald-600 text-xs font-semibold hover:underline">
                                            Resetează filtrele
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {pagedProducts.map(p => (
                                            <div key={p.id} className="rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300">
                                                <ProductCard product={p} session={session}
                                                    onViewDetails={id => onNavigate('detalii', id)}
                                                    onContactClick={() => producer.phone && (window.location.href = `tel:${producer.phone}`)} />
                                            </div>
                                        ))}
                                    </div>

                                    {totalProductPages > 1 && (
                                        <div className="flex items-center justify-center gap-2 mt-6">
                                            <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                                <ChevronLeft size={14} />
                                            </button>
                                            {Array.from({ length: totalProductPages }, (_, i) => i + 1).map(p => (
                                                <button key={p} onClick={() => setProductPage(p)}
                                                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition border ${p === productPage ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'}`}>
                                                    {p}
                                                </button>
                                            ))}
                                            <button onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))} disabled={productPage === totalProductPages}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Reviews Accordion */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                            <button onClick={() => setReviewsOpen(!reviewsOpen)}
                                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                                        <MessageCircle size={16} className="text-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Recenzii Primite</p>
                                        <p className="text-gray-500 text-sm">
                                            {reviewStats.count > 0
                                                ? `${reviewStats.count} recenzie${reviewStats.count !== 1 ? 'i' : ''} · ★ ${reviewStats.avg.toFixed(1)}`
                                                : 'Nicio recenzie momentan'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {reviewStats.count > 0 && (
                                        <span className="bg-gray-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                            {reviewStats.count}
                                        </span>
                                    )}
                                    {reviewsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </div>
                            </button>

                            {reviewsOpen && (
                                <div className="border-t border-gray-100 p-6">
                                    {reviews.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <MessageCircle size={32} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">Nicio recenzie primită deocamdată.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                {pagedReviews.map(r => <ReviewCard key={r.id} review={r} />)}
                                            </div>
                                            {totalReviewPages > 1 && (
                                                <div className="flex items-center justify-center gap-2 mt-5">
                                                    <button onClick={() => setReviewPage(p => Math.max(1, p - 1))} disabled={reviewPage === 1}
                                                        className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                                        <ChevronLeft size={13} />
                                                    </button>
                                                    <span className="text-xs text-gray-500 font-medium px-2">{reviewPage} / {totalReviewPages}</span>
                                                    <button onClick={() => setReviewPage(p => Math.min(totalReviewPages, p + 1))} disabled={reviewPage === totalReviewPages}
                                                        className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                                        <ChevronRight size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>

            <style>{`
                .custom-scroll::-webkit-scrollbar { width: 5px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
                .custom-scroll:hover::-webkit-scrollbar-thumb { background: #10b981; }
                .custom-scroll { scrollbar-width: thin; scrollbar-color: #e5e7eb transparent; }
                .custom-scroll:hover { scrollbar-color: #10b981 transparent; }
            `}</style>

            {showChatModal && session && producer && (
                <ChatModal
                    isOpen={showChatModal}
                    onClose={() => setShowChatModal(false)}
                    session={session}
                    product={{
                        id: null,
                        name: `Discuție cu ${producer.full_name || 'Producător'}`,
                        user_id: producer.id,
                        seller_name: producer.full_name,
                        seller_phone: producer.phone,
                    }}
                />
            )}
        </div>
    );
}