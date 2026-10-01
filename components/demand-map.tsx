"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { DemandListing, ProduceListing } from "@/types";

const coordinates: Record<string, [number, number]> = {
  "Greater Noida": [28.4744, 77.504],
  Noida: [28.5355, 77.391],
  Delhi: [28.6139, 77.209],
  Ghaziabad: [28.6692, 77.4538],
};

export default function DemandMap({ demands, produce }: { demands: DemandListing[]; produce: ProduceListing[] }) {
  return <MapContainer center={[28.55, 77.37]} zoom={9} scrollWheelZoom={false}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {demands.map((demand) => {
      const point = coordinates[demand.location] ?? coordinates.Noida;
      return <CircleMarker key={demand.id} center={point} radius={9} pathOptions={{ color: "#b56c3b", fillColor: "#e49a61", fillOpacity: 0.88 }}><Popup>{demand.buyerName}<br />Needs {demand.quantityKg} kg {demand.produce}</Popup></CircleMarker>;
    })}
    {produce.map((listing) => {
      const point = coordinates[listing.location] ?? coordinates.Noida;
      return <CircleMarker key={listing.id} center={[point[0] + 0.009, point[1] + 0.009]} radius={7} pathOptions={{ color: "#4c8057", fillColor: "#78a57c", fillOpacity: 0.9 }}><Popup>{listing.farmerName}<br />Offers {listing.quantityKg} kg {listing.produce}</Popup></CircleMarker>;
    })}
  </MapContainer>;
}