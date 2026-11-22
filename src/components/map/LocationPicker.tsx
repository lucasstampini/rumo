"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { Bubble, LatLng } from "@/lib/geo";

const carIcon = L.divIcon({
  className: "rumo-icon",
  html: '<div class="pin on">Seu carro</div>',
  iconSize: [0, 0],
});

function ClickToPlace({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Mapa para o dono marcar onde o carro fica (um toque posiciona o pin). */
export default function LocationPicker({
  bubble,
  value,
  onChange,
}: {
  bubble: Bubble;
  value: LatLng | null;
  onChange: (p: LatLng) => void;
}) {
  const center: [number, number] = value ? [value.lat, value.lng] : [bubble.center_lat, bubble.center_lng];
  return (
    <MapContainer center={center} zoom={value ? 16 : 14} attributionControl={false} className="h-full w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      <Circle
        center={[bubble.center_lat, bubble.center_lng]}
        radius={bubble.radius_m}
        pathOptions={{
          color: "#159a58",
          weight: 2,
          dashArray: "6 6",
          fillColor: "#159a58",
          fillOpacity: 0.08,
          interactive: false,
        }}
      />
      {value && <Marker position={[value.lat, value.lng]} icon={carIcon} interactive={false} keyboard={false} />}
      <ClickToPlace onPick={onChange} />
    </MapContainer>
  );
}
