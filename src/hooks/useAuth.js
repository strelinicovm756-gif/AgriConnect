import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Hook personalizat pentru gestionarea autentificării
 * Înlocuiește logica de autentificare din App.jsx
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obține sesiunea inițială
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Ascultă pentru schimbări în autentificare
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}