import { useState } from "react";
import { Cloud, Wind, Droplets, Thermometer, AlertTriangle, RefreshCw, CloudRain, Snowflake, Sun, CloudLightning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface WeatherData {
  available: boolean;
  forecast_type: string;
  temperature?: number;
  feels_like?: number;
  wind_speed?: number;
  wind_gust?: number | null;
  humidity?: number;
  precipitation?: number;
  pop?: number;
  description?: string;
  icon?: string;
  storm_probability?: number;
  message?: string;
  current_temp?: number;
}

interface WeatherSafetyBadgeProps {
  eventLocation: string | null;
  eventDate: string;
  compact?: boolean;
}

const getRiskLevel = (stormProb: number, windSpeed: number, windGust: number | null) => {
  if (stormProb >= 60 || windSpeed > 30 || (windGust && windGust > 40)) {
    return { level: "high", label: "High Risk", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" };
  }
  if (stormProb >= 30 || windSpeed > 20 || (windGust && windGust > 30)) {
    return { level: "medium", label: "Caution", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700" };
  }
  return { level: "low", label: "Clear", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" };
};

const getWeatherIcon = (description: string) => {
  const d = description.toLowerCase();
  if (d.includes("thunder") || d.includes("storm")) return CloudLightning;
  if (d.includes("rain") || d.includes("drizzle")) return CloudRain;
  if (d.includes("snow")) return Snowflake;
  if (d.includes("clear") || d.includes("sun")) return Sun;
  return Cloud;
};

export const WeatherSafetyBadge = ({ eventLocation, eventDate, compact = false }: WeatherSafetyBadgeProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchWeather = async () => {
    if (!eventLocation) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { location: eventLocation, event_date: eventDate },
      });
      if (error) throw error;
      setWeather(data);
      setFetched(true);
    } catch (err) {
      console.error("Weather fetch failed:", err);
      setWeather(null);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  if (!eventLocation) return null;

  if (!fetched) {
    return (
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={fetchWeather} disabled={loading}>
        {loading ? <RefreshCw size={10} className="animate-spin" /> : <Cloud size={10} />}
        Weather
      </Button>
    );
  }

  if (!weather || !weather.available) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] h-5 gap-1 text-muted-foreground cursor-help">
              <Cloud size={10} />
              {weather?.message ? "Too far" : "N/A"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{weather?.message || "Weather data unavailable"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const risk = getRiskLevel(weather.storm_probability || 0, weather.wind_speed || 0, weather.wind_gust || null);
  const WeatherIcon = getWeatherIcon(weather.description || "");

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("text-[10px] h-5 gap-1 cursor-help border", risk.bg, risk.color)}>
              {risk.level === "high" ? <AlertTriangle size={10} /> : <WeatherIcon size={10} />}
              {weather.temperature}°F
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px]">
            <div className="space-y-1.5 text-xs">
              <p className="font-medium capitalize">{weather.description}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="flex items-center gap-1"><Thermometer size={10} /> {weather.temperature}°F</span>
                <span className="flex items-center gap-1"><Wind size={10} /> {weather.wind_speed} mph</span>
                {weather.wind_gust && <span className="flex items-center gap-1"><Wind size={10} /> Gust: {weather.wind_gust} mph</span>}
                <span className="flex items-center gap-1"><Droplets size={10} /> {weather.pop}% rain</span>
              </div>
              <p className={cn("font-medium", risk.color)}>
                {risk.level === "high" && "⚠ "}{risk.label} — Storm risk: {weather.storm_probability}%
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("rounded-md border p-2 space-y-1.5", risk.bg)}>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium flex items-center gap-1", risk.color)}>
          {risk.level === "high" ? <AlertTriangle size={12} /> : <WeatherIcon size={12} />}
          {risk.label}
        </span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={fetchWeather} disabled={loading}>
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Thermometer size={10} /> {weather.temperature}°F</span>
        <span className="flex items-center gap-1"><Wind size={10} /> {weather.wind_speed} mph</span>
        {weather.wind_gust && <span className="flex items-center gap-1"><Wind size={10} /> Gust {weather.wind_gust}</span>}
        <span className="flex items-center gap-1"><Droplets size={10} /> {weather.pop}% rain</span>
      </div>
      {weather.storm_probability !== undefined && weather.storm_probability > 20 && (
        <p className={cn("text-[10px] font-medium", risk.color)}>
          Storm risk: {weather.storm_probability}%
        </p>
      )}
    </div>
  );
};
