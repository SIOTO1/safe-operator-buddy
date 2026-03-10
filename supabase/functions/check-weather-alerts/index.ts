import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WIND_SAFE_MAX = 15;
const WIND_CAUTION_MAX = 20;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!API_KEY) throw new Error('OPENWEATHERMAP_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get events in the next 48 hours that have a location
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];
    const futureStr = in48h.toISOString().split('T')[0];

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date, location, created_by')
      .gte('event_date', todayStr)
      .lte('event_date', futureStr)
      .not('location', 'is', null);

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ checked: 0, alerts: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let alertCount = 0;

    for (const event of events) {
      if (!event.location) continue;

      try {
        // Geocode the location
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(event.location)}&limit=1&appid=${API_KEY}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if (!geoData || geoData.length === 0) continue;

        const { lat, lon } = geoData[0];

        // Get forecast
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
        const forecastRes = await fetch(forecastUrl);
        const forecastData = await forecastRes.json();
        if (!forecastRes.ok) continue;

        // Find forecast closest to event date noon
        const targetTime = new Date(event.event_date + 'T12:00:00');
        let closest = forecastData.list[0];
        let minDiff = Infinity;
        for (const entry of forecastData.list) {
          const diff = Math.abs(new Date(entry.dt * 1000).getTime() - targetTime.getTime());
          if (diff < minDiff) { minDiff = diff; closest = entry; }
        }

        const windSpeed = closest.wind?.speed || 0;
        const windGust = closest.wind?.gust || 0;
        const effectiveWind = Math.max(windSpeed, windGust);

        if (effectiveWind <= WIND_SAFE_MAX) continue; // Safe, no alert needed

        const severity = effectiveWind > WIND_CAUTION_MAX ? 'critical' : 'warning';
        const safetyLabel = effectiveWind > WIND_CAUTION_MAX ? 'UNSAFE' : 'CAUTION';

        // Check for existing recent alert for this event (within last 6 hours)
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('event_id', event.id)
          .eq('type', 'weather_alert')
          .gte('created_at', sixHoursAgo)
          .limit(1);

        if (existing && existing.length > 0) continue; // Already alerted recently

        // Get all assigned crew for this event
        const { data: assignments } = await supabase
          .from('event_assignments')
          .select('user_id')
          .eq('event_id', event.id);

        // Build list of users to notify: event creator + assigned crew
        const userIds = new Set<string>();
        if (event.created_by) userIds.add(event.created_by);
        if (assignments) {
          for (const a of assignments) userIds.add(a.user_id);
        }

        if (userIds.size === 0) continue;

        const title = `⚠ Weather Alert: ${safetyLabel}`;
        const message = `Weather conditions may exceed safe operating limits for inflatables at "${event.title}" on ${event.event_date}. Wind: ${Math.round(windSpeed)} mph${windGust > windSpeed ? `, gusts ${Math.round(windGust)} mph` : ''}. Review SIOTO safety guidelines.`;

        // Create notifications for each user
        const notifications = Array.from(userIds).map(userId => ({
          user_id: userId,
          event_id: event.id,
          type: 'weather_alert',
          title,
          message,
          severity,
          metadata: {
            wind_speed: Math.round(windSpeed),
            wind_gust: Math.round(windGust),
            temperature: Math.round(closest.main?.temp || 0),
            description: closest.weather?.[0]?.description || '',
            safety_level: effectiveWind > WIND_CAUTION_MAX ? 'unsafe' : 'caution',
          },
        }));

        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (insertError) {
          console.error(`Failed to insert notifications for event ${event.id}:`, insertError);
        } else {
          alertCount += notifications.length;
        }
      } catch (eventErr) {
        console.error(`Error processing event ${event.id}:`, eventErr);
      }
    }

    return new Response(JSON.stringify({ checked: events.length, alerts: alertCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather check error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
