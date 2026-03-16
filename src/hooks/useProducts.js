import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export function useProducts(filters = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('products')
        .select('*, categories(id, name, slug, icon), subcategories(id, name, slug)')
        .order('created_at', { ascending: false });

      if (filters.location) {
        query = query.eq('location', filters.location);
      }
      // Category filter: prefer categoryId (UUID FK), fall back to category (varchar)
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      } else if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.verified) {
        query = query.eq('verified', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, error, refetch: fetchProducts };
}
