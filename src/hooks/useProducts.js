import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 12;

const isUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export function useProducts(filters = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);

  const b2bIdsKey = (filters.b2bIds || []).join(',');

  useEffect(() => {
    fetchProducts();
  }, [
    filters.search, filters.categoryId, filters.location,
    filters.minPrice, filters.maxPrice, filters.isNegotiable,
    filters.sortBy, filters.type, filters.verified, filters.page,
    b2bIdsKey,
  ]);

  const fetchProducts = async () => {
    const fetchStart = Date.now();
    try {
      setLoading(true);
      let query = supabase
        .from('products_with_user')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      const b2bIds = filters.b2bIds || [];

      if (filters.categoryId) {
        if (isUUID(filters.categoryId)) {
          query = query.or(`category_id.eq.${filters.categoryId},subcategory_id.eq.${filters.categoryId}`);
        } else {
          query = query.eq('category', filters.categoryId);
        }
      } else if (filters.type === 'b2b') {
        if (b2bIds.length > 0) query = query.in('category_id', b2bIds);
      } else if (filters.type === 'b2c') {
        if (b2bIds.length > 0) query = query.not('category_id', 'in', `(${b2bIds.join(',')})`);
      }

      if (filters.search) query = query.ilike('name', `%${filters.search}%`);
      if (filters.location) query = query.ilike('location', `%${filters.location}%`);
      if (filters.isNegotiable) query = query.eq('is_negotiable', true);
      if (filters.minPrice) query = query.gte('price', parseFloat(filters.minPrice));
      if (filters.maxPrice) query = query.lte('price', parseFloat(filters.maxPrice));
      if (filters.verified) query = query.eq('verified', true);

      switch (filters.sortBy) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }

      const page = filters.page || 1;
      const from = (page - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      setProducts(data || []);
      setTotalProducts(count || 0);
    } catch {
      toast.error('Eroare la încărcarea produselor');
    } finally {
      const elapsed = Date.now() - fetchStart;
      const remaining = Math.max(0, 1500 - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  return { products, loading, totalProducts };
}
