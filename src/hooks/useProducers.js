import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export function useProducers(filters = {}) {
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducers();
  }, [
    filters.search,
    filters.marketType,
    filters.location,
    filters.minRating,
    filters.verifiedOnly,
    filters.b2bVerified,
  ]);

  const fetchProducers = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all active products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, user_id, category')
        .eq('status', 'active')
        .range(0, 9999);

      if (productsError) throw productsError;

      if (!productsData || productsData.length === 0) {
        setProducers([]);
        return;
      }

      // 2. Collect unique producer IDs
      const producerIds = [...new Set(productsData.map(p => p.user_id).filter(Boolean))];
      if (producerIds.length === 0) { setProducers([]); return; }

      // 3. Fetch profiles WITH market_type (real column, set by DB trigger)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, official_name, company_name, location, bio, avatar_url, is_verified, role, market_type, b2b_verified')
        .in('id', producerIds)
        .range(0, 4999);

      if (profilesError) throw profilesError;

      if (!profilesData || profilesData.length === 0) {
        setProducers([]);
        return;
      }

      // 4. Fetch ratings from comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('rating, id_produit')
        .in('id_produit', productsData.map(p => p.id))
        .gt('rating', 0);

      // Build product → user_id map
      const productUserMap = {};
      for (const p of productsData) {
        if (p.user_id) productUserMap[p.id] = p.user_id;
      }

      // Build per-producer rating map
      const ratingMap = {};
      if (commentsData) {
        for (const c of commentsData) {
          const uid = productUserMap[c.id_produit];
          if (!uid) continue;
          if (!ratingMap[uid]) ratingMap[uid] = { sum: 0, count: 0 };
          ratingMap[uid].sum += c.rating;
          ratingMap[uid].count += 1;
        }
      }

      // 5. Build producer objects — use profile.market_type directly
      const merged = profilesData.map(profile => {
        const allProducts = productsData.filter(p => p.user_id === profile.id);
        const rating = ratingMap[profile.id];

        return {
          ...profile,
          productCount: allProducts.length,
          categories: [...new Set(allProducts.map(p => p.category).filter(Boolean))],
          avgRating: rating ? parseFloat((rating.sum / rating.count).toFixed(1)) : 0,
          reviewCount: rating?.count || 0,
          marketType: profile.market_type || 'b2c',
        };
      });

      // Sort: verified first, then by productCount desc
      merged.sort((a, b) => {
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return b.productCount - a.productCount;
      });

      // 6. Apply client-side filters
      let result = merged;

      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(p =>
          p.full_name?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.bio?.toLowerCase().includes(q) ||
          p.company_name?.toLowerCase().includes(q)
        );
      }
      if (filters.marketType) {
        result = result.filter(p => {
          const mt = p.marketType;
          if (filters.marketType === 'b2c') return mt === 'b2c' || mt === 'both';
          if (filters.marketType === 'b2b') return mt === 'b2b' || mt === 'both';
          return true;
        });
      }
      if (filters.location) {
        result = result.filter(p =>
          p.location?.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      if (filters.minRating > 0) {
        result = result.filter(p => p.avgRating >= filters.minRating);
      }
      if (filters.verifiedOnly) {
        result = result.filter(p => p.is_verified);
      }
      if (filters.b2bVerified) {
        result = result.filter(p => p.b2b_verified);
      }

      console.log(`useProducers: ${result.length}/${merged.length} producers after filters`);

      setProducers(result);
    } catch (err) {
      console.error('useProducers error:', err);
      setError(err.message || 'Error loading producers');
    } finally {
      setLoading(false);
    }
  };

  return { producers, loading, error };
}
