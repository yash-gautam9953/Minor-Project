import type {
  BuyerProfile,
  Deal,
  DemandListing,
  FarmerProfile,
  PlatformMetrics,
  ProduceListing,
} from "@/types";
import { calculatePlatformCommission } from "@/services/commission";

export function calculatePlatformMetrics(data: {
  farmers: FarmerProfile[];
  buyers: BuyerProfile[];
  produce: ProduceListing[];
  demands: DemandListing[];
  deals: Deal[];
  acceptedMatchCount: number;
}): PlatformMetrics {
  const completedOrders = data.deals.filter((deal) => deal.status === "completed");
  const acceptedDeals = data.deals.filter((deal) => deal.status !== "pending");

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
    estimatedCommissionTotal: acceptedDeals.reduce(
      (total, deal) => total + calculatePlatformCommission(deal.totalValue),
      0,
    ),
  };
}
