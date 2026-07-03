import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyCpMhqetQskMUsPFiHNNka6K1NsZutU8KM";
const MAP_ID = "DEMO_MAP_ID";

const loader = new Loader({
  apiKey: GOOGLE_MAPS_API_KEY,
  version: "weekly",
  libraries: ["places", "marker", "geocoding"],
});

/* ── Public types ── */
export interface MapPickerResult {
  lat: number;
  lng: number;
  street?: string;
  area?: string;
  city?: string;
  emirate?: string;
}

interface Props {
  onSelect: (result: MapPickerResult) => void;
  defaultLat?: number;
  defaultLng?: number;
}

/* ── Parse Geocoder address components ── */
function parseGeocoderComponents(components: any[]): Partial<MapPickerResult> {

  const get = (type: string) =>
    (components || []).find((c: any) => c.types?.includes(type))?.long_name ?? "";

  return {
    street: [get("street_number"), get("route")].filter(Boolean).join(" ") || undefined,

    area:
      get("sublocality_level_1") ||
      get("sublocality") ||
      get("neighborhood") ||
      get("administrative_area_level_2") ||
      undefined,

    city: get("locality") || get("postal_town") || undefined,

    emirate: get("administrative_area_level_1") || undefined,
  };
}

/* ── Parse Places API components ── */
function parsePlaceComponents(components: any[]): Partial<MapPickerResult> {
  const get = (type: string) => {
    const component = (components || []).find((c: any) => c.types?.includes(type));
    return component?.long_name || component?.longText || "";
  };

  return {
    street: [get("street_number"), get("route")].filter(Boolean).join(" ") || undefined,

    area:
      get("sublocality_level_1") ||
      get("sublocality") ||
      get("neighborhood") ||
      get("administrative_area_level_2") ||
      undefined,

    city: get("locality") || get("postal_town") || undefined,

    emirate: get("administrative_area_level_1") || undefined,
  };
}

export default function GoogleMapPicker({
  onSelect,
  defaultLat = 25.2048,
  defaultLng = 55.2708,
}: Props) {

  const mapDivRef = useRef<HTMLDivElement>(null);
  const acInputRef = useRef<HTMLInputElement>(null);

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  const initializedRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState("");

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {

      if (!geocoderRef.current) return;

      try {

        const { results } =
          await geocoderRef.current.geocode({
            location: { lat, lng },
          });

        if (results?.[0]) {

          setAddress(results[0].formatted_address ?? "");

          onSelect({
            lat,
            lng,
            ...parseGeocoderComponents(
              results[0].address_components ?? []
            ),
          });

        } else {

          onSelect({ lat, lng });

        }

      } catch {

        onSelect({ lat, lng });

      }
    },
    [onSelect]
  );

  const initMap = useCallback(async () => {

    if (
      initializedRef.current ||
      mapRef.current ||
      !mapDivRef.current ||
      !window.google?.maps?.importLibrary
    ) {
      return;
    }

    initializedRef.current = true;

    try {

      const [
        { Map },
        { AdvancedMarkerElement },
        { Geocoder },
      ] = (await Promise.all([
        window.google.maps.importLibrary("maps"),
        window.google.maps.importLibrary("marker"),
        window.google.maps.importLibrary("geocoding"),
        window.google.maps.importLibrary("places"),
      ])) as any[];

      const center = { lat: defaultLat, lng: defaultLng };

      const map = new Map(mapDivRef.current!, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        mapId: MAP_ID,
      });

      const marker = new AdvancedMarkerElement({
        position: center,
        map,
        gmpDraggable: true,
      });

      mapRef.current = map;
      markerRef.current = marker;

      geocoderRef.current = new Geocoder();

      marker.addEventListener("dragend", () => {

        const pos = marker.position;

        if (!pos) return;

        const lat =
          typeof pos.lat === "function"
            ? pos.lat()
            : pos.lat;

        const lng =
          typeof pos.lng === "function"
            ? pos.lng()
            : pos.lng;

        reverseGeocode(lat, lng);
      });

      map.addListener("click", (e: any) => {

        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        marker.position = { lat, lng };

        reverseGeocode(lat, lng);
      });

      if (acInputRef.current && window.google?.maps?.places) {
        const autocomplete = new window.google.maps.places.Autocomplete(acInputRef.current, {
          fields: ["geometry", "address_components", "formatted_address"],
          componentRestrictions: { country: ["ae", "in", "cn"] },
        });

        autocompleteRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place?.geometry?.location;

          if (!location) return;

          const lat = location.lat();
          const lng = location.lng();

          marker.position = { lat, lng };
          map.panTo({ lat, lng });
          map.setZoom(15);

          setAddress(place.formatted_address ?? "");

          onSelect({
            lat,
            lng,
            ...parsePlaceComponents(place.address_components ?? []),
          });
        });
      }

      setIsLoaded(true);

    } catch (err) {

      console.error("GoogleMapPicker init error:", err);

      initializedRef.current = false;

    }

  }, [defaultLat, defaultLng, reverseGeocode, onSelect]);

  useEffect(() => {
    loader
      .load()
      .then(initMap)
      .catch((e: unknown) => console.error("loader.load error:", e));
  }, [initMap]);

  // Handle container resizing (e.g. during animations)
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !mapDivRef.current) return;

    const observer = new ResizeObserver(() => {
      if (window.google?.maps?.event && mapRef.current) {
        window.google.maps.event.trigger(mapRef.current, "resize");
      }
    });

    observer.observe(mapDivRef.current);
    return () => observer.disconnect();
  }, [isLoaded]);

  const handleUseLocation = () => {

    if (!navigator.geolocation) return;

    setLocating(true);

    navigator.geolocation.getCurrentPosition(

      ({ coords: { latitude: lat, longitude: lng } }) => {

        if (markerRef.current)
          markerRef.current.position = { lat, lng };

        if (mapRef.current)
          mapRef.current.panTo({ lat, lng });

        reverseGeocode(lat, lng);

        setLocating(false);
      },

      () => setLocating(false),

      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="space-y-2">

      <div className="flex gap-2 items-center">

        <div className="flex-1 min-w-0">

          {!isLoaded && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl opacity-50">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <span className="text-sm text-slate-400">
                Loading search…
              </span>
            </div>
          )}

          <div className={!isLoaded ? "hidden" : "w-full"}>
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-400 transition-all">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <input
                ref={acInputRef}
                type="text"
                placeholder="Search location"
                className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-sm outline-none"
              />
            </div>
          </div>

        </div>

        <button
          type="button"
          onClick={handleUseLocation}
          disabled={locating || !isLoaded}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-cyan-600 text-white rounded-xl text-xs font-bold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {locating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Navigation size={14} />
          )}
          My Location
        </button>

      </div>

      <div
        className="relative rounded-xl overflow-hidden border border-slate-200"
        style={{ height: 220 }}
      >

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        )}

        <div
          ref={mapDivRef}
          className="w-full h-full"
        />

      </div>

      {address && (
        <p className="text-[11px] text-slate-500 flex items-start gap-1 px-1 leading-tight">
          <MapPin
            size={11}
            className="text-cyan-500 shrink-0 mt-0.5"
          />
          {address}
        </p>
      )}

    </div>
  );
}
