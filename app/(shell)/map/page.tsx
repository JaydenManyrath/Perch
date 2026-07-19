import { MapPage } from "@/components/map/MapPage";
import {
  getMapPlaces,
  getStickers,
  getEvents,
  getListings,
  getMapComments,
  getMe,
} from "@/lib/data/server-source";

export default async function MapRoute({ searchParams }: { searchParams: { apartmentId?: string } }) {
  const [me, places, stickers, events, listings, comments] = await Promise.all([
    getMe(),
    getMapPlaces(),
    getStickers(),
    getEvents(),
    getListings(),
    getMapComments(),
  ]);
  return (
    <MapPage
      me={me}
      places={places.places}
      initialStickers={stickers}
      events={events}
      listings={listings}
      initialComments={comments.comments}
      initialApartmentId={searchParams.apartmentId ?? null}
    />
  );
}
