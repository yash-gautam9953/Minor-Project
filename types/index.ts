export type UserRole = "farmer" | "buyer" | "admin";
export type BuyerType = "Retailer" | "Restaurant" | "Hostel" | "Small business";
export type ListingStatus = "open" | "matched" | "closed";
export type DealStatus = "pending" | "confirmed" | "completed";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location: string;
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
  requiredBy: string;
  status: ListingStatus;
}

export interface Deal {
  id: string;
  farmerId: string;
  farmerName: string;
  buyerId: string;
  buyerName: string;
  produce: string;
  quantityKg: number;
  agreedPricePerKg: number;
  totalValue: number;
  status: DealStatus;
  createdAt: string;
}

export interface PricePoint {
  date: string;
  farmer: number;
  market: number;
  retail: number;
}

export interface PlatformState {
  user: UserProfile | null;
  farmers: FarmerProfile[];
  buyers: BuyerProfile[];
  produce: ProduceListing[];
  demands: DemandListing[];
  deals: Deal[];
}

export interface PlatformActions {
  state: PlatformState;
  signIn: (role: UserRole, name?: string, email?: string) => void;
  signOut: () => void;
  addProduce: (listing: Omit<ProduceListing, "id" | "status">) => void;
  postDemand: (demand: Omit<DemandListing, "id" | "status">) => void;
  acceptMatch: (demandId: string, produceId: string) => void;
  updateDealStatus: (dealId: string, status: DealStatus) => void;
}