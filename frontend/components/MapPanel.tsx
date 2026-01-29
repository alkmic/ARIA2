"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

const center: [number, number] = [2.5, 46.7];

interface MarkerPoint {
  id: string;
  name: string;
  coordinates: [number, number];
}

interface MapPanelProps {
  markers?: MarkerPoint[];
}

export function MapPanel({ markers = [] }: MapPanelProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json",
      center,
      zoom: 4.5
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    markers.forEach((marker) => {
      new maplibregl.Marker({ color: "#2A6CF4" })
        .setLngLat(marker.coordinates)
        .setPopup(new maplibregl.Popup().setText(marker.name))
        .addTo(map);
    });

    return () => {
      map.remove();
    };
  }, [markers]);

  return <div className="h-56 w-full rounded-2xl" ref={mapContainer} />;
}
