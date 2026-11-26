import type { Deal, DemandListing, UserRole } from "@/types";

export function calculateRiderFee(distanceKm: number, ratePerKm: number) {
  return Math.round(distanceKm * ratePerKm);
}

export function canRiderAdvanceDelivery(
  deal: Pick<Deal, "riderId" | "paymentStatus" | "deliveryStatus">,
  riderId: string,
  nextStatus: "at_farmer" | "delivered",
) {
  const expectedStatus =
    nextStatus === "at_farmer" ? "rider_assigned" : "at_farmer";
  return (
    deal.riderId === riderId &&
    deal.paymentStatus === "simulated_paid" &&
    deal.deliveryStatus === expectedStatus
  );
}

export function canViewOrderDeliveryAddress(
  order: Pick<Deal, "buyerId" | "riderId">,
  role: UserRole | null,
  userId?: string,
) {
  return (
    role === "admin" ||
    (role === "buyer" && order.buyerId === userId) ||
    (role === "rider" && order.riderId === userId)
  );
}

export function canViewDemandDeliveryAddress(
  demand: Pick<DemandListing, "buyerId">,
  role: UserRole | null,
  userId?: string,
) {
  return role === "buyer" && demand.buyerId === userId;
}

export function omitDemandDeliveryAddress(
  demand: DemandListing,
): Omit<DemandListing, "deliveryAddress"> {
  const visibleDemand = { ...demand };
  delete visibleDemand.deliveryAddress;
  return visibleDemand;
}
