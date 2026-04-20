import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLocationDot,
    faSpinner,
    faLocationCrosshairs,
    faStore,
    faXmark,
    faSliders,
    faChevronUp,
    faMapLocationDot,
    faBoxesStacked,
    faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { getColorForName } from '../../lib/utils';

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

const RADIUS_STEPS = [5, 10, 15, 25, 30, 35];

export default function NearbyFarmersMap({ products = [], producers = [], onNavigate, dbCategories = [] }) {
    const { t } = useLanguage();
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
    const [isExpanded, setIsExpanded] = useState(true);

    // Mode + filter state
    const [viewMode, setViewMode] = useState('products'); // 'products' | 'producers'
    const [productFilter, setProductFilter] = useState('all');  // 'all' | 'b2c' | 'b2b'
    const [producerFilter, setProducerFilter] = useState('all'); // 'all' | 'b2c' | 'b2b'

    // ── Filtered PRODUCTS ────────────────────────────────────────
    const filteredProducts = useMemo(() => {
        const b2bIds = dbCategories.filter(c => c.market_type !== 'b2c').map(c => c.id);
        const b2bNames = dbCategories.filter(c => c.market_type !== 'b2c').map(c => c.name);
        return products.filter(p => {
            if (productFilter === 'all') return true;
            const isB2B = p.category_id
                ? b2bIds.includes(p.category_id)
                : b2bNames.includes(p.category);
            if (productFilter === 'b2b') return isB2B;
            if (productFilter === 'b2c') return !isB2B;
            return true;
        });
    }, [products, productFilter, dbCategories]);

    // ── Derived PRODUCERS from products ─────────────────────────
    const allProducers = useMemo(() => {
        const b2bIds = dbCategories.filter(c => c.market_type !== 'b2c').map(c => c.id);
        const b2bNames = dbCategories.filter(c => c.market_type !== 'b2c').map(c => c.name);
        const map = {};
        products.forEach(p => {
            if (!p.user_id || !p.location) return;
            if (!map[p.user_id]) {
                map[p.user_id] = {
                    user_id: p.user_id,
                    seller_name: p.seller_name || 'Producător',
                    location: p.location,
                    products: [],
                    hasB2B: false,
                    hasB2C: false,
                };
            }
            const isB2B = p.category_id
                ? b2bIds.includes(p.category_id)
                : b2bNames.includes(p.category);
            if (isB2B) map[p.user_id].hasB2B = true;
            else map[p.user_id].hasB2C = true;
            map[p.user_id].products.push(p);
        });
        return Object.values(map).map(prod => ({
            ...prod,
            market_type: prod.hasB2B && prod.hasB2C ? 'both'
                : prod.hasB2B ? 'b2b'
                    : 'b2c',
        }));
    }, [products, dbCategories]);

    // ── Filtered PRODUCERS ───────────────────────────────────────
    const filteredProducers = useMemo(() => {
        // Prefer the `producers` prop (from profiles table); fall back to derived ones
        const source = producers.length > 0 ? producers : allProducers;
        return source.filter(p => {
            if (producerFilter === 'all') return true;
            if (producerFilter === 'b2c') return p.market_type === 'b2c' || p.market_type === 'both';
            if (producerFilter === 'b2b') return p.market_type === 'b2b' || p.market_type === 'both';
            return true;
        });
    }, [producers, allProducers, producerFilter]);

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

    // Initialize map
    useEffect(() => {
        if (locationStatus !== 'granted' || !userLocation || !mapContainerRef.current) return;
        if (mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/outdoors-v12',
            center: [userLocation.lon, userLocation.lat],
            zoom: radiusToZoom(radiusKm),
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        const userEl = document.createElement('div');
        userEl.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`;
        new mapboxgl.Marker({ element: userEl, anchor: 'center' })
            .setLngLat([userLocation.lon, userLocation.lat])
            .setPopup(new mapboxgl.Popup({ offset: 15 }).setText('You are here'))
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

    // Clear markers when mode switches
    useEffect(() => {
        if (!mapReady) return;
        allLocationsRef.current = [];
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        setSelectedFarmer(null);
        setNearbyCount(0);
    }, [viewMode]);

    // Effect for PRODUCTS mode
    useEffect(() => {
        if (!mapReady || !userLocation || viewMode !== 'products') return;

        const geocodeProducts = async () => {
            allLocationsRef.current = [];
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            const locationMap = {};
            filteredProducts.forEach(p => {
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
                results.push({ type: 'products', locationName, locationProducts, coords, dist });
            }

            allLocationsRef.current = results;
            refreshMarkers(results, radiusKm);
        };

        geocodeProducts();
    }, [mapReady, userLocation, filteredProducts, viewMode]);

    // Effect for PRODUCERS mode
    useEffect(() => {
        if (!mapReady || !userLocation || viewMode !== 'producers') return;

        const geocodeProducers = async () => {
            allLocationsRef.current = [];
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            const results = [];
            for (const producer of filteredProducers) {
                if (!producer.location) continue;
                if (!geocacheRef.current[producer.location]) {
                    geocacheRef.current[producer.location] = await geocodeLocation(producer.location);
                }
                const coords = geocacheRef.current[producer.location];
                if (!coords) continue;
                const dist = calcDistance(userLocation.lat, userLocation.lon, coords.lat, coords.lon);
                results.push({ type: 'producer', producer, coords, dist });
            }

            allLocationsRef.current = results;
            refreshMarkers(results, radiusKm);
        };

        geocodeProducers();
    }, [mapReady, userLocation, filteredProducers, viewMode]);

    const refreshMarkers = useCallback((locations, radius) => {
        if (!mapRef.current || !userLocation) return;

        const source = mapRef.current.getSource('radius-circle');
        if (source) source.setData(createCircleGeoJSON(userLocation.lon, userLocation.lat, radius));
        mapRef.current.flyTo({
            center: [userLocation.lon, userLocation.lat],
            zoom: radiusToZoom(radius), duration: 600, essential: true
        });

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        let count = 0;

        locations.forEach(({ type, locationProducts, producer, coords, dist }) => {
            if (dist > radius) return;
            count++;

            const isProducerMode = type === 'producer';
            const colorMap = { b2c: '#059669', b2b: '#2563eb', both: '#7c3aed' };
            const color = isProducerMode
                ? (colorMap[producer.market_type] ?? '#059669')
                : '#059669';
            const shadowHex = isProducerMode
                ? (producer.market_type === 'b2b' ? '37,99,235'
                    : producer.market_type === 'both' ? '124,58,237'
                        : '5,150,105')
                : '5,150,105';

            const el = document.createElement('div');
            el.style.cssText = [
                'width:40px', 'height:40px', 'border-radius:50%',
                `background:${color}`, 'border:3px solid white',
                `box-shadow:0 4px 12px rgba(${shadowHex},0.4)`,
                'display:flex', 'align-items:center', 'justify-content:center',
                'color:white', 'font-weight:800', 'font-size:13px',
                'cursor:pointer',
                'transition:width 0.15s,height 0.15s,box-shadow 0.15s',
            ].join(';');

            if (isProducerMode) {
                el.textContent = (producer.seller_name || producer.full_name || '?')[0].toUpperCase();
            } else {
                el.textContent = locationProducts.length > 9 ? '9+' : String(locationProducts.length);
            }

            el.onmouseenter = () => {
                el.style.width = '48px'; el.style.height = '48px';
                el.style.boxShadow = `0 6px 20px rgba(${shadowHex},0.65)`;
            };
            el.onmouseleave = () => {
                el.style.width = '40px'; el.style.height = '40px';
                el.style.boxShadow = `0 4px 12px rgba(${shadowHex},0.4)`;
            };

            if (isProducerMode) {
                el.onclick = () => {
                    setSelectedFarmer({
                        _type: 'producer',
                        ...producer,
                        _distance: dist.toFixed(1),
                        _coords: coords,
                        _color: color,
                    });
                    mapRef.current?.flyTo({ center: [coords.lon, coords.lat], zoom: 13, duration: 800 });
                };
            } else {
                el.onclick = () => {
                    setSelectedFarmer({
                        _type: 'products',
                        ...locationProducts[0],
                        _allFromLocation: locationProducts,
                        _distance: dist.toFixed(1),
                        _coords: coords,
                        _color: color,
                    });
                    mapRef.current?.flyTo({ center: [coords.lon, coords.lat], zoom: 13, duration: 800 });
                };
            }

            const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                .setLngLat([coords.lon, coords.lat])
                .addTo(mapRef.current);
            markersRef.current.push(marker);
        });

        setNearbyCount(count);
        setSelectedFarmer(null);
    }, [userLocation]);

    // Re-render markers when radius changes
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
    const toggle = () => setIsExpanded(prev => !prev);

    return (
        <section className="mb-12">

            <div className="px-6 sm:px-8 lg:px-12 mb-4">
                <button onClick={toggle} className="w-full flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faMapLocationDot} className="text-white text-2xl" />
                        <h3 className="text-2xl font-bold text-white">
                            {t.features.nearbyProducers}
                        </h3>
                    </div>
                    <div className="items-center mr-16 rounded-3xl w-12 py-2">
                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                            <FontAwesomeIcon icon={faChevronUp} className="text-white text-xl" />
                        </div>
                    </div>
                </button>
            </div>

            <div className="px-6 sm:px-8 lg:px-12">
                <div
                    className="relative bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden transition-all duration-500 ease-in-out"
                    style={{
                        height: isExpanded ? '460px' : '0px',
                        opacity: isExpanded ? 1 : 0,
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
                                <p className="text-gray-900 font-bold text-lg mb-1">{t.features.whereAreYou}</p>
                                <p className="text-gray-500 text-sm">{t.features.allowLocationHint}</p>
                            </div>
                            <button onClick={requestLocation} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all hover:scale-105">
                                <FontAwesomeIcon icon={faLocationDot} className="mr-2" />
                                {t.features.allowLocation}
                            </button>
                        </div>
                    )}

                    {/* loading */}
                    {locationStatus === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white z-10">
                            <FontAwesomeIcon icon={faSpinner} className="text-emerald-600 text-4xl animate-spin" />
                            <p className="text-gray-600 font-medium">{t.features.locating}</p>
                        </div>
                    )}

                    {/* denied */}
                    {locationStatus === 'denied' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-50 to-white z-10 px-6 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <FontAwesomeIcon icon={faLocationCrosshairs} className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-700 font-semibold">{t.features.locationUnavailable}</p>
                            <p className="text-gray-500 text-sm max-w-xs">{t.features.locationDeniedHint}</p>
                            <button onClick={() => onNavigate('toate-produsele')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-all">
                                <FontAwesomeIcon icon={faStore} className="mr-2" />
                                {t.features.allProducers}
                            </button>
                        </div>
                    )}

                    {/* Map canvas */}
                    <div
                        ref={mapContainerRef}
                        className="w-full h-full"
                        style={{ display: locationStatus === 'granted' ? 'block' : 'none' }}
                    />

                    {/* Mode switcher + category filter — TOP LEFT */}
                    {locationStatus === 'granted' && (
                        <div className="absolute top-4 left-4 z-20" style={{ pointerEvents: 'none' }}>
                            <div
                                className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-2 flex flex-col gap-2"
                                style={{ pointerEvents: 'auto' }}
                                onMouseDown={e => e.stopPropagation()}
                                onTouchStart={e => e.stopPropagation()}
                            >
                                {/* Row 1 — Mode switcher */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setViewMode('products')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            viewMode === 'products'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faBoxesStacked} className="text-[10px]" />
                                        {t.nav.products}
                                    </button>
                                    <button
                                        onClick={() => setViewMode('producers')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            viewMode === 'producers'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faUsers} className="text-[10px]" />
                                        {t.nav.producers}
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gray-100 mx-1" />

                                {/* Row 2 — Category filter */}
                                <div className="flex gap-1">
                                    {viewMode === 'products' ? (
                                        [
                                            { key: 'all', label: t.features.filterAll },
                                            { key: 'b2c', label: t.home.foodProducts },
                                            { key: 'b2b', label: t.home.servicesUtilities },
                                        ].map(f => (
                                            <button
                                                key={f.key}
                                                onClick={() => setProductFilter(f.key)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                                    productFilter === f.key
                                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))
                                    ) : (
                                        [
                                            { key: 'all', label: t.features.filterAll },
                                            { key: 'b2c', label: t.home.foodProducers },
                                            { key: 'b2b', label: t.home.serviceProviders },
                                        ].map(f => (
                                            <button
                                                key={f.key}
                                                onClick={() => setProducerFilter(f.key)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                                    producerFilter === f.key
                                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Color legend — BOTTOM RIGHT, only in producers mode */}
                    {locationStatus === 'granted' && viewMode === 'producers' && (
                        <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 px-3 py-2.5 flex flex-col gap-1.5">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                Legendă
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#059669] flex-shrink-0" />
                                <span className="text-[10px] font-semibold text-gray-600">{t.home.foodProducers}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#2563eb] flex-shrink-0" />
                                <span className="text-[10px] font-semibold text-gray-600">{t.home.serviceProviders}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#7c3aed] flex-shrink-0" />
                                <span className="text-[10px] font-semibold text-gray-600">{t.producers.typeBoth}</span>
                            </div>
                        </div>
                    )}

                    {/* Slider + selected item popup — BOTTOM LEFT */}
                    {locationStatus === 'granted' && (
                        <div
                            className="absolute bottom-4 left-4 z-20 flex flex-col sm:flex-row items-end sm:items-center gap-3"
                            style={{ width: 'calc(100% - 2rem)', pointerEvents: 'none' }}
                        >
                            {/* Radius slider card */}
                            <div
                                className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 px-5 py-3"
                                style={{ minWidth: '260px', pointerEvents: 'auto' }}
                                onMouseDown={e => e.stopPropagation()}
                                onTouchStart={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faSliders} className="text-emerald-600" />
                                        {t.features.searchRadius}
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

                            {/* Selected item popup */}
                            {selectedFarmer && (
                                <div
                                    className="bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex-1"
                                    style={{ pointerEvents: 'auto' }}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">

                                            {/* Avatar / Image */}
                                            {selectedFarmer._type === 'producer' ? (
                                                <div
                                                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                                    style={{ background: selectedFarmer._color || getColorForName(selectedFarmer.user_id) }}
                                                >
                                                    <span className="text-white font-black text-lg">
                                                        {(selectedFarmer.seller_name || selectedFarmer.full_name || '?')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                            ) : selectedFarmer.image_url ? (
                                                <img
                                                    src={selectedFarmer.image_url}
                                                    alt={selectedFarmer.name}
                                                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                                    <FontAwesomeIcon icon={faStore} className="text-emerald-600" />
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate">
                                                    {selectedFarmer._type === 'producer'
                                                        ? (selectedFarmer.seller_name || selectedFarmer.full_name)
                                                        : selectedFarmer.name}
                                                </p>
                                                <p className="text-gray-400 text-xs truncate">{selectedFarmer.location}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {selectedFarmer._type === 'producer' ? (
                                                        <>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                                                selectedFarmer.market_type === 'b2b'
                                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                                    : selectedFarmer.market_type === 'both'
                                                                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                            }`}>
                                                                {selectedFarmer.market_type === 'b2b'
                                                                    ? t.home.serviceProviders
                                                                    : selectedFarmer.market_type === 'both'
                                                                        ? t.producers.typeBoth
                                                                        : t.home.foodProducers}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {selectedFarmer.products?.length ?? 0} {t.features.products}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
                                                            {selectedFarmer._allFromLocation?.length} {t.features.products}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400">{selectedFarmer._distance} km</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                                onClick={() => selectedFarmer._type === 'producer'
                                                    ? onNavigate('producator', selectedFarmer.user_id)
                                                    : onNavigate('detalii', selectedFarmer.id)
                                                }
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                            >
                                                {t.features.view}
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

                    {/* Nearby count badge */}
                    {locationStatus === 'granted' && (
                        <div className="absolute top-4 right-14 z-10 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-gray-100 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${nearbyCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                            <span className="text-sm font-semibold text-gray-800">
                                {nearbyCount > 0 ? t.features.nearbyProducersCount.replace('{n}', nearbyCount) : t.features.noProducersNearby}
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
