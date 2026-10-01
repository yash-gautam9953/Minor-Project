import type {
  BuyerProfile,
  Deal,
  DemandListing,
  FarmerProfile,
  PlatformState,
  PricePoint,
  ProduceListing,
} from "@/types";

export const locations = ["Greater Noida", "Noida", "Delhi", "Ghaziabad"];
export const crops = ["Tomato", "Potato", "Onion", "Wheat", "Rice", "Cauliflower"];

export const farmers: FarmerProfile[] = [
  { id: "farmer-demo", name: "Ravi Kumar", location: "Greater Noida", phone: "+91 98765 43210", verified: true, rating: 4.9 },
  { id: "farmer-noida", name: "Sunita Devi", location: "Noida", phone: "+91 98765 43211", verified: true, rating: 4.8 },
  { id: "farmer-delhi", name: "Amit Singh", location: "Delhi", phone: "+91 98765 43212", verified: true, rating: 4.7 },
  { id: "farmer-ghaziabad", name: "Pooja Yadav", location: "Ghaziabad", phone: "+91 98765 43213", verified: true, rating: 4.9 },
  { id: "farmer-ankit", name: "Ankit Sharma", location: "Greater Noida", phone: "+91 98765 43214", verified: false, rating: 4.6 },
];

export const buyers: BuyerProfile[] = [
  { id: "buyer-demo", name: "Green Table Kitchen", buyerType: "Restaurant", location: "Greater Noida", phone: "+91 98100 12001" },
  { id: "buyer-hostel", name: "Sharda Student Hostel", buyerType: "Hostel", location: "Noida", phone: "+91 98100 12002" },
  { id: "buyer-retail", name: "Fresh Corner Market", buyerType: "Retailer", location: "Delhi", phone: "+91 98100 12003" },
  { id: "buyer-small", name: "NCR Foods Co.", buyerType: "Small business", location: "Ghaziabad", phone: "+91 98100 12004" },
];

export const initialProduce: ProduceListing[] = [
  { id: "produce-demo-tomato", farmerId: "farmer-demo", farmerName: "Ravi Kumar", produce: "Tomato", quantityKg: 700, askingPricePerKg: 25, location: "Greater Noida", availableBy: "2026-10-02", status: "open" },
  { id: "produce-noida-tomato", farmerId: "farmer-noida", farmerName: "Sunita Devi", produce: "Tomato", quantityKg: 420, askingPricePerKg: 26, location: "Noida", availableBy: "2026-10-03", status: "open" },
  { id: "produce-delhi-potato", farmerId: "farmer-delhi", farmerName: "Amit Singh", produce: "Potato", quantityKg: 900, askingPricePerKg: 22, location: "Delhi", availableBy: "2026-10-04", status: "open" },
  { id: "produce-ghaziabad-onion", farmerId: "farmer-ghaziabad", farmerName: "Pooja Yadav", produce: "Onion", quantityKg: 560, askingPricePerKg: 29, location: "Ghaziabad", availableBy: "2026-10-02", status: "open" },
  { id: "produce-ankit-cauliflower", farmerId: "farmer-ankit", farmerName: "Ankit Sharma", produce: "Cauliflower", quantityKg: 350, askingPricePerKg: 31, location: "Greater Noida", availableBy: "2026-10-05", status: "open" },
  { id: "produce-noida-rice", farmerId: "farmer-noida", farmerName: "Sunita Devi", produce: "Rice", quantityKg: 1200, askingPricePerKg: 36, location: "Noida", availableBy: "2026-10-06", status: "open" },
  { id: "produce-ankit-wheat", farmerId: "farmer-ankit", farmerName: "Ankit Sharma", produce: "Wheat", quantityKg: 1500, askingPricePerKg: 28, location: "Greater Noida", availableBy: "2026-10-07", status: "open" },
];

export const initialDemands: DemandListing[] = [
  { id: "demand-demo-tomato", buyerId: "buyer-demo", buyerName: "Green Table Kitchen", buyerType: "Restaurant", produce: "Tomato", quantityKg: 300, targetPricePerKg: 27, location: "Greater Noida", requiredBy: "2026-10-05", status: "open" },
  { id: "demand-hostel-tomato", buyerId: "buyer-hostel", buyerName: "Sharda Student Hostel", buyerType: "Hostel", produce: "Tomato", location: "Noida", quantityKg: 500, targetPricePerKg: 27, requiredBy: "2026-10-06", status: "open" },
  { id: "demand-market-potato", buyerId: "buyer-retail", buyerName: "Fresh Corner Market", buyerType: "Retailer", produce: "Potato", location: "Delhi", quantityKg: 400, targetPricePerKg: 24, requiredBy: "2026-10-04", status: "open" },
  { id: "demand-small-onion", buyerId: "buyer-small", buyerName: "NCR Foods Co.", buyerType: "Small business", produce: "Onion", location: "Ghaziabad", quantityKg: 250, targetPricePerKg: 31, requiredBy: "2026-10-07", status: "open" },
  { id: "demand-delhi-rice", buyerId: "buyer-retail", buyerName: "Fresh Corner Market", buyerType: "Retailer", produce: "Rice", location: "Delhi", quantityKg: 600, targetPricePerKg: 38, requiredBy: "2026-10-08", status: "open" },
];

export const initialDeals: Deal[] = [
  { id: "deal-demo-pending", farmerId: "farmer-demo", farmerName: "Ravi Kumar", buyerId: "buyer-demo", buyerName: "Green Table Kitchen", produce: "Tomato", quantityKg: 120, agreedPricePerKg: 25, totalValue: 3000, status: "pending", createdAt: "2026-09-29" },
];

export const priceHistory: PricePoint[] = [
  { date: "Sep 24", farmer: 22, market: 27, retail: 35 },
  { date: "Sep 25", farmer: 23, market: 28, retail: 36 },
  { date: "Sep 26", farmer: 24, market: 29, retail: 37 },
  { date: "Sep 27", farmer: 23, market: 29, retail: 36 },
  { date: "Sep 28", farmer: 25, market: 30, retail: 38 },
  { date: "Sep 29", farmer: 25, market: 30, retail: 38 },
  { date: "Sep 30", farmer: 26, market: 31, retail: 39 },
];

export const demandTrend = [
  { date: "Mon", demand: 2400, matched: 1800 },
  { date: "Tue", demand: 3100, matched: 2200 },
  { date: "Wed", demand: 2700, matched: 1950 },
  { date: "Thu", demand: 3900, matched: 3050 },
  { date: "Fri", demand: 3500, matched: 2800 },
  { date: "Sat", demand: 4600, matched: 3700 },
  { date: "Sun", demand: 4100, matched: 3450 },
];

export const initialPlatformState: PlatformState = {
  user: null,
  farmers,
  buyers,
  produce: initialProduce,
  demands: initialDemands,
  deals: initialDeals,
};