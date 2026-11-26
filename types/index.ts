export type UserRole = "farmer" | "buyer" | "rider" | "admin";
export type BuyerType = "Retailer" | "Restaurant" | "Hostel" | "Small business";
export type ListingStatus = "open" | "matched" | "closed";
export type DealStatus = "pending" | "confirmed" | "completed";
export type PaymentStatus = "unpaid" | "simulated_paid";
export type DemoPaymentMethod = "upi" | "card" | "bank";
export type DeliveryStatus =
  | "awaiting_payment"
  | "awaiting_assignment"
  | "rider_assigned"
  | "at_farmer"
  | "delivered";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location: string;
  accountStatus?: "enabled" | "disabled";
}

export interface FarmerProfile {
  id: string;
  name: string;
  location: string;
  phone: string;
  verified: boolean;
  rating: number;
}

export interface BuyerProfile {
  id: string;
  name: string;
  buyerType: BuyerType;
  location: string;
  phone: string;
}

export interface RiderProfile {
  id: string;
  name: string;
  location: string;
}

export interface ProduceListing {
  id: string;
  farmerId: string;
  farmerName: string;
  produce: string;
  quantityKg: number;
  askingPricePerKg: number;
  location: string;
  availableBy: string;
  status: ListingStatus;
}

export interface DemandListing {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerType: BuyerType;
  produce: string;
  quantityKg: number;
  targetPricePerKg: number;
  location: string;
  deliveryAddress?: string;
  requiredBy: string;
  status: ListingStatus;
}

export interface Deal {
  id: string;
  farmerId: string;
  farmerName: string;
  buyerId: string;
  buyerName: string;
  farmerLocation?: string | null;
  deliveryAddress?: string | null;
  produce: string;
  quantityKg: number;
  agreedPricePerKg: number;
  totalValue: number;
  status: DealStatus;
  createdAt: string;
  paymentStatus?: PaymentStatus;
  demoPaymentMethod?: DemoPaymentMethod | null;
  paymentSimulatedAt?: string | null;
  deliveryStatus?: DeliveryStatus;
  riderId?: string | null;
  riderName?: string | null;
  distanceKm?: number | null;
  riderRatePerKm?: number | null;
  riderFee?: number | null;
  deliveryUpdatedAt?: string | null;
}

export interface PlatformMetrics {
  farmerCount: number;
  buyerCount: number;
  activeProduceCount: number;
  activeDemandCount: number;
  acceptedMatchCount: number;
  completedOrderCount: number;
  completedOrderVolumeKg: number;
  estimatedCommissionTotal: number;
}

export interface PlatformState {
  user: UserProfile | null;
  farmers: FarmerProfile[];
  buyers: BuyerProfile[];
  riders: RiderProfile[];
  produce: ProduceListing[];
  demands: DemandListing[];
  deals: Deal[];
  metrics: PlatformMetrics;
}

export interface PlatformActions {
  state: PlatformState;
  isReady: boolean;
  loadError: string | null;
  syncState: (state: PlatformState) => void;
  refreshState: () => Promise<void>;
  signOut: () => Promise<void>;
  addProduce: (listing: Omit<ProduceListing, "id" | "status">) => Promise<void>;
  postDemand: (demand: Omit<DemandListing, "id" | "status">) => Promise<void>;
  updateProduce: (
    produceId: string,
    listing: Pick<ProduceListing, "produce" | "quantityKg" | "askingPricePerKg" | "location" | "availableBy">,
  ) => Promise<void>;
  updateDemand: (
    demandId: string,
    demand: Pick<DemandListing, "produce" | "quantityKg" | "targetPricePerKg" | "location" | "deliveryAddress" | "requiredBy" | "buyerType">,
  ) => Promise<void>;
  closeProduce: (produceId: string) => Promise<void>;
  closeDemand: (demandId: string) => Promise<void>;
  acceptMatch: (demandId: string, produceId: string) => Promise<void>;
  updateDealStatus: (dealId: string, status: DealStatus) => Promise<void>;
  simulatePayment: (dealId: string, method: DemoPaymentMethod) => Promise<void>;
  adminAssignRider: (
    dealId: string,
    riderId: string,
    distanceKm: number,
    ratePerKm: number,
  ) => Promise<void>;
  riderUpdateDeliveryStatus: (
    dealId: string,
    status: "at_farmer" | "delivered",
  ) => Promise<void>;
}