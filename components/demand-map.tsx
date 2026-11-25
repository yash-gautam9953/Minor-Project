import type { DemandListing, ProduceListing } from "@/types";

export default function DemandMap({
  demands,
  produce,
}: {
  demands: DemandListing[];
  produce: ProduceListing[];
}) {
  const locations = [
    ...new Set([
      ...demands.map((demand) => demand.location),
      ...produce.map((listing) => listing.location),
    ]),
  ];

  return (
    <div
      role="status"
      className="grid min-h-[300px] place-items-center rounded-md bg-[#f7f8f4] p-5 text-center"
    >
      <div>
        <p className="text-sm font-semibold text-[#315b3d]">Map unavailable</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#788279]">
          Listings do not include verified coordinates yet, so map markers
          cannot be shown.
        </p>
        {locations.length ? (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-[#536057]">
              Locations in these listings
            </p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {locations.map((location) => (
                <li
                  key={location}
                  className="rounded-full border border-[#dfe5dc] bg-white px-3 py-1 text-[11px] text-[#536057]"
                >
                  {location}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-[11px] text-[#788279]">
            No listing locations found.
          </p>
        )}
      </div>
    </div>
  );
}
