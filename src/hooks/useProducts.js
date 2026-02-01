import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Hook pentru gestionarea produselor din baza de date
 * Când ai tabela 'products' în Supabase, acest hook va funcționa automat
 */
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
        .select('*')
        .order('created_at', { ascending: false });

      // Aplică filtre dacă există
      if (filters.location) {
        query = query.eq('location', filters.location);
      }
      if (filters.category) {
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