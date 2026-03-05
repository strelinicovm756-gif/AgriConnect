import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLocationDot,
    faSpinner,
    faLocationCrosshairs,
    faStore,
    faArrowRight,
    faXmark,
    faSliders,
    faChevronDown
} from '@fortawesome/free-solid-svg-icons';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

async function geocodeLocation(locationName) {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    try {
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${token}&country=md,ro&language=ro&limit=1`
        );
        const data = await res.json();
        if (data.features?.length > 0) {
            const [lon, lat] = data.features[0].center;
            return { lat, lon };
        }
        return null;
    } catch {
        return null;
    }
}

function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createCircleGeoJSON(centerLon, centerLat, radiusKm, steps = 64) {
    const coords = [];
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (radiusKm / 6371) * Math.cos(angle) * (180 / Math.PI);
        const dLon = (radiusKm / 6371) * Math.sin(angle) * (180 / Math.PI) / Math.cos(centerLat * Math.PI / 180);
        coords.push([centerLon + dLon, centerLat + dLat]);
    }
    return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] }
    };
}

function radiusToZoom(radiusKm) {
    if (radiusKm <= 5) return 12;
    if (radiusKm <= 10) return 11;
    if (radiusKm <= 20) return 10;
    if (radiusKm <= 50) return 9;
    if (radiusKm <= 100) return 8;
    return 7;
}

const RADIUS_STEPS = [5, 10, 20];

export default function NearbyFarmersMap({ products = [], onNavigate }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const geocacheRef = useRef({});
    const allLocationsRef = useRef([]);

    const [userLocation, setUserLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('idle');
    const [nearbyCount, setNearbyCount] = useState(0);
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [radiusKm, setRadiusKm] = useState(20);
    const [radiusIndex, setRadiusIndex] = useState(2);
    const [isExpanded, setIsExpanded] = useState(false);

    const requestLocation = () => {
        if (!navigator.geolocation) { setLocationStatus('denied'); return; }
        setLocationStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                setLocationStatus('granted');
            },
            () => setLocationStatus('denied'),
            { timeout: 10000 }
        );
    };

    // Initializeaza harta
    useEffect(() => {
        if (locationStatus !== 'granted' || !userLocation || !mapContainerRef.current) return;
        if (mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/light-v11',
            center: [userLocation.lon, userLocation.lat],
            zoom: radiusToZoom(radiusKm),
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        const userEl = document.createElement('div');
        userEl.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`;
        new mapboxgl.Marker({ element: userEl, anchor: 'center' })
            .setLngLat([userLocation.lon, userLocation.lat])
            .setPopup(new mapboxgl.Popup({ offset: 15 }).setText('Tu esti aici'))
            .addTo(mapRef.current);

        mapRef.current.on('load', () => {
            mapRef.current.addSource('radius-circle', {
                type: 'geojson',
                data: createCircleGeoJSON(userLocation.lon, userLocation.lat, radiusKm)
            });
            mapRef.current.addLayer({
                id: 'radius-fill',
                type: 'fill',
                source: 'radius-circle',
                paint: { 'fill-color': '#059669', 'fill-opacity': 0.06 }
            });
            mapRef.current.addLayer({
                id: 'radius-border',
                type: 'line',
                source: 'radius-circle',
                paint: { 'line-color': '#059669', 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.7 }
            });
            setMapReady(true);
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [locationStatus, userLocation]);

    // Geocodeaza toate produsele o singura data
    useEffect(() => {
        if (!mapReady || !userLocation || products.length === 0) return;

        const geocodeAll = async () => {
            const locationMap = {};
            products.forEach(p => {
                if (!p.location) return;
                if (!locationMap[p.location]) locationMap[p.location] = [];
                locationMap[p.location].push(p);
            });

            const results = [];
            for (const [locationName, locationProducts] of Object.entries(locationMap)) {
                if (!geocacheRef.current[locationName]) {
                    geocacheRef.current[locationName] = await geocodeLocation(locationName);
                }
                const coords = geocacheRef.current[locationName];
                if (!coords) continue;
                const dist = calcDistance(userLocation.lat, userLocation.lon, coords.lat, coords.lon);
                results.push({ locationName, locationProducts, coords, dist });
            }

            allLocationsRef.current = results;
            refreshMarkers(results, radiusKm);
        };

        geocodeAll();
    }, [mapReady, userLocation, products]);

    const refreshMarkers = useCallback((locations, radius) => {
        if (!mapRef.current || !userLocation) return;

        const source = mapRef.current.getSource('radius-circle');
        if (source) {
            source.setData(createCircleGeoJSON(userLocation.lon, userLocation.lat, radius));
        }

        mapRef.current.flyTo({
            center: [userLocation.lon, userLocation.lat],
            zoom: radiusToZoom(radius),
            duration: 600,
            essential: true
        });

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        let count = 0;
        locations.forEach(({ locationProducts, coords, dist }) => {
            if (dist > radius) return;
            count++;

            const el = document.createElement('div');
            el.style.cssText = `
        width:36px;height:36px;border-radius:50%;
        background:#059669;border:3px solid white;
        box-shadow:0 4px 12px rgba(5,150,105,0.4);
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:800;font-size:13px;
        cursor:pointer;
        transition:width 0.15s,height 0.15s,box-shadow 0.15s;
      `;
            el.textContent = locationProducts.length > 9 ? '9+' : String(locationProducts.length);
            el.onmouseenter = () => { el.style.width = '44px'; el.style.height = '44px'; el.style.boxShadow = '0 6px 20px rgba(5,150,105,0.6)'; };
            el.onmouseleave = () => { el.style.width = '36px'; el.style.height = '36px'; el.style.boxShadow = '0 4px 12px rgba(5,150,105,0.4)'; };
            el.onclick = () => {
                setSelectedFarmer({ ...locationProducts[0], _allFromLocation: locationProducts, _distance: dist.toFixed(1), _coords: coords });
                mapRef.current?.flyTo({ center: [coords.lon, coords.lat], zoom: 13, duration: 800 });
            };

            const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                .setLngLat([coords.lon, coords.lat])
                .addTo(mapRef.current);
            markersRef.current.push(marker);
        });

        setNearbyCount(count);
        setSelectedFarmer(null);
    }, [userLocation]);

    // Cand se schimba raza
    useEffect(() => {
        if (!mapReady || allLocationsRef.current.length === 0) return;
        refreshMarkers(allLocationsRef.current, radiusKm);
    }, [radiusKm, mapReady, refreshMarkers]);

    const handleSlider = (e) => {
        const idx = Number(e.target.value);
        setRadiusIndex(idx);
        setRadiusKm(RADIUS_STEPS[idx]);
    };

    const sliderPercent = (radiusIndex / (RADIUS_STEPS.length - 1)) * 100;

    return (
        <section className="mb-12">

            <div className="px-4 sm:px-6 lg:px-8 mb-4">
                <button
                    onClick={() => setIsExpanded(prev => !prev)}
                    className="w-full flex items-center justify-between group text-left"
                >
                    <div className="text-left">
                        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <FontAwesomeIcon icon={faLocationDot} className="text-emerald-600" />
                            Furnizori langa tine
                            <span className={`ml-5 text-base text-gray-400 transition-transform duration-300 inline-block ${isExpanded ? 'rotate-0' : 'rotate-180'}`}>
                                <FontAwesomeIcon icon={faChevronDown} />
                            </span>
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                            {locationStatus === 'granted' && nearbyCount > 0
                                ? `${nearbyCount} furnizori in raza de ${radiusKm} km`
                                : null }
                        </p>
                    </div>
                </button>
            </div>


            {/* Card cu animatie expand/collapse */}
            <div className="px-4 sm:px-6 lg:px-8">
                <div
                    className="relative bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden transition-all duration-500 ease-in-out"
                    style={{
                        height: isExpanded ? '460px' : '0px',
                        opacity: isExpanded ? 1 : 0,
                        // marginBottom: isExpanded ? undefined : 0,
                        borderWidth: isExpanded ? undefined : 0,
                    }}
                >

                    {/* idle */}
                    {locationStatus === 'idle' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-br bg-white z-10">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                                <FontAwesomeIcon icon={faLocationCrosshairs} className="text-emerald-600 text-3xl" />
                            </div>
                            <div className="text-center px-6">
                                <p className="text-gray-900 font-bold text-lg mb-1">Unde esti?</p>
                                <p className="text-gray-500 text-sm">Permite accesul la locatie pentru a vedea producatorii din apropierea ta</p>
                            </div>
                            <button onClick={requestLocation} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all hover:scale-105">
                                <FontAwesomeIcon icon={faLocationDot} className="mr-2" />
                                Permite locatia
                            </button>
                        </div>
                    )}

                    {/* loading */}
                    {locationStatus === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white z-10">
                            <FontAwesomeIcon icon={faSpinner} className="text-emerald-600 text-4xl animate-spin" />
                            <p className="text-gray-600 font-medium">Se detecteaza locatia...</p>
                        </div>
                    )}

                    {/* denied */}
                    {locationStatus === 'denied' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-50 to-white z-10 px-6 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <FontAwesomeIcon icon={faLocationCrosshairs} className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-700 font-semibold">Locatie indisponibila</p>
                            <p className="text-gray-500 text-sm max-w-xs">Ai refuzat accesul la locatie. Poti vedea toti furnizorii din pagina de produse.</p>
                            <button onClick={() => onNavigate('toate-produsele')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-all">
                                <FontAwesomeIcon icon={faStore} className="mr-2" />
                                Toti furnizorii
                            </button>
                        </div>
                    )}

                    {/* Harta */}
                    <div
                        ref={mapContainerRef}
                        className="w-full h-full"
                        style={{ display: locationStatus === 'granted' ? 'block' : 'none' }}
                    />

                    {/* Slider raza + popup furnizor — overlay jos */}
                    {locationStatus === 'granted' && (
                        <div
                            className="absolute bottom-4 left-4 z-20 flex flex-col sm:flex-row items-end sm:items-center gap-3"
                            style={{ width: 'calc(100% - 2rem)', pointerEvents: 'none' }}
                        >
                            {/* Slider card */}
                            <div
                                className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 px-5 py-3"
                                style={{ minWidth: '260px', pointerEvents: 'auto' }}
                                onMouseDown={e => e.stopPropagation()}
                                onTouchStart={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faSliders} className="text-emerald-600" />
                                        Raza de cautare
                                    </span>
                                    <span className="text-sm font-black text-emerald-600">{radiusKm} km</span>
                                </div>

                                <input
                                    type="range"
                                    min={0}
                                    max={RADIUS_STEPS.length - 1}
                                    step={1}
                                    value={radiusIndex}
                                    onChange={handleSlider}
                                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer agri-slider"
                                    style={{
                                        background: `linear-gradient(to right, #059669 0%, #059669 ${sliderPercent}%, #e5e7eb ${sliderPercent}%, #e5e7eb 100%)`
                                    }}
                                />

                                <div className="flex justify-between mt-1.5 px-0.5">
                                    {RADIUS_STEPS.map((step, i) => (
                                        <span key={step} className={`text-[10px] font-semibold transition-colors ${i === radiusIndex ? 'text-emerald-600' : 'text-gray-300'}`}>
                                            {step}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Card furnizor selectat */}
                            {selectedFarmer && (
                                <div
                                    className="bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex-1"
                                    style={{ pointerEvents: 'auto' }}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {selectedFarmer.image_url ? (
                                                <img src={selectedFarmer.image_url} alt={selectedFarmer.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <FontAwesomeIcon icon={faStore} className="text-emerald-600" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate">{selectedFarmer.seller_name}</p>
                                                <p className="text-gray-400 text-xs truncate">{selectedFarmer.location}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
                                                        {selectedFarmer._allFromLocation.length} produse
                                                    </span>
                                                    <span className="text-[11px] text-gray-400">{selectedFarmer._distance} km</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button onClick={() => onNavigate('detalii', selectedFarmer.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
                                                Vezi
                                            </button>
                                            <button onClick={() => setSelectedFarmer(null)} className="text-gray-400 hover:text-gray-600 p-1.5">
                                                <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Badge numar furnizori */}
                    {locationStatus === 'granted' && (
                        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-gray-100 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${nearbyCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                            <span className="text-sm font-semibold text-gray-800">
                                {nearbyCount > 0 ? `${nearbyCount} furnizori apropiati` : 'Niciun furnizor in raza'}
                            </span>
                        </div>
                    )}
                </div>

                <style>{`
        .agri-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: #059669; border: 3px solid white;
          box-shadow: 0 2px 6px rgba(5,150,105,0.5);
          cursor: pointer; transition: box-shadow 0.15s;
        }
        .agri-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 14px rgba(5,150,105,0.75);
        }
        .agri-slider::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: #059669; border: 3px solid white;
          box-shadow: 0 2px 6px rgba(5,150,105,0.5);
          cursor: pointer;
        }
        .agri-slider:focus { outline: none; }
      `}</style>
            </div>
        </section>
    );
}