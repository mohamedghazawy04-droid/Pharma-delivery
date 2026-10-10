import { LocationCoordinates } from '../types';

export const PHARMACY_BASE_LOCATION: LocationCoordinates = {
  lat: 30.05688,
  lng: 31.20572,
  address: 'صيدليه الديب - الحي ١١ الاتحاد التعاوني',
};

// Calculate distance between two coordinates in meters (Haversine formula)
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Calculate distance between two coordinates in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return Number((calculateDistanceMeters(lat1, lon1, lat2, lon2) / 1000).toFixed(2));
}

// Format coordinates nicely (e.g., 30.048821° N, 31.211245° E)
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
}

// Reverse Geocoding with memory cache to resolve genuine addresses from physical GPS coordinates
const geocodeCache = new Map<string, string>();

export async function fetchRealAddressFromCoords(
  lat: number,
  lng: number
): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`,
      {
        headers: {
          'Accept-Language': 'ar',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        // Shorten address for clean UI
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        const shortAddr = parts.slice(0, 3).join('، ');
        geocodeCache.set(key, shortAddr);
        return shortAddr;
      }
    }
  } catch (e) {
    // Graceful fallback to formatted coordinate
  }

  const fallback = `إحداثيات GPS: (${formatCoordinates(lat, lng)})`;
  geocodeCache.set(key, fallback);
  return fallback;
}

// Generate realistic simulated movement jitter or walk
export function getSimulatedNextPosition(
  currentLat: number,
  currentLng: number,
  stepDelta = 0.0008
): { lat: number; lng: number } {
  // random angle with slight bias
  const angle = Math.random() * Math.PI * 2;
  const newLat = currentLat + Math.sin(angle) * stepDelta;
  const newLng = currentLng + Math.cos(angle) * stepDelta;
  return {
    lat: Number(newLat.toFixed(6)),
    lng: Number(newLng.toFixed(6)),
  };
}

// Format seconds into Arabic MM:SS
export function formatDurationSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} دقيقة و ${secs < 10 ? '0' : ''}${secs} ثانية`;
}
