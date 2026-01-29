import { Hcp } from "@/lib/types";

const franceBounds = {
  minLng: -4.8,
  maxLng: 7.8,
  minLat: 42.2,
  maxLat: 50.9
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function hcpToCoordinates(hcp: Hcp): [number, number] {
  const seed = hashString(`${hcp.postal_code ?? ""}-${hcp.city ?? ""}-${hcp.id}`);
  const lng =
    franceBounds.minLng + (seed % 1000) / 1000 * (franceBounds.maxLng - franceBounds.minLng);
  const lat =
    franceBounds.minLat + ((seed >> 2) % 1000) / 1000 * (franceBounds.maxLat - franceBounds.minLat);
  return [Number(lng.toFixed(4)), Number(lat.toFixed(4))];
}
