import { useState, useEffect, useMemo } from 'react';
import { getColorForName } from '../lib/utils';
import { useParams } from 'react-router-dom';
import { supabase } from "../services/supabaseClient";
import ProductMapModal from "../components/features/ProductMapModal";
import ChatModal from "../components/features/ChatModal";
import toast from 'react-hot-toast';
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarrot, faAppleWhole, faCow, faDrumstickBite,
  faEgg, faJar, faWheatAwn, faBox,
  faLocationDot, faCalendarDays, faPhone,
  faCircleCheck, faMapMarkedAlt,
  faHandshake, faLeaf, faMessage,
  faStar,
  faChevronLeft, faChevronRight,
  faComments, faPaperPlane, faTrash, faPen, faFlag
} from '@fortawesome/free-solid-svg-icons';

function StarRating({ value = 0, onChange = null }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          style={{ width: '1.5rem', height: '1.5rem', flexShrink: 0 }}
          className={`flex items-center justify-center ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
          aria-label={`${star} stele`}
        >
          {star <= active ? (
            <FontAwesomeIcon
              icon={faStar}
              className="text-yellow-400"
              style={{ fontSize: '1.25rem', display: 'block' }}
            />
          ) : (
            <svg
              viewBox="0 0 576 512"
              className="fill-current text-gray-300"
              style={{ width: '1.25rem', height: '1.25rem', display: 'block' }}
            >
              <path d="M287.9 0c9.2 0 17.6 5.2 21.6 13.5l68.6 141.3 153.2 22.6c9 1.3 16.5 7.6 19.3 16.3s.5 18.1-5.9 24.5L433.6 328.4l26.2 155.6c1.5 9-2.2 18.1-9.7 23.5s-17.3 6-25.4 1.7L288 439.6 152.2 509.1c-8.1 4.3-17.9 3.7-25.4-1.7s-11.2-14.5-9.7-23.5l26.2-155.6L31.1 218.2c-6.5-6.4-8.7-15.9-5.9-24.5s10.3-14.9 19.3-16.3L197.7 154.8 266.3 13.5C270.4 5.2 278.7 0 287.9 0zm0 79L235.4 187.2c-3.5 7.1-10.2 12.1-18.1 13.3L99.9 217.6l84.2 83c5.5 5.5 8.1 13.3 6.8 21L171 443l103.8-55.3c7.1-3.8 15.6-3.8 22.6 0L401.2 443l-19.9-121.4c-1.3-7.7 1.2-15.5 6.8-21l84.2-83-117.4-17.1c-7.9-1.2-14.6-6.1-18.1-13.3L287.9 79z" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ productId, session, productOwnerId }) {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(0);

  const isProductOwner = session?.user?.id && productOwnerId && session.user.id === productOwnerId;

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`id, content, rating, created_at, updated_at, id_profiles, profiles(full_name, avatar_url)`)
        .eq('id_produit', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Eroare la recenzii:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => { if (productId) fetchComments(); }, [productId]);

  const myComment = useMemo(() => comments.find((c) => c.id_profiles === session?.user?.id), [comments, session]);

  const stats = useMemo(() => {
    if (!comments.length) return { avg: 0, count: 0, distribution: {} };
    const total = comments.reduce((s, c) => s + (c.rating || 0), 0);
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    comments.forEach((c) => { if (c.rating) dist[c.rating]++; });
    return { avg: total / comments.length, count: comments.length, distribution: dist };
  }, [comments]);

  const handleSubmit = async () => {
    if (!session) return toast.error('Trebuie să fii autentificat');
    if (!newRating) return toast.error('Selectează un rating (1-5 stele)');
    if (!newContent.trim()) return toast.error('Scrie o recenzie');
    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({ id_profiles: session.user.id, id_produit: productId, content: newContent.trim(), rating: newRating });
      if (error) {
        if (error.code === '23505') {
          toast.error('Ai lăsat deja o recenzie pentru acest produs');
        } else {
          throw error;
        }
        return;
      }
      toast.success('Recenzie adăugată!');
      setNewContent(''); setNewRating(0); fetchComments();
    } catch (err) { toast.error('Eroare la trimitere'); console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Recenzie ștearsă'); fetchComments();
    } catch { toast.error('Eroare la ștergere'); }
  };

  const handleEdit = async (id) => {
    if (!editContent.trim()) return toast.error('Recenzia nu poate fi goală');
    if (!editRating) return toast.error('Selectează un rating');
    try {
      const { error } = await supabase.from('comments').update({ content: editContent.trim(), rating: editRating }).eq('id', id);
      if (error) throw error;
      toast.success('Recenzie actualizată!'); setEditingId(null); fetchComments();
    } catch { toast.error('Eroare la actualizare'); }
  };


  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mt-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faComments} className="text-emerald-600" />
          Recenzii
          {stats.count > 0 && <span className="text-base font-normal text-gray-500 ml-1">({stats.count})</span>}
        </h2>
      </div>

      {stats.count > 0 && (
        <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row gap-6 items-center">
          <div className="text-center flex-shrink-0">
            <p className="text-6xl font-black text-gray-900">{stats.avg.toFixed(1)}</p>
            <StarRating value={Math.round(stats.avg)} size="text-lg" />
            <p className="text-gray-500 text-sm mt-1">{stats.count} recenzie{stats.count !== 1 ? 'i' : ''}</p>
          </div>
          <div className="flex-1 w-full space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] || 0;
              const pct = stats.count ? Math.round((count / stats.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
                  <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-xs" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-6">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {session && isProductOwner && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-center">
          <p className="text-amber-700 text-sm font-medium">Nu poți lăsa o recenzie la propriul tău produs.</p>
        </div>
      )}

      {session && !myComment && !isProductOwner && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faPen} className="text-emerald-600" />
            Lasă o recenzie
          </h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2 font-medium">Rating</p>
            <StarRating value={newRating} onChange={setNewRating} size="text-3xl" />
            {newRating > 0 && <p className="text-xs text-emerald-600 mt-1 font-medium">{['', 'Slab', 'Acceptabil', 'Bun', 'Foarte bun', 'Excelent'][newRating]}</p>}
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2 font-medium">Recenzie</p>
            <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)}
              placeholder="Spune-ne experiența ta cu acest produs..." rows={4} maxLength={1000}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white" />
            <p className="text-xs text-gray-400 text-right mt-1">{newContent.length}/1000</p>
          </div>
          <button onClick={handleSubmit} disabled={submitting || !newRating || !newContent.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition flex items-center gap-2 text-sm">
            {submitting ? <Metronome size="16" speed="1.6" color="white" /> : <FontAwesomeIcon icon={faPaperPlane} />}
            Trimite recenzia
          </button>
        </div>
      )}

      {!session && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-8 text-center">
          <p className="text-gray-500 text-sm"><span className="font-semibold text-gray-700">Autentifică-te</span> pentru a lăsa o recenzie.</p>
        </div>
      )}

      {loadingComments ? (
        <div className="flex justify-center py-8"><Metronome size="30" speed="1.6" color="#059669" /></div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FontAwesomeIcon icon={faComments} className="text-5xl mb-3 opacity-30" />
          <p className="font-medium">Nicio recenzie încă</p>
          <p className="text-sm">Fii primul care lasă o recenzie!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isOwn = comment.id_profiles === session?.user?.id;
            const isEditing = editingId === comment.id;
            const name = comment.profiles?.full_name || 'Utilizator';
            return (
              <div key={comment.id} className={`rounded-2xl p-5 border transition-all ${isOwn ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 uppercase shadow-sm"
                      style={{ background: getColorForName(name) }}>{name.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        {name}
                        {isOwn && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Tu</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating value={comment.rating || 0} size="text-xs" />
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isOwn && !isEditing && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content); setEditRating(comment.rating || 0); }}
                        className="text-gray-400 hover:text-emerald-600 transition p-1.5 rounded-lg hover:bg-emerald-100" title="Editează">
                        <FontAwesomeIcon icon={faPen} className="text-sm" />
                      </button>
                      <button onClick={() => handleDelete(comment.id)}
                        className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50" title="Șterge">
                        <FontAwesomeIcon icon={faTrash} className="text-sm" />
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">Rating</p>
                      <StarRating value={editRating} onChange={setEditRating} size="text-2xl" />
                    </div>
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} maxLength={1000}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(comment.id)}
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
                  <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DetailsPage({ onNavigate, onNavigateBack, session }) {
  const { id: productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [userCurrentLocation, setUserCurrentLocation] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isHoveringGallery, setIsHoveringGallery] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // ── RATING FURNIZOR — calculat din toate produsele lui, inclusiv arhivate ──
  const [sellerRating, setSellerRating] = useState(0);
  // ── RAPORTARE ──
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  useEffect(() => {
    if (!session) { onNavigate('login'); return; }
    if (productId) fetchProductDetails();
  }, [session, productId]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_with_user').select('*').eq('id', productId).single();
      if (error) throw error;
      setProduct(data);

      // Check raportare anterioară
      if (session?.user?.id && data?.user_id !== session.user.id) {
        const { data: existingReport } = await supabase
          .from('reports').select('id')
          .eq('reporter_id', session.user.id).eq('product_id', productId).maybeSingle();
        setAlreadyReported(!!existingReport);
      }

      // Rating furnizor — toate produsele lui, inclusiv arhivate/șterse
      if (data?.user_id) {
        const { data: sellerProducts } = await supabase
          .from('products').select('id').eq('user_id', data.user_id);

        if (sellerProducts?.length > 0) {
          const productIds = sellerProducts.map(p => p.id);
          const { data: ratingData } = await supabase
            .from('comments').select('rating').in('id_produit', productIds);

          const valid = (ratingData || []).filter(r => r.rating > 0);
          if (valid.length > 0) {
            const avg = valid.reduce((s, r) => s + r.rating, 0) / valid.length;
            setSellerRating(parseFloat(avg.toFixed(1)));
          }
        }
      }
    } catch (error) {
      console.error('Eroare la încărcare produs:', error);
      toast.error('Produsul nu a fost găsit');
      onNavigate('home');
    } finally {
      setLoading(false);
    }
    try {
      await supabase.rpc('increment_product_views', { product_id: productId });
    } catch (e) {
      console.warn('increment_product_views indisponibil:', e.message);
    }
  };

  const handleContact = async () => {
    try {
      await supabase.rpc('increment_product_contacts', { product_id: product.id });
      if (product.seller_phone) {
        const phoneNumber = product.seller_phone.replace(/\s/g, '');
        window.location.href = `tel:${phoneNumber}`;
      }
    } catch (error) { console.error('Eroare:', error); }
  };

  const handleViewOnMap = () => {
    setShowMapModal(true);
    if (!userCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserCurrentLocation({ lat: position.coords.latitude, lon: position.coords.longitude }),
        (error) => console.log('Could not get user location:', error)
      );
    }
  };

  const handleReport = async () => {
    if (!reportReason) return toast.error('Selectează un motiv');
    setReportSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: session.user.id, product_id: product.id,
        reason: reportReason, description: reportDesc.trim() || null
      });
      if (error) throw error;
      toast.success('Raportare trimisă. Mulțumim!');
      setShowReportModal(false);
      setAlreadyReported(true);
      setReportReason(''); setReportDesc('');
    } catch { toast.error('Eroare la trimiterea raportării'); }
    finally { setReportSubmitting(false); }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price);

  const categoryIcons = {
    'Legume': faCarrot, 'Fructe': faAppleWhole, 'Lactate': faCow,
    'Carne': faDrumstickBite, 'Ouă': faEgg, 'Miere': faJar,
    'Cereale': faWheatAwn, 'Conserve': faJar, 'Altele': faBox
  };


  const stockPercentage = product ? Math.min((product.quantity / 100) * 100, 100) : 0;

  const allImages = useMemo(() => {
    if (!product) return [];
    const images = [];
    if (product.image_url) images.push(product.image_url);
    if (product.gallery_images && Array.isArray(product.gallery_images)) images.push(...product.gallery_images);
    return images;
  }, [product]);

  const changeImage = (newIndex) => {
    if (isTransitioning || newIndex === selectedImageIndex) return;
    setIsTransitioning(true); setSelectedImageIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToPrevious = () => changeImage(selectedImageIndex === 0 ? allImages.length - 1 : selectedImageIndex - 1);
  const goToNext = () => changeImage(selectedImageIndex === allImages.length - 1 ? 0 : selectedImageIndex + 1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (allImages.length <= 1) return;
      if (e.key === 'ArrowLeft') goToPrevious();
      else if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allImages.length, selectedImageIndex, isTransitioning]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white flex items-center justify-center">
        <div className="text-center">
          <Metronome size="40" speed="1.6" color="#059669" />
          <p className="text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left - GALERIE */}
            <div className="p-8 bg-white">
              <div className="relative aspect-square bg-white rounded-3xl overflow-hidden shadow-lg mb-4"
                onMouseEnter={() => setIsHoveringGallery(true)}
                onMouseLeave={() => setIsHoveringGallery(false)}>
                {allImages.length > 0 ? (
                  <>
                    <div className="relative w-full h-full">
                      <img src={allImages[selectedImageIndex]} alt={`${product.name} - Imagine ${selectedImageIndex + 1}`}
                        className={`w-full h-full object-cover transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`} />
                    </div>
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={categoryIcons[product.categories?.name ?? product.category] || faBox}
                          className="text-emerald-600"
                        />
                        <span className="text-gray-900 font-semibold text-sm">
                          {product.categories?.name ?? product.category}
                        </span>
                        {(product.subcategories?.name ?? product.subcategory) && (
                          <>
                            <span className="text-gray-300 text-xs">›</span>
                            <span className="text-gray-600 text-xs font-medium">
                              {product.subcategories?.name ?? product.subcategory}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                      {product.is_negotiable && (
                        <div className="bg-blue-500/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md self-end">
                          <span className="text-white font-semibold text-xs">NEGOCIABIL</span>
                        </div>
                      )}
                      {session && session.user.id !== product.user_id && (
                        <button
                          onClick={() => { if (!alreadyReported) setShowReportModal(true); }}
                          disabled={alreadyReported}
                          title={alreadyReported ? 'Ai raportat deja acest anunț' : 'Raportează anunțul'}
                          className={`self-end w-8 h-8 rounded-full backdrop-blur-sm shadow-md flex items-center justify-center transition ${alreadyReported
                            ? 'bg-red-500/95 cursor-not-allowed'
                            : 'bg-white/80 hover:bg-red-100 text-gray-400 hover:text-red-500'
                            }`}
                        >
                          <FontAwesomeIcon icon={faFlag} className={`text-xs ${alreadyReported ? 'text-white' : ''}`} />
                        </button>
                      )}
                    </div>
                    {allImages.length > 1 && (
                      <>
                        <button onClick={goToPrevious} disabled={isTransitioning}
                          className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-xl flex items-center justify-center transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${isHoveringGallery ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}
                          aria-label="Imagine anterioară">
                          <FontAwesomeIcon icon={faChevronLeft} className="text-gray-800 text-lg" />
                        </button>
                        <button onClick={goToNext} disabled={isTransitioning}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-xl flex items-center justify-center transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${isHoveringGallery ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'}`}
                          aria-label="Imagine următoare">
                          <FontAwesomeIcon icon={faChevronRight} className="text-gray-800 text-lg" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                    <FontAwesomeIcon icon={categoryIcons[product.categories?.name ?? product.category] || faBox} className="text-9xl text-emerald-600" />
                  </div>
                )}
              </div>

            </div>

            {/* Right - Info */}
            <div className="p-8">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-3">{product.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600" />{product.location}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-600" />
                    {new Date(product.created_at).toLocaleDateString('ro-RO')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">

                {/* Preț — ocupă toată lățimea */}
                <div className="col-span-2 bg-gray-50 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold text-emerald-600">{formatPrice(product.price)}</p>
                    <span className="text-xl font-semibold text-gray-700">lei</span>
                    <span className="text-gray-400 text-sm">/ {product.unit}</span>
                  </div>
                </div>
              </div>

              {/* Seller card */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-4">
                <button
                  onClick={() => onNavigate('producator', product.user_id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: getColorForName(product.seller_name) }}>
                    <span className="text-white text-xl font-black uppercase">{product.seller_name?.charAt(0) || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Vânzător</p>
                    <p className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors truncate">
                      {product.seller_name || 'Producător Local'}
                    </p>
                    {sellerRating > 0 && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-xs" />
                        {sellerRating.toFixed(1)}/5.0
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 flex-shrink-0">
                    <span className="text-xs font-semibold">Vezi profil</span>
                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                  </div>
                </button>
                <div className="border-t border-gray-100 mx-5" />
                <div className="p-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { if (!session) { onNavigate('login'); return; } setShowChatModal(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faMessage} /><span>Mesaj</span>
                  </button>
                  <button
                    onClick={handleViewOnMap}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faMapMarkedAlt} className="text-emerald-600" /><span>Pe hartă</span>
                  </button>
                </div>
              </div>

              {allImages.length > 1 && (
                <div className="mt-4">
                  <div className="grid grid-cols-4 gap-2">
                    {allImages.map((imageUrl, index) => (
                      <button
                        key={index}
                        onClick={() => changeImage(index)}
                        disabled={isTransitioning}
                        className={`aspect-square rounded-xl overflow-hidden transition-all duration-300
                          disabled:cursor-not-allowed
                          ${selectedImageIndex === index
                            ? 'shadow-sm border border-gray-200 opacity-100 scale-105'
                            : 'shadow-sm border border-gray-200 opacity-60 hover:scale-105'
                          }`}
                      >
                        <img
                          src={imageUrl}
                          alt={`Miniatură ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Imagine <span className="font-bold text-emerald-600">{selectedImageIndex + 1}</span>
                    {' '}din{' '}
                    <span className="font-semibold text-gray-700">{allImages.length}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {product.description && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faLeaf} className="text-emerald-600" />
              Despre acest produs
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">{product.description}</p>
          </div>
        )}

        <ReviewsSection productId={productId} session={session} productOwnerId={product.user_id} />
      </main>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
              <FontAwesomeIcon icon={faFlag} className="text-red-500" />
              Raportează anunț
            </h3>
            <p className="text-sm text-gray-500 mb-4">Selectează motivul raportării:</p>
            <div className="space-y-2 mb-5">
              {['Spam sau duplicat', 'Preț fals / înșelător', 'Categorie greșită', 'Fraudă sau escrocherie'].map(r => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition border ${reportReason === r
                    ? 'bg-red-50 text-red-700 font-semibold border-red-300'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-transparent'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Detalii suplimentare (opțional)</label>
              <textarea
                value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
                placeholder="Descrie problema mai detaliat..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowReportModal(false); setReportReason(''); setReportDesc(''); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Anulează
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason || reportSubmitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60 flex items-center gap-2"
              >
                {reportSubmitting && <FontAwesomeIcon icon={faFlag} className="animate-pulse" />}
                Trimite raportarea
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductMapModal isOpen={showMapModal} onClose={() => setShowMapModal(false)} product={product} userLocation={userCurrentLocation} />

      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        session={session}
        product={{
          id: product.id,
          name: product.name,
          user_id: product.user_id,
          seller_name: product.seller_name,
          seller_phone: product.seller_phone,
        }}
      />
    </div>
  );
}