"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { endAppwriteSession, saveAppwriteDocument } from "@/lib/appwrite";
import { initialPlatformState } from "@/services/mock-data";
import type { DealStatus, PlatformActions, PlatformState, UserRole } from "@/types";

const STORAGE_KEY = "kisan-connect-demo-v1";
const PlatformContext = createContext<PlatformActions | null>(null);

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformState>(initialPlatformState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) startTransition(() => setState({ ...initialPlatformState, ...JSON.parse(saved) as Partial<PlatformState> }));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      startTransition(() => setHydrated(true));
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const signIn = useCallback((role: UserRole, name?: string, email?: string) => {
    const displayName = name?.trim() || (role === "farmer" ? "Ravi Kumar" : role === "buyer" ? "Green Table Kitchen" : "Platform Admin");
    const id = role === "farmer" && displayName === "Ravi Kumar" ? "farmer-demo"
      : role === "buyer" && displayName === "Green Table Kitchen" ? "buyer-demo"
        : role === "admin" ? "admin-demo" : `${role}-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const user = { id, name: displayName, email: email || `${role}@demo.kisanconnect.in`, role, location: "Greater Noida" };
    const farmers = role === "farmer" && !state.farmers.some((farmer) => farmer.id === id)
      ? [...state.farmers, { id, name: displayName, location: user.location, phone: "", verified: false, rating: 5 }]
      : state.farmers;
    const buyers = role === "buyer" && !state.buyers.some((buyer) => buyer.id === id)
      ? [...state.buyers, { id, name: displayName, buyerType: "Restaurant" as const, location: user.location, phone: "" }]
      : state.buyers;
    setState({ ...state, user, farmers, buyers });
    void saveAppwriteDocument("users", user);
    if (role === "farmer") void saveAppwriteDocument("farmers", { ...user, verified: false, rating: 5 });
    if (role === "buyer") void saveAppwriteDocument("buyers", { ...user, buyerType: "Restaurant" });
  }, [state]);

  const signOut = useCallback(() => {
    void endAppwriteSession();
    setState((current) => ({ ...current, user: null }));
  }, []);

  const addProduce = useCallback<PlatformActions["addProduce"]>((listing) => {
    const produce = { ...listing, id: createId("produce"), status: "open" as const };
    setState((current) => ({ ...current, produce: [produce, ...current.produce] }));
    void saveAppwriteDocument("produce", produce as unknown as Record<string, unknown>);
  }, []);

  const postDemand = useCallback<PlatformActions["postDemand"]>((demand) => {
    const nextDemand = { ...demand, id: createId("demand"), status: "open" as const };
    setState((current) => ({ ...current, demands: [nextDemand, ...current.demands] }));
    void saveAppwriteDocument("demands", nextDemand as unknown as Record<string, unknown>);
  }, []);

  const acceptMatch = useCallback<PlatformActions["acceptMatch"]>((demandId, produceId) => {
    const demand = state.demands.find((item) => item.id === demandId && item.status === "open");
    const produce = state.produce.find((item) => item.id === produceId && item.status === "open");
    if (!demand || !produce || demand.produce.toLowerCase() !== produce.produce.toLowerCase()) return;

    const quantityKg = Math.min(demand.quantityKg, produce.quantityKg);
    const deal = {
      id: createId("deal"), farmerId: produce.farmerId, farmerName: produce.farmerName,
      buyerId: demand.buyerId, buyerName: demand.buyerName, produce: produce.produce,
      quantityKg, agreedPricePerKg: produce.askingPricePerKg,
      totalValue: quantityKg * produce.askingPricePerKg, status: "confirmed" as const,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const remainingQuantity = produce.quantityKg - quantityKg;
    const remainingDemand = demand.quantityKg - quantityKg;
    setState({
      ...state,
      demands: state.demands.map((item) => item.id === demandId
        ? { ...item, quantityKg: remainingDemand, status: remainingDemand ? "open" as const : "matched" as const }
        : item),
      produce: state.produce.map((item) => item.id === produceId
        ? { ...item, quantityKg: remainingQuantity, status: remainingQuantity ? "open" as const : "matched" as const }
        : item),
      deals: [deal, ...state.deals],
    });
    void saveAppwriteDocument("matches", { demandId, produceId, quantityKg, status: "matched" });
    void saveAppwriteDocument("orders", deal as unknown as Record<string, unknown>);
  }, [state]);

  const updateDealStatus = useCallback((dealId: string, status: DealStatus) => {
    setState((current) => ({
      ...current,
      deals: current.deals.map((deal) => deal.id === dealId ? { ...deal, status } : deal),
    }));
  }, []);

  const value = useMemo(() => ({ state, signIn, signOut, addProduce, postDemand, acceptMatch, updateDealStatus }), [
    state, signIn, signOut, addProduce, postDemand, acceptMatch, updateDealStatus,
  ]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used within PlatformProvider");
  return context;
}