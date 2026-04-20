import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeLocation(locationText) {
  if (!MAPBOX_TOKEN) {
    console.log('No MAPBOX_TOKEN, skipping geocode for:', locationText);
    return null;
  }
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationText)}.json?access_token=${MAPBOX_TOKEN}&country=md,ro&language=ro&limit=1`
    );
    const data = await res.json();
    if (data.features?.length > 0) {
      const [lon, lat] = data.features[0].center;
      return { lat, lon };
    }
    return null;
  } catch (e) {
    console.error('Geocode error:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== notify-nearby-events started ===');
    console.log('MAPBOX_TOKEN exists:', !!MAPBOX_TOKEN);

    // 1. Găsește evenimentele publicate care nu au trimis notificări
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, location_text, latitude, longitude, event_date, type')
      .eq('is_published', true)
      .eq('notifications_sent', false)
      .not('location_text', 'is', null);

    if (eventsError) {
      console.error('Events query error:', eventsError);
      throw eventsError;
    }

    console.log('Events found:', events?.length ?? 0);

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: 'No new events to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Geocodează evenimentele fără coordonate
    const geocodedEvents = await Promise.all(
      events.map(async (ev) => {
        if (ev.latitude && ev.longitude) {
          return { ...ev, lat: Number(ev.latitude), lon: Number(ev.longitude) };
        }
        const coords = await geocodeLocation(ev.location_text);
        if (coords) {
          await supabase.from('events').update({
            latitude: coords.lat,
            longitude: coords.lon,
          }).eq('id', ev.id);
          return { ...ev, lat: coords.lat, lon: coords.lon };
        }
        console.log('Could not geocode event:', ev.title, ev.location_text);
        return null;
      })
    );

    const validEvents = geocodedEvents.filter(Boolean);
    console.log('Valid geocoded events:', validEvents.length);

    // 3. Încarcă userii cu notify_events = true și care au locație
    // Folosim profiles direct — event_subscriptions e pentru email global
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, location, location_lat, location_lon, notification_radius_km')
      .eq('notify_events', true)
      .not('location', 'is', null);

    if (usersError) {
      console.error('Users query error:', usersError);
      throw usersError;
    }

    console.log('Users with notifications enabled:', users?.length ?? 0);

    if (!users || users.length === 0) {
      // Marchează evenimentele ca notificate
      await supabase.from('events')
        .update({ notifications_sent: true })
        .in('id', events.map(e => e.id));
      return new Response(JSON.stringify({ message: 'No subscribed users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Geocodează userii fără coordonate cached
    const geocodedUsers = await Promise.all(
      users.map(async (user) => {
        if (user.location_lat && user.location_lon) {
          return { ...user, lat: Number(user.location_lat), lon: Number(user.location_lon) };
        }
        if (!user.location) return null;
        const coords = await geocodeLocation(user.location);
        if (coords) {
          // Cache coordonatele în profil
          await supabase.from('profiles').update({
            location_lat: coords.lat,
            location_lon: coords.lon,
          }).eq('id', user.id);
          return { ...user, lat: coords.lat, lon: coords.lon };
        }
        return null;
      })
    );

    const validUsers = geocodedUsers.filter(Boolean);
    console.log('Users with valid locations:', validUsers.length);

    // 5. Pentru fiecare eveniment, găsește userii apropiați și creează notificări
    const notificationsToInsert = [];

    const TYPE_LABELS = {
      iarmaroc: 'Târg',
      curs_agricol: 'Curs Agricol',
      piata_locala: 'Piață Locală',
    };

    for (const event of validEvents) {
      for (const user of validUsers) {
        const radius = user.notification_radius_km ?? 50;
        const distance = calcDistance(user.lat, user.lon, event.lat, event.lon);

        console.log(`Distance ${user.id} -> ${event.title}: ${distance.toFixed(1)} km (radius: ${radius} km)`);

        if (distance <= radius) {
          const distanceText = distance < 1
            ? 'mai puțin de 1 km'
            : `${Math.round(distance)} km`;

          const eventDate = event.event_date
            ? new Date(event.event_date).toLocaleDateString('ro-RO', {
                day: 'numeric', month: 'long'
              })
            : '';

          notificationsToInsert.push({
            user_id: user.id,
            type: 'new_event',
            title: `${TYPE_LABELS[event.type] ?? 'Eveniment'} în apropiere`,
            body: `"${event.title}" are loc la ${distanceText} de tine${eventDate ? ` pe ${eventDate}` : ''}.`,
            link_type: 'event',
            link_id: event.id,
            is_read: false,
          });
        }
      }
    }

    console.log('Notifications to insert:', notificationsToInsert.length);

    // 6. Insert notificări în batch-uri de 100
    if (notificationsToInsert.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < notificationsToInsert.length; i += BATCH_SIZE) {
        const batch = notificationsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) {
          console.error('Batch insert error:', error);
        }
      }
    }

    // 7. Marchează toate evenimentele procesate ca notificate
    const { error: updateError } = await supabase.from('events')
      .update({ notifications_sent: true })
      .in('id', events.map(e => e.id));

    if (updateError) {
      console.error('Error marking events as notified:', updateError);
    }

    console.log('=== Done ===');

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed: validEvents.length,
        usersChecked: validUsers.length,
        notificationsSent: notificationsToInsert.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});