import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const geocodeCache: Record<string, { lat: number; lon: number } | null> = {};

async function geocodeLocation(locationText: string): Promise<{ lat: number; lon: number } | null> {
  if (locationText in geocodeCache) return geocodeCache[locationText];
  if (!MAPBOX_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationText)}.json?access_token=${MAPBOX_TOKEN}&country=md,ro&language=ro&limit=1`
    );
    const data = await res.json();
    if (data.features?.length > 0) {
      const [lon, lat] = data.features[0].center;
      geocodeCache[locationText] = { lat, lon };
      return { lat, lon };
    }
    geocodeCache[locationText] = null;
    return null;
  } catch (e) {
    console.error('Geocode error for', locationText, ':', e);
    return null;
  }
}

const TYPE_LABELS: Record<string, string> = {
  iarmaroc: 'Târg',
  curs_agricol: 'Curs Agricol',
  piata_locala: 'Piață Locală',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try { await req.text(); } catch (_) { /* ignore */ }

  try {
    console.log('=== notify-nearby-events started ===');

    // 1. Load published events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, location_text, latitude, longitude, event_date, type')
      .eq('is_published', true)
      .not('location_text', 'is', null);

    if (eventsError) throw eventsError;
    console.log('Events found:', events?.length ?? 0);

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: 'No events found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Geocode events without coordinates
    const geocodedEvents = await Promise.all(
      events.map(async (ev) => {
        if (ev.latitude && ev.longitude) {
          return { ...ev, lat: Number(ev.latitude), lon: Number(ev.longitude) };
        }
        const coords = await geocodeLocation(ev.location_text);
        if (coords) {
          await supabase.from('events').update({
            latitude: coords.lat, longitude: coords.lon
          }).eq('id', ev.id);
          return { ...ev, lat: coords.lat, lon: coords.lon };
        }
        return null;
      })
    );
    const validEvents = geocodedEvents.filter(Boolean) as any[];
    console.log('Valid geocoded events:', validEvents.length);

    // 3. Load users with notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, location, location_lat, location_lon, notification_radius_km, notification_locations, notification_locations_coords')
      .eq('notify_events', true)
      .not('location', 'is', null);

    if (usersError) throw usersError;
    console.log('Users with notifications enabled:', users?.length ?? 0);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscribed users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Geocode users + build location list
    const geocodedUsers = await Promise.all(
      users.map(async (user) => {
        let mainCoords = null;
        if (user.location_lat && user.location_lon) {
          mainCoords = { lat: Number(user.location_lat), lon: Number(user.location_lon) };
        } else if (user.location) {
          mainCoords = await geocodeLocation(user.location);
          if (mainCoords) {
            await supabase.from('profiles').update({
              location_lat: mainCoords.lat, location_lon: mainCoords.lon,
            }).eq('id', user.id);
          }
        }

        const extraLocations: { name: string; lat: number; lon: number }[] = [];

        if (Array.isArray(user.notification_locations_coords) && user.notification_locations_coords.length > 0) {
          for (const locCoords of user.notification_locations_coords) {
            if (locCoords?.lat && locCoords?.lon) {
              extraLocations.push({
                name: locCoords.name,
                lat: Number(locCoords.lat),
                lon: Number(locCoords.lon),
              });
            } else if (locCoords?.name) {
              const coords = await geocodeLocation(locCoords.name);
              if (coords) {
                extraLocations.push({ name: locCoords.name, lat: coords.lat, lon: coords.lon });
              }
            }
          }
        } else if (Array.isArray(user.notification_locations) && user.notification_locations.length > 0) {
          for (const locName of user.notification_locations) {
            const coords = await geocodeLocation(locName);
            if (coords) {
              extraLocations.push({ name: locName, lat: coords.lat, lon: coords.lon });
            }
          }
        }

        if (!mainCoords && extraLocations.length === 0) return null;
        return { ...user, mainCoords, extraLocations };
      })
    );

    const validUsers = geocodedUsers.filter(Boolean) as any[];
    console.log('Users with valid locations:', validUsers.length);

    // 5. Load already-sent notifications
    // KEY: "eventId_userId_locationName" — tracks per location independently
    const eventIds = validEvents.map((e) => e.id);

    const { data: alreadySent } = await supabase
      .from('event_notifications_sent')
      .select('event_id, user_id, location_name')
      .in('event_id', eventIds);

    const sentSet = new Set(
      (alreadySent || []).map((r) => `${r.event_id}_${r.user_id}_${r.location_name ?? 'main'}`)
    );
    console.log('Already sent combinations:', sentSet.size);

    const notificationsToInsert: any[] = [];
    const trackingToInsert: any[] = [];

    for (const event of validEvents) {
      for (const user of validUsers) {
        const radius = user.notification_radius_km ?? 50;

        // --- Check MAIN location ---
        if (user.mainCoords) {
          const locationName = user.location as string;
          const key = `${event.id}_${user.id}_main`;

          if (!sentSet.has(key)) {
            const dist = calcDistance(user.mainCoords.lat, user.mainCoords.lon, event.lat, event.lon);
            console.log(`[MAIN] "${locationName}" → "${event.title}": ${dist.toFixed(1)}km / radius ${radius}km`);

            if (dist <= radius) {
              const distText = dist < 1 ? 'mai puțin de 1 km' : `${Math.round(dist)} km`;
              const eventDate = event.event_date
                ? new Date(event.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })
                : '';

              notificationsToInsert.push({
                user_id: user.id,
                type: 'new_event',
                title: `${TYPE_LABELS[event.type] ?? 'Eveniment'} în ${locationName}`,
                body: `"${event.title}" are loc la ${distText} de ${locationName}${eventDate ? ` pe ${eventDate}` : ''}.`,
                link_type: 'event',
                link_id: event.id,
                is_read: false,
              });

              trackingToInsert.push({
                event_id: event.id,
                user_id: user.id,
                location_name: 'main',
              });

              console.log(`✅ [MAIN] Queued for user=${user.id} via "${locationName}"`);
            }
          }
        }

        // --- Check EXTRA locations independently ---
        for (const extraLoc of user.extraLocations) {
          const locKey = extraLoc.name.toLowerCase().replace(/\s+/g, '_');
          const key = `${event.id}_${user.id}_${locKey}`;

          if (!sentSet.has(key)) {
            const dist = calcDistance(extraLoc.lat, extraLoc.lon, event.lat, event.lon);
            console.log(`[EXTRA] "${extraLoc.name}" → "${event.title}": ${dist.toFixed(1)}km / radius ${radius}km`);

            if (dist <= radius) {
              const distText = dist < 1 ? 'mai puțin de 1 km' : `${Math.round(dist)} km`;
              const eventDate = event.event_date
                ? new Date(event.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })
                : '';

              notificationsToInsert.push({
                user_id: user.id,
                type: 'new_event',
                title: `${TYPE_LABELS[event.type] ?? 'Eveniment'} în ${extraLoc.name}`,
                body: `"${event.title}" are loc la ${distText} de ${extraLoc.name}${eventDate ? ` pe ${eventDate}` : ''}.`,
                link_type: 'event',
                link_id: event.id,
                is_read: false,
              });

              trackingToInsert.push({
                event_id: event.id,
                user_id: user.id,
                location_name: locKey,
              });

              console.log(`✅ [EXTRA] Queued for user=${user.id} via "${extraLoc.name}"`);
            }
          }
        }
      }
    }

    console.log(`Creating ${notificationsToInsert.length} notifications`);

    const BATCH = 100;
    if (notificationsToInsert.length > 0) {
      for (let i = 0; i < notificationsToInsert.length; i += BATCH) {
        const { error } = await supabase
          .from('notifications')
          .insert(notificationsToInsert.slice(i, i + BATCH));
        if (error) console.error('Notifications batch error:', error);
      }

      for (let i = 0; i < trackingToInsert.length; i += BATCH) {
        const { error } = await supabase
          .from('event_notifications_sent')
          .insert(trackingToInsert.slice(i, i + BATCH));
        if (error) console.error('Tracking batch error:', error);
      }
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