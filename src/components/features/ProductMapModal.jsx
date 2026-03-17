import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faLocationDot,
  faMapMarkerAlt,
  faExpand,
  faCompress,
  faCopy,
  faMapLocationDot,
  faCheck,
  faRoute
} from '@fortawesome/free-solid-svg-icons';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function approximateCoordinates(lat, lon, radiusKm = 1) {
  const latVariation = (Math.random() - 0.5) * (radiusKm / 111);
  const lonVariation = (Math.random() - 0.5) * (radiusKm / (111 * Math.cos(lat * Math.PI / 180)));

  return {
    lat: lat + latVariation,
    lon: lon + lonVariation
  };
}

async function geocodeLocation(locationName) {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${MAPBOX_TOKEN}&country=md,ro&language=ro&limit=1`
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].center;
      return { lat, lon, name: data.features[0].place_name };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

export default function ProductMapModal({ isOpen, onClose, product, userLocation = null }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [productCoords, setProductCoords] = useState(null);
  const [exactCoords, setExactCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !product) return;

    const initMap = async () => {
      setLoading(true);

      const coords = await geocodeLocation(product.location);

      if (!coords) {
        setLoading(false);
        toast.error('Could not determine location coordinates');
        return;
      }

      setExactCoords({ lat: coords.lat, lon: coords.lon, name: coords.name });

      // ELIMINĂ APROXIMAREA - folosește coordonatele exacte
      // const approximated = approximateCoordinates(coords.lat, coords.lon, 1);
      // setProductCoords(approximated);

      // FOLOSEȘTE DIRECT COORDONATELE EXACTE:
      setProductCoords({ lat: coords.lat, lon: coords.lon });

      if (userLocation) {
        const dist = calculateDistance(
          userLocation.lat,
          userLocation.lon,
          coords.lat,
          coords.lon
        );
        setDistance(dist.toFixed(1));
      }

      if (mapContainerRef.current && !mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/outdoors-v12',
          center: [coords.lon, coords.lat], // FOLOSEȘTE coords în loc de approximated
          zoom: 14, // Poți crește zoom-ul pentru că e exact
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker-light';
        markerEl.innerHTML = `
    <div style="cursor:pointer">
      <svg width="36" height="44" viewBox="0 0 40 50" fill="none">
        <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 30 20 30s20-15 20-30C40 8.95 31.05 0 20 0z" fill="#10b981"/>
        <circle cx="20" cy="20" r="8" fill="white"/>
        <circle cx="20" cy="20" r="5" fill="#10b981"/>
      </svg>
    </div>
    `;

        markerRef.current = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([coords.lon, coords.lat]) // FOLOSEȘTE coords în loc de approximated
          .addTo(mapRef.current);
      }

      setLoading(false);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [isOpen, product, userLocation]);

  useEffect(() => {
    if (mapRef.current && isFullscreen) {
      setTimeout(() => {
        mapRef.current.resize();
      }, 300);
    }
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCopyAddress = async () => {
    if (!exactCoords && !productCoords) {
      toast.error('No coordinates available');
      return;
    }

    const textToCopy = exactCoords?.name
      ? `${exactCoords.name}\nCoordonate: ${exactCoords.lat.toFixed(6)}, ${exactCoords.lon.toFixed(6)}`
      : `Coordonate: ${productCoords.lat.toFixed(6)}, ${productCoords.lon.toFixed(6)}`;

    const success = await copyToClipboard(textToCopy);

    if (success) {
      setCopied(true);
      toast.success('Address copied!', { duration: 3000 });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy address');
    }
  };

  const handleOpenInGoogleMaps = () => {
    if (!exactCoords && !productCoords) {
      toast.error('Nu există coordonate disponibile');
      return;
    }

    const coords = exactCoords || productCoords;
    let mapsUrl;

    if (userLocation) {
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lon}&destination=${coords.lat},${coords.lon}&travelmode=driving`;
    } else {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`;
    }

    window.open(mapsUrl, '_blank');
    toast.success(userLocation ? 'Navigare deschisă!' : 'Locație deschisă!');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div
          className={`bg-white rounded-3xl shadow-2xl transition-all duration-300 ${isFullscreen ? 'w-full h-full max-w-none max-h-none' : 'w-full max-w-5xl h-[700px]'
            }`}
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-emerald-600 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Locație Aproximativă</h2>
                <p className="text-gray-500 text-sm">{product?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
                title={isFullscreen ? "Ieși din fullscreen" : "Fullscreen"}
              >
                <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <FontAwesomeIcon icon={faXmark} size="lg" />
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative h-[calc(100%-80px)]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
                  <p className="text-gray-600">Se încarcă harta...</p>
                </div>
              </div>
            )}

            <div ref={mapContainerRef} className="w-full h-full rounded-b-3xl" />

            {/* Info Overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Product Mini Preview */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                    {/* Left: Thumbnail + Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-bold text-lg mb-1 truncate">{product?.location}</h3>
                        {exactCoords && (
                          <p className="text-gray-600 text-sm mb-2 truncate">{exactCoords.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Badges */}
                    <div className="flex flex-wrap gap-2 lg:flex-shrink-0">
                      {distance && (
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200 flex items-center gap-1.5 whitespace-nowrap">
                          <FontAwesomeIcon icon={faRoute} className="text-xs" />
                          {distance} km de tine
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 bg-gray-50">
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={handleCopyAddress}
                      className={`
                        flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                        ${copied
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                        }
                      `}
                    >
                      <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                      {copied ? 'Copiat!' : 'Copiază adresa'}
                    </button>

                    <button
                      onClick={handleOpenInGoogleMaps}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-md border-2 border-emerald-600"
                    >
                      <FontAwesomeIcon icon={faMapLocationDot} />
                      {userLocation ? 'Navigare' : 'Deschide Maps'}
                    </button>
                  </div>
                </div>

                {/* Coordinates Info */}
                {exactCoords && (
                  <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
                    <p className="text-gray-500 text-xs text-center truncate">
                      {exactCoords.lat.toFixed(6)}, {exactCoords.lon.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marker Styles */}
      <style>{`
        .custom-marker-light {
          position: relative;
          width: 40px;
          height: 50px;
          cursor: pointer;
        }

        .marker-pulse-light {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: rgba(16, 185, 129, 0.2);
          border-radius: 50%;
          animation: pulse-light 2s infinite;
        }

        @keyframes pulse-light {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }

        .marker-pin-light {
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15));
          transition: transform 0.3s;
        }

        .marker-pin-light:hover {
          transform: scale(1.15);
        }
      `}</style>
    </>
  );
}