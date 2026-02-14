import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '../ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationCrosshairs, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function LocationInput({ value, onChange, label, placeholder, required }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const geocoderContainerRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!geocoderContainerRef.current) return;

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      types: 'place,address,locality,neighborhood',
      countries: 'md,ro',
      placeholder: placeholder || 'Caută locație...',
      language: 'ro',
      bbox: [26.5, 45.5, 30.0, 48.5],
    });

    geocoderContainerRef.current.appendChild(geocoder.onAdd());

    geocoder.on('result', (e) => {
      const location = e.result;
      const locationName = location.place_name;
      const coords = location.center;

      onChange(locationName);
      setCoordinates(coords);
      
      if (mapRef.current) {
        updateMapMarker(coords);
      }
    });

    return () => {
      geocoder.onRemove();
    };
  }, []);

  useEffect(() => {
    if (showMap && mapContainerRef.current && !mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: coordinates || [28.8497, 47.0105],
        zoom: coordinates ? 13 : 11,
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      mapRef.current.on('click', async (e) => {
        const coords = [e.lngLat.lng, e.lngLat.lat];
        updateMapMarker(coords);
        
        const locationName = await reverseGeocode(coords);
        onChange(locationName);
        setCoordinates(coords);
      });

      if (coordinates) {
        updateMapMarker(coordinates);
      }
    }
  }, [showMap]);

  const updateMapMarker = (coords) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    markerRef.current = new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat(coords)
      .addTo(mapRef.current);

    mapRef.current.flyTo({ center: coords, zoom: 14 });
  };

  const reverseGeocode = async (coords) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxgl.accessToken}&language=ro`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
    } catch (error) {
      console.error('Eroare reverse geocoding:', error);
      return `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Browserul tău nu suportă geolocalizare');
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = [position.coords.longitude, position.coords.latitude];
        const locationName = await reverseGeocode(coords);
        
        onChange(locationName);
        setCoordinates(coords);
        
        if (mapRef.current) {
          updateMapMarker(coords);
        }
        
        setIsDetecting(false);
      },
      (error) => {
        console.error('Eroare geolocalizare:', error);
        alert('Nu am putut detecta locația ta. Verifică permisiunile browserului.');
        setIsDetecting(false);
      }
    );
  };

  return (
    <div>
      <label className="block text-slate-300 text-sm font-medium mb-2">
        {label || 'Locație'} {required && <span className="text-red-400">*</span>}
      </label>

      {/* Geocoder Autocomplete */}
      <div ref={geocoderContainerRef} className="mb-3 [&_.mapboxgl-ctrl-geocoder]:!bg-slate-800 [&_.mapboxgl-ctrl-geocoder]:!border-slate-700 [&_.mapboxgl-ctrl-geocoder]:!shadow-none"></div>

      {/* Input Manual */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'sau introdu manual (ex: Chișinău, Moldova)'}
        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
        required={required}
      />

      {/* Butoane */}
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleDetectLocation}
          disabled={isDetecting}
          className="flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faLocationCrosshairs} />
          {isDetecting ? 'Se detectează...' : 'Locația mea'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faMapMarkerAlt} />
          {showMap ? 'Ascunde harta' : 'Alege pe hartă'}
        </Button>
      </div>

      {/* Hartă */}
      {showMap && (
        <div className="mt-4 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
          <div ref={mapContainerRef} className="h-80 w-full"></div>
          <div className="bg-slate-800 p-3 text-sm text-slate-400 text-center">
            Click pe hartă pentru a selecta o locație
          </div>
        </div>
      )}

      <p className="text-slate-500 text-xs mt-2">
        Caută adresa, folosește GPS sau alege pe hartă
      </p>
    </div>
  );
}