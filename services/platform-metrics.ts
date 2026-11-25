import type {
  BuyerProfile,
  Deal,
  DemandListing,
  FarmerProfile,
  PlatformMetrics,
  ProduceListing,
} from "@/types";

export function calculatePlatformMetrics(data: {
  farmers: FarmerProfile[];
  buyers: BuyerProfile[];
  produce: ProduceListing[];
  demands: DemandListing[];
  deals: Deal[];
  acceptedMatchCount: number;
}): PlatformMetrics {
  const completedOrders = data.deals.filter((deal) => deal.status === "completed");

  return {
    farmerCount: data.farmers.length,
    buyerCount: data.buyers.length,
    activeProduceCount: data.produce.filter(
      (listing) => listing.status === "open" && listing.quantityKg > 0,
    ).length,
    activeDemandCount: data.demands.filter(
      (demand) => demand.status === "open" && demand.quantityKg > 0,
    ).length,
    acceptedMatchCount: data.acceptedMatchCount,
    completedOrderCount: completedOrders.length,
    completedOrderVolumeKg: completedOrders.reduce(
      (total, deal) => total + deal.quantityKg,
      0,
    ),
  };
}
