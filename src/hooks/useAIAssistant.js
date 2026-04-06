import { useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';




export function useAIAssistant(session) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const fetchPlatformContext = async () => {
    let context = '';

    try {
      // ALWAYS fetch active products
      const { data: products } = await supabase
        .from('products_with_user')
        .select('name, price, unit, category, location, seller_name, is_negotiable')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);

      if (products?.length > 0) {
        context += `\n\nPRODUSE ACTIVE PE PLATFORMĂ (${products.length} produse):\n`;
        products.forEach(p => {
          context += `- ${p.name}: ${p.price} lei/${p.unit || 'buc'}, categorie: ${p.category || '—'}, locație: ${p.location || '—'}, vânzător: ${p.seller_name || '—'}${p.is_negotiable ? ' (negociabil)' : ''}\n`;
        });
      } else {
        context += `\n\nPRODUSE ACTIVE PE PLATFORMĂ: Niciun produs activ momentan.\n`;
      }

      // ALWAYS fetch producers
      const { data: producers } = await supabase
        .from('profiles')
        .select('full_name, location, bio, is_verified, market_type, company_name, b2b_verified')
        .not('full_name', 'is', null)
        .limit(20);

      if (producers?.length > 0) {
        context += `\n\nPRODUCĂTORI/FURNIZORI PE PLATFORMĂ (${producers.length}):\n`;
        producers.forEach(p => {
          const typeLabel = p.market_type === 'b2b' ? 'Servicii & Utilaje'
                          : p.market_type === 'both' ? 'Alimentar & Servicii'
                          : 'Produse Alimentare';
          context += `- ${p.full_name || '—'}${p.company_name ? ` (${p.company_name})` : ''}: ${p.location || '—'}, tip: ${typeLabel}${p.is_verified ? ' ✓verificat' : ''}${p.b2b_verified ? ' ✓prestator verificat' : ''}\n`;
        });
      }

      // ALWAYS fetch upcoming events
      const { data: events } = await supabase
        .from('events')
        .select('title, description, event_date, end_date, location_text, type')
        .eq('is_published', true)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(10);

      if (events?.length > 0) {
        context += `\n\nEVENIMENTE VIITOARE (${events.length}):\n`;
        events.forEach(e => {
          const date = new Date(e.event_date).toLocaleDateString('ro-RO', {
            day: 'numeric', month: 'long', year: 'numeric'
          });
          context += `- ${e.title}: ${date}, locație: ${e.location_text || '—'}, tip: ${e.type}\n`;
          if (e.description) context += `  Descriere: ${e.description.slice(0, 100)}\n`;
        });
      } else {
        context += `\n\nEVENIMENTE VIITOARE: Niciun eveniment programat momentan.\n`;
      }

      // Platform stats
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: producerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('full_name', 'is', null);

      context += `\n\nSTATISTICI PLATFORMĂ: ${productCount || 0} produse active, ${producerCount || 0} utilizatori înregistrați.\n`;

    } catch (err) {
      console.error('Context fetch error:', err);
      context += '\n\nEroare la încărcarea datelor platformei.\n';
    }

    return context;
  };

  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim() || loading) return;

    const userMsg = { role: 'user', content: userMessage, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // 1. Salvare în Supabase (User)
      if (session?.user?.id) {
        await supabase.from('ai_chat_history').insert({
          user_id: session.user.id,
          session_id: sessionId,
          role: 'user',
          content: userMessage,
        });
      }

      // 2. Preluare context din DB (Produse/Producători/Evenimente)
      const platformContext = await fetchPlatformContext();

      // 3. Apelul către Edge Function prin supabase.functions.invoke
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          model: 'gpt-4o-mini',
          userId: session?.user?.id || 'anonymous',
          messages: [
            {
              role: 'system',
              content: `Ești asistentul virtual al platformei Sezon — o piață agricolă locală din Moldova.

REGULI STRICTE:
1. Bazează-te EXCLUSIV pe datele reale furnizate mai jos. Nu inventa nimic.
2. Dacă un produs are locația "Chișinău, sectorul Ciocana", afișează-l EXACT sub acea locație.
3. Dacă nu există produse pentru o locație cerută, spune: "Nu avem oferte în această zonă momentan."
4. NU afișa liste goale. Dacă lista e goală, spune că nu există oferte.
5. Răspunde în limba utilizatorului: română, engleză sau franceză.
6. Fii concis — maxim 5-6 rânduri per răspuns.
7. Format produse: "**Nume** — Preț lei/unitate · Locație · Vânzător"
8. Nu repeta întrebarea utilizatorului.

DATE REALE DE PE PLATFORMĂ:
${platformContext}`,
            },
            ...messages.slice(-6).map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            {
              role: 'user',
              content: userMessage,
            },
          ],
        },
      });

      if (error) {
        console.error('AI proxy error:', error);

        if (error.status === 429 || error.message?.includes('rate_limited')) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: error.message || 'Limita de cereri atinsă. Încearcă din nou în câteva minute.',
            id: Date.now() + 1,
            isError: true,
            isRateLimit: true,
          }]);
          setLoading(false);
          return;
        }

        throw new Error(error.message || 'Eroare la serviciul AI');
      }

      const assistantText = data?.choices?.[0]?.message?.content ||
                           'Îmi pare rău, nu am putut genera un răspuns.';

      // 5. Salvare răspuns AI în State și Supabase
      const assistantMsg = { role: 'assistant', content: assistantText, id: Date.now() + 1 };
      setMessages(prev => [...prev, assistantMsg]);

      if (session?.user?.id) {
        await supabase.from('ai_chat_history').insert({
          user_id: session.user.id,
          session_id: sessionId,
          role: 'assistant',
          content: assistantText,
        });
      }

    } catch (err) {
      console.error('AI Assistant error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Eroare de conexiune. Verifică setările API.',
        id: Date.now() + 1,
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, session, sessionId]);

  const clearHistory = () => setMessages([]);

  return { messages, loading, sendMessage, clearHistory };
}
