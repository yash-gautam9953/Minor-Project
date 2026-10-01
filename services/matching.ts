import type { DemandListing, ProduceListing } from "@/types";

const cityDistance: Record<string, Record<string, number>> = {
  "Greater Noida": { "Greater Noida": 0, Noida: 8, Delhi: 34, Ghaziabad: 24 },
  Noida: { "Greater Noida": 8, Noida: 0, Delhi: 20, Ghaziabad: 18 },
  Delhi: { "Greater Noida": 34, Noida: 20, Delhi: 0, Ghaziabad: 22 },
  Ghaziabad: { "Greater Noida": 24, Noida: 18, Delhi: 22, Ghaziabad: 0 },
};

export interface ProduceMatch {
  demand: DemandListing;
  distanceKm: number;
  potentialValue: number;
  quantityMatchedKg: number;
  priceGapPerKg: number;
}

export function distanceBetween(first: string, second: string): number {
  return cityDistance[first]?.[second] ?? 18;
}

export function findDemandMatches(produce: ProduceListing, demands: DemandListing[]): ProduceMatch[] {
  return demands
    .filter((demand) => demand.status === "open" && demand.quantityKg > 0 && produce.quantityKg > 0 && demand.produce.toLowerCase() === produce.produce.toLowerCase())
    .map((demand) => {
      const distanceKm = distanceBetween(produce.location, demand.location);
      const quantityMatchedKg = Math.min(produce.quantityKg, demand.quantityKg);
      return {
        demand,
        distanceKm,
        quantityMatchedKg,
        potentialValue: quantityMatchedKg * produce.askingPricePerKg,
        priceGapPerKg: demand.targetPricePerKg - produce.askingPricePerKg,
      };
    })
    .filter((match) => match.distanceKm <= 40 && match.priceGapPerKg >= 0)
    .sort((first, second) => second.potentialValue - first.potentialValue);
}

export function findFarmerMatches(demand: DemandListing, produce: ProduceListing[]) {
  return produce
    .filter((listing) => listing.status === "open" && listing.quantityKg > 0 && demand.quantityKg > 0 && listing.produce.toLowerCase() === demand.produce.toLowerCase())
    .map((listing) => ({
      produce: listing,
      distanceKm: distanceBetween(demand.location, listing.location),
      quantityMatchedKg: Math.min(demand.quantityKg, listing.quantityKg),
      potentialValue: Math.min(demand.quantityKg, listing.quantityKg) * listing.askingPricePerKg,
    }))
    .filter((match) => match.distanceKm <= 40 && match.produce.askingPricePerKg <= demand.targetPricePerKg)
    .sort((first, second) => first.distanceKm - second.distanceKm);
}