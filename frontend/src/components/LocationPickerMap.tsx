"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Search, Navigation, X, Check, Loader2, AlertCircle } from "lucide-react";

export interface SelectedLocation {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerMapProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: SelectedLocation) => void;
  initialLat?: number;
  initialLng?: number;
}

export const DEFAULT_MAP_LOCATION = {
  lat: 18.5204, // Pune, Maharashtra, India
  lng: 73.8567,
  zoom: 13,
};

export default function LocationPickerMap({
  isOpen,
  onClose,
  onSelectLocation,
  initialLat = DEFAULT_MAP_LOCATION.lat,
  initialLng = DEFAULT_MAP_LOCATION.lng,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [addressDetails, setAddressDetails] = useState<{
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    displayName: string;
  }>({
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    displayName: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Debounced reverse geocoding using Nominatim
  const reverseGeocode = useCallback(async (targetLat: number, targetLng: number) => {
    setIsGeocoding(true);
    setErrorMsg(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Reverse geocoding request failed.");
      }
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.suburb || addr.neighbourhood || addr.residential || "";
        const house = addr.house_number || addr.building || "";
        const street = [house, road].filter(Boolean).join(", ") || addr.display_name?.split(",")[0] || "";

        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
        const state = addr.state || "";
        const pincode = addr.postcode || "";
        const country = addr.country || "India";

        setAddressDetails({
          street,
          city,
          state,
          pincode,
          country,
          displayName: data.display_name || "",
        });
      }
    } catch (err: any) {
      console.warn("Nominatim reverse geocoding warning:", err.message);
      setErrorMsg("Could not fetch location name. Coordinates will still be saved.");
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Debounced address search using Nominatim
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=5&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data || []);
        }
      } catch (err) {
        console.warn("Location search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Leaflet CDN script dynamically
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== "undefined" && (window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Add Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Add Leaflet JS
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, [isOpen]);

  // Reset lat/lng state to initialLat/initialLng when modal opens or initial props update
  useEffect(() => {
    if (isOpen) {
      setLat(initialLat);
      setLng(initialLng);
      setErrorMsg(null);
      if (mapInstanceRef.current && markerInstanceRef.current) {
        mapInstanceRef.current.setView([initialLat, initialLng], DEFAULT_MAP_LOCATION.zoom);
        markerInstanceRef.current.setLatLng([initialLat, initialLng]);
        reverseGeocode(initialLat, initialLng);
      }
    }
  }, [isOpen, initialLat, initialLng, reverseGeocode]);

  // Initialize & Update Map when Leaflet is ready
  useEffect(() => {
    if (!isOpen || !leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Create Map instance if not initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create Custom Pin Icon
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="background-color: #D90429; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;"><div style="width: 12px; height: 12px; background: white; border-radius: 50%;"></div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      // Handle marker drag
      marker.on("dragend", (e: any) => {
        const position = e.target.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
        reverseGeocode(position.lat, position.lng);
      });

      // Handle map click
      map.on("click", (e: any) => {
        const { lat: clickedLat, lng: clickedLng } = e.latlng;
        marker.setLatLng([clickedLat, clickedLng]);
        setLat(clickedLat);
        setLng(clickedLng);
        reverseGeocode(clickedLat, clickedLng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      // Initial reverse geocode
      reverseGeocode(lat, lng);
    } else {
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
      markerInstanceRef.current.setLatLng([lat, lng]);
    }

    return () => {
      // Map cleanup on unmount
    };
  }, [isOpen, leafletLoaded, lat, lng, reverseGeocode]);

  // "Locate Me" Browser Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        setIsLocating(false);

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([userLat, userLng], 15);
          markerInstanceRef.current.setLatLng([userLat, userLng]);
        }
        reverseGeocode(userLat, userLng);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg("Location permission denied. Please click or search location manually.");
        } else {
          setErrorMsg("Could not fetch location. Please pick location manually on the map.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectSearchResult = (result: any) => {
    const targetLat = parseFloat(result.lat);
    const targetLng = parseFloat(result.lon);
    if (!isNaN(targetLat) && !isNaN(targetLng)) {
      setLat(targetLat);
      setLng(targetLng);
      setSearchResults([]);
      setSearchQuery("");

      if (mapInstanceRef.current && markerInstanceRef.current) {
        mapInstanceRef.current.setView([targetLat, targetLng], 16);
        markerInstanceRef.current.setLatLng([targetLat, targetLng]);
      }
      reverseGeocode(targetLat, targetLng);
    }
  };

  const handleConfirmLocation = () => {
    onSelectLocation({
      street: addressDetails.street,
      city: addressDetails.city,
      state: addressDetails.state,
      pincode: addressDetails.pincode,
      country: addressDetails.country || "India",
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#FFFDF9]">
          <div className="flex items-center gap-2 text-[#D90429]">
            <MapPin size={22} className="fill-[#D90429] text-white" />
            <h2 className="text-lg font-black text-[#202124]">Pick Location on Map</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 relative">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search area, landmark, pincode, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/20 focus:border-[#D90429]"
            />
            {isSearching && (
              <Loader2 size={18} className="absolute right-3.5 top-3 text-[#D90429] animate-spin" />
            )}

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-12 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 max-h-60 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 text-xs font-semibold text-slate-700 border-b border-slate-100 last:border-0 flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin size={16} className="text-[#D90429] shrink-0 mt-0.5" />
                    <span>{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 size={16} className="animate-spin text-[#D90429]" />
            ) : (
              <Navigation size={16} className="text-[#D90429]" />
            )}
            Locate Me
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Map Viewport Container */}
        <div className="relative w-full h-[360px] bg-slate-100">
          {!leafletLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-2 z-10">
              <Loader2 size={28} className="animate-spin text-[#D90429]" />
              <p className="text-xs font-bold">Loading Interactive Map...</p>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Address Preview & Confirm Bar */}
        <div className="p-4 bg-[#FFFDF9] border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-[#D90429] uppercase tracking-wider mb-1">
              <MapPin size={14} /> Selected Coordinates: ({lat.toFixed(5)}, {lng.toFixed(5)})
              {isGeocoding && <Loader2 size={12} className="animate-spin text-[#D90429]" />}
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate">
              {addressDetails.street
                ? `${addressDetails.street}, ${addressDetails.city}, ${addressDetails.state} ${addressDetails.pincode}`
                : addressDetails.displayName || "Click/drag pin on map to auto-fill address details."}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#D90429] hover:bg-[#B7092B] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Check size={16} /> Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
