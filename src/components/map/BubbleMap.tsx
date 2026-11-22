"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { Bubble, LatLng } from "@/lib/geo";

export type MapPin = { id: string; lat: number; lng: number; label: string; title: string };

const meIcon = L.divIcon({
  className: "rumo-icon",
  html: '<div class="me-dot" style="transform:translate(-50%,-50%)"></div>',
  iconSize: [0, 0],
});

function pinIcon(label: string, selected: boolean) {
  return L.divIcon({
    className: "rumo-icon",
    html: `<div class="pin${selected ? " on" : ""}">${label}</div>`,
    iconSize: [0, 0],
  });
}

/** Enquadra carros + usuário uma vez, deixando espaço para a barra de cima e os cards de baixo. */
function FitOnce({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), {
      paddingTopLeft: [40, 170],
      paddingBottomRight: [40, 150],
      maxZoom: 16,
    });
    // só no primeiro render: depois o usuário controla o mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

export default function BubbleMap({
  bubble,
  pins,
  selectedId,
  onSelect,
  userPos,
}: {
  bubble: Bubble;
  pins: MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userPos: LatLng;
}) {
  const center = useMemo<[number, number]>(
    () => [bubble.center_lat, bubble.center_lng],
    [bubble.center_lat, bubble.center_lng],
  );

  return (
    <MapContainer
      center={center}
      zoom={15}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      <Circle
        center={center}
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
      <Marker position={[userPos.lat, userPos.lng]} icon={meIcon} interactive={false} keyboard={false} />
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p.label, p.id === selectedId)}
          title={p.title}
          zIndexOffset={p.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(p.id) }}
        />
      ))}
      <FitOnce points={[userPos, ...pins]} />
    </MapContainer>
  );
}
