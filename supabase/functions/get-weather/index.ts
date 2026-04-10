import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!API_KEY) {
      throw new Error('OPENWEATHERMAP_API_KEY is not configured');
    }

    const { location, event_date } = await req.json();
    if (!location) {
      return new Response(JSON.stringify({ error: 'Location is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Geocode the location
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      return new Response(JSON.stringify({ error: 'Location not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { lat, lon } = geoData[0];

    // Check if event is within 5-day forecast range
    const now = new Date();
    const eventDateObj = event_date ? new Date(event_date) : now;
    const diffDays = (eventDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    let weatherResult;

    if (diffDays <= 5) {
      // Use 5-day/3-hour forecast
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
      const forecastRes = await fetch(forecastUrl);
      const forecastData = await forecastRes.json();

      if (!forecastRes.ok) {
        throw new Error(`OpenWeatherMap forecast error [${forecastRes.status}]: ${JSON.stringify(forecastData)}`);
      }

      // Find the forecast closest to the event date (noon)
      const targetTime = new Date(eventDateObj);
      targetTime.setHours(12, 0, 0, 0);
      
      let closest = forecastData.list[0];
      let minDiff = Infinity;
      
      for (const entry of forecastData.list) {
        const entryTime = new Date(entry.dt * 1000);
        const diff = Math.abs(entryTime.getTime() - targetTime.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closest = entry;
        }
      }

      weatherResult = {
        available: true,
        forecast_type: 'forecast',
        temperature: Math.round(closest.main.temp),
        feels_like: Math.round(closest.main.feels_like),
        wind_speed: Math.round(closest.wind.speed),
        wind_gust: closest.wind.gust ? Math.round(closest.wind.gust) : null,
        humidity: closest.main.humidity,
        precipitation: closest.rain?.['3h'] || closest.snow?.['3h'] || 0,
        pop: Math.round((closest.pop || 0) * 100), // probability of precipitation %
        description: closest.weather?.[0]?.description || '',
        icon: closest.weather?.[0]?.icon || '',
        storm_probability: calculateStormRisk(closest),
      };
    } else {
      // Event too far out, get current weather as reference only
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
      const currentRes = await fetch(currentUrl);
      const currentData = await currentRes.json();

      if (!currentRes.ok) {
        throw new Error(`OpenWeatherMap current error [${currentRes.status}]: ${JSON.stringify(currentData)}`);
      }

      weatherResult = {
        available: false,
        forecast_type: 'too_far',
        message: `Event is ${Math.round(diffDays)} days away. Forecast available within 5 days.`,
        current_temp: Math.round(currentData.main.temp),
      };
    }

    return new Response(JSON.stringify(weatherResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Failed to fetch weather' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateStormRisk(forecast: any): number {
  let risk = 0;
  const windSpeed = forecast.wind?.speed || 0;
  const windGust = forecast.wind?.gust || 0;
  const pop = forecast.pop || 0;
  const weatherId = forecast.weather?.[0]?.id || 800;

  // Thunderstorm codes: 2xx
  if (weatherId >= 200 && weatherId < 300) risk += 80;
  // Rain codes: 5xx  
  else if (weatherId >= 500 && weatherId < 600) risk += 30;
  // Snow: 6xx
  else if (weatherId >= 600 && weatherId < 700) risk += 20;

  // High wind
  if (windSpeed > 25) risk += 30;
  else if (windSpeed > 15) risk += 15;

  // Gusts
  if (windGust > 35) risk += 20;
  else if (windGust > 25) risk += 10;

  // Precipitation probability
  risk += pop * 20;

  return Math.min(100, Math.round(risk));
}
