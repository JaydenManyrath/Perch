import { MapPage } from "@/components/map/MapPage";
import { getMapPlaces, getStickers } from "@/lib/data/source";

export default async function MapRoute() {
  const [places, stickers] = await Promise.all([getMapPlaces(), getStickers()]);
  return <MapPage places={places.places} initialStickers={stickers} />;
}
