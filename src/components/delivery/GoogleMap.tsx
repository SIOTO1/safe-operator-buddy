import { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = "AIzaSyAvgeAk2xd_fiRhSRcRPPAUuNIgfDD58rc";

interface MapStop {
  lat: number;
  lng: number;
  label: string;
  order: number;
}

interface GoogleMapProps {
  stops: MapStop[];
  className?: string;
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMaps(): Promise<void> {
  if (scriptLoaded && window.google?.maps) return Promise.resolve();
  return new Promise((resolve) => {
    if (scriptLoading) {
      loadCallbacks.push(resolve);
      return;
    }
    scriptLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    google: any;
  }
}

const GoogleMap = ({ stops, className }: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadGoogleMaps().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 39.8283, lng: -98.5795 },
        mapTypeControl: false,
        streetViewControl: false,
      });
    }

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);

    if (stops.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    const path: any[] = [];

    stops
      .sort((a, b) => a.order - b.order)
      .forEach((stop, i) => {
        const pos = { lat: stop.lat, lng: stop.lng };
        bounds.extend(pos);
        path.push(pos);

        const marker = new window.google.maps.Marker({
          position: pos,
          map: mapInstance.current,
          label: {
            text: String(i + 1),
            color: "white",
            fontWeight: "bold",
          },
          title: stop.label,
        });
        markersRef.current.push(marker);
      });

    if (path.length > 1) {
      polylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "hsl(24, 95%, 53%)",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapInstance.current,
      });
    }

    mapInstance.current.fitBounds(bounds);
    if (stops.length === 1) mapInstance.current.setZoom(14);
  }, [ready, stops]);

  return (
    <div ref={mapRef} className={className ?? "w-full h-[400px] rounded-lg border border-border"} />
  );
};

export default GoogleMap;
