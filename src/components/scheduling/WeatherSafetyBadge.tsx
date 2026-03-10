import { useState } from "react";
import { Cloud, Wind, Droplets, Thermometer, AlertTriangle, RefreshCw, CloudRain, Snowflake, Sun, CloudLightning, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface WeatherData {
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
  onWeatherLoaded?: (data: WeatherData | null) => void;
}

// Inflatable-specific wind thresholds (mph)
const WIND_SAFE_MAX = 15;
const WIND_CAUTION_MAX = 20;
// Above 20 = unsafe

export type SafetyLevel = "safe" | "caution" | "unsafe";

export const getInflatableSafetyLevel = (windSpeed: number, windGust: number | null): SafetyLevel => {
  const effectiveWind = Math.max(windSpeed, windGust || 0);
  if (effectiveWind > WIND_CAUTION_MAX) return "unsafe";
  if (effectiveWind > WIND_SAFE_MAX) return "caution";
  return "safe";
};

const getSafetyConfig = (level: SafetyLevel) => {
  switch (level) {
    case "unsafe":
      return {
        label: "Unsafe",
        icon: ShieldOff,
        color: "text-destructive",
        bg: "bg-destructive/10 border-destructive/30",
        dotColor: "bg-destructive",
        message: "Wind conditions may exceed safe inflatable operating limits. Review SIOTO safety guidelines.",
      };
    case "caution":
      return {
        label: "Caution",
        icon: ShieldAlert,
        color: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700",
        dotColor: "bg-yellow-500",
        message: "Wind speeds approaching inflatable safety limits. Monitor conditions closely before setup.",
      };
    case "safe":
    default:
      return {
        label: "Safe",
        icon: ShieldCheck,
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700",
        dotColor: "bg-green-500",
        message: "Conditions within safe operating limits for inflatables.",
      };
  }
};

const getWeatherIcon = (description: string) => {
  const d = description.toLowerCase();
  if (d.includes("thunder") || d.includes("storm")) return CloudLightning;
  if (d.includes("rain") || d.includes("drizzle")) return CloudRain;
  if (d.includes("snow")) return Snowflake;
  if (d.includes("clear") || d.includes("sun")) return Sun;
  return Cloud;
};

export const WeatherSafetyBadge = ({ eventLocation, eventDate, compact = false, onWeatherLoaded }: WeatherSafetyBadgeProps) => {
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
      onWeatherLoaded?.(data);
    } catch (err) {
      console.error("Weather fetch failed:", err);
      setWeather(null);
      setFetched(true);
      onWeatherLoaded?.(null);
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

  const safetyLevel = getInflatableSafetyLevel(weather.wind_speed || 0, weather.wind_gust || null);
  const safety = getSafetyConfig(safetyLevel);
  const SafetyIcon = safety.icon;
  const WeatherIcon = getWeatherIcon(weather.description || "");

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("text-[10px] h-5 gap-1 cursor-help border", safety.bg, safety.color)}>
              <span className={cn("inline-block w-1.5 h-1.5 rounded-full", safety.dotColor)} />
              <SafetyIcon size={10} />
              {weather.temperature}°F · {weather.wind_speed} mph
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px]" side="bottom">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <WeatherIcon size={12} />
                <span className="font-medium capitalize">{weather.description}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="flex items-center gap-1"><Thermometer size={10} /> {weather.temperature}°F (feels {weather.feels_like}°F)</span>
                <span className="flex items-center gap-1"><Wind size={10} /> {weather.wind_speed} mph</span>
                {weather.wind_gust && <span className="flex items-center gap-1"><Wind size={10} /> Gust: {weather.wind_gust} mph</span>}
                <span className="flex items-center gap-1"><Droplets size={10} /> {weather.pop}% rain</span>
              </div>

              <div className={cn("flex items-start gap-1.5 rounded p-1.5 border", safety.bg)}>
                <SafetyIcon size={12} className={cn("mt-0.5 shrink-0", safety.color)} />
                <div>
                  <p className={cn("font-semibold", safety.color)}>Inflatable Safety: {safety.label}</p>
                  <p className="text-muted-foreground leading-tight mt-0.5">{safety.message}</p>
                </div>
              </div>

              {weather.storm_probability !== undefined && weather.storm_probability > 20 && (
                <p className="text-destructive font-medium flex items-center gap-1">
                  <AlertTriangle size={10} /> Storm risk: {weather.storm_probability}%
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Expanded view
  return (
    <div className={cn("rounded-md border p-2.5 space-y-2", safety.bg)}>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-semibold flex items-center gap-1.5", safety.color)}>
          <SafetyIcon size={14} />
          Inflatable Safety: {safety.label}
        </span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={fetchWeather} disabled={loading}>
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {safetyLevel !== "safe" && (
        <p className={cn("text-[11px] leading-snug font-medium", safety.color)}>
          {safety.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Thermometer size={10} /> {weather.temperature}°F</span>
        <span className="flex items-center gap-1">
          <Wind size={10} />
          <span className={cn(
            (weather.wind_speed || 0) > WIND_SAFE_MAX && "font-bold",
            (weather.wind_speed || 0) > WIND_CAUTION_MAX ? "text-destructive" : (weather.wind_speed || 0) > WIND_SAFE_MAX ? "text-yellow-600 dark:text-yellow-400" : ""
          )}>
            {weather.wind_speed} mph
          </span>
        </span>
        {weather.wind_gust && (
          <span className="flex items-center gap-1">
            <Wind size={10} />
            <span className={cn(
              "font-medium",
              weather.wind_gust > WIND_CAUTION_MAX ? "text-destructive" : weather.wind_gust > WIND_SAFE_MAX ? "text-yellow-600 dark:text-yellow-400" : ""
            )}>
              Gust {weather.wind_gust} mph
            </span>
          </span>
        )}
        <span className="flex items-center gap-1"><Droplets size={10} /> {weather.pop}% rain</span>
      </div>

      {weather.storm_probability !== undefined && weather.storm_probability > 20 && (
        <p className="text-[10px] font-semibold text-destructive flex items-center gap-1">
          <AlertTriangle size={10} /> Storm risk: {weather.storm_probability}%
        </p>
      )}

      {/* Wind threshold legend */}
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> &lt;15 mph</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> 15–20 mph</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive" /> &gt;20 mph</span>
      </div>
    </div>
  );
};
