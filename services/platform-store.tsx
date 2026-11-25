"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  appwriteConfigured,
  endAppwriteSession,
  hasAppwriteSession,
  loadPlatformState,
  runPlatformAction,
} from "@/lib/appwrite";
import { initialPlatformState } from "@/services/mock-data";
import type {
  DealStatus,
  PlatformActions,
  PlatformState,
  UserRole,
} from "@/types";

const STORAGE_KEY = "kisan-connect-demo-v1";
const emptyPlatformState: PlatformState = {
  user: null,
  farmers: [],
  buyers: [],
  produce: [],
  demands: [],
  deals: [],
};
const PlatformContext = createContext<PlatformActions | null>(null);

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The platform request failed.";
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformState>(
    appwriteConfigured ? emptyPlatformState : initialPlatformState,
  );
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (appwriteConfigured) {
      void (async () => {
        try {
          const authenticated = await hasAppwriteSession();
          const remoteState = await loadPlatformState(authenticated);
          if (active) setState(remoteState);
        } catch (error) {
          if (active) setLoadError(errorMessage(error));
        } finally {
          if (active) setIsReady(true);
        }
      })();
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          startTransition(() =>
            setState({
              ...initialPlatformState,
              ...(JSON.parse(saved) as Partial<PlatformState>),
            }),
          );
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsReady(true);
      }
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || appwriteConfigured) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isReady]);

  const syncState = useCallback((remoteState: PlatformState) => {
    setLoadError(null);
    setState(remoteState);
    setIsReady(true);
  }, []);

  const refreshState = useCallback(async () => {
    if (!appwriteConfigured) return;
    const authenticated = await hasAppwriteSession();
    const remoteState = await loadPlatformState(authenticated);
    setLoadError(null);
    setState(remoteState);
  }, []);

  const signIn = useCallback((role: UserRole, name?: string, email?: string) => {
    const displayName =
      name?.trim() ||
      (role === "farmer"
        ? "Ravi Kumar"
        : role === "buyer"
          ? "Green Table Kitchen"
          : "Platform Admin");
    const id =
      role === "farmer" && displayName === "Ravi Kumar"
        ? "farmer-demo"
        : role === "buyer" && displayName === "Green Table Kitchen"
          ? "buyer-demo"
          : role === "admin"
            ? "admin-demo"
            : `${role}-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const user = {
      id,
      name: displayName,
      email: email || `${role}@demo.kisanconnect.in`,
      role,
      location: "Greater Noida",
    };
    setState((current) => ({
      ...current,
      user,
      farmers:
        role === "farmer" && !current.farmers.some((farmer) => farmer.id === id)
          ? [
              ...current.farmers,
              {
                id,
                name: displayName,
                location: user.location,
                phone: "",
                verified: false,
                rating: 5,
              },
            ]
          : current.farmers,
      buyers:
        role === "buyer" && !current.buyers.some((buyer) => buyer.id === id)
          ? [
              ...current.buyers,
              {
                id,
                name: displayName,
                buyerType: "Restaurant",
                location: user.location,
                phone: "",
              },
            ]
          : current.buyers,
    }));
  }, []);

  const signOut = useCallback(async () => {
    if (appwriteConfigured) {
      await endAppwriteSession();
      const publicState = await loadPlatformState(false);
      setState(publicState);
      return;
    }
    setState((current) => ({ ...current, user: null }));
  }, []);

  const addProduce = useCallback<PlatformActions["addProduce"]>(
    async (listing) => {
      if (appwriteConfigured) {
        setState(await runPlatformAction("addProduce", listing));
        return;
      }
      const produce = {
        ...listing,
        id: createId("produce"),
        status: "open" as const,
      };
      setState((current) => ({
        ...current,
        produce: [produce, ...current.produce],
      }));
    },
    [],
  );

  const postDemand = useCallback<PlatformActions["postDemand"]>(
    async (demand) => {
      if (appwriteConfigured) {
        setState(await runPlatformAction("postDemand", demand));
        return;
      }
      const nextDemand = {
        ...demand,
        id: createId("demand"),
        status: "open" as const,
      };
      setState((current) => ({
        ...current,
        demands: [nextDemand, ...current.demands],
      }));
    },
    [],
  );

  const updateProduce = useCallback<PlatformActions["updateProduce"]>(
    async (produceId, listing) => {
      if (appwriteConfigured) {
        setState(await runPlatformAction("updateProduce", { produceId, ...listing, date: listing.availableBy, price: listing.askingPricePerKg }));
        return;
      }
      setState((current) => ({
        ...current,
        produce: current.produce.map((item) =>
          item.id === produceId && item.status === "open"
            ? { ...item, ...listing }
            : item,
        ),
      }));
    },
    [],
  );

  const updateDemand = useCallback<PlatformActions["updateDemand"]>(
    async (demandId, demand) => {
      if (appwriteConfigured) {
        setState(await runPlatformAction("updateDemand", { demandId, ...demand, date: demand.requiredBy, price: demand.targetPricePerKg }));
        return;
      }
      setState((current) => ({
        ...current,
        demands: current.demands.map((item) =>
          item.id === demandId && item.status === "open"
            ? { ...item, ...demand }
            : item,
        ),
      }));
    },
    [],
  );

  const closeProduce = useCallback<PlatformActions["closeProduce"]>(
    async (produceId) => {
      if (appwriteConfigured) {
        setState(await runPlatformAction("closeProduce", { produceId }));
        return;
      }
      setState((current) => ({
        ...current,
        produce: current.produce.map((item) =>
          item.id === produceId && item.status === "open"
            ? { ...item, status: "closed" }
            : item,
        ),
      }));
    },
    [],
  );

  const closeDemand = useCallback<PlatformActions["closeDemand"]>(
    async (demandId) => {
      if (appwriteConfigured) {
        setState(await runPlatformAction("closeDemand", { demandId }));
        return;
      }
      setState((current) => ({
        ...current,
        demands: current.demands.map((item) =>
          item.id === demandId && item.status === "open"
            ? { ...item, status: "closed" }
            : item,
        ),
      }));
    },
    [],
  );

  const adminCloseListing = useCallback<PlatformActions["adminCloseListing"]>(
    async (kind, documentId) => {
      if (appwriteConfigured) {
        setState(
          await runPlatformAction("adminCloseListing", { kind, documentId }),
        );
        return;
      }
      setState((current) =>
        kind === "produce"
          ? {
              ...current,
              produce: current.produce.map((item) =>
                item.id === documentId && item.status === "open"
                  ? { ...item, status: "closed" }
                  : item,
              ),
            }
          : {
              ...current,
              demands: current.demands.map((item) =>
                item.id === documentId && item.status === "open"
                  ? { ...item, status: "closed" }
                  : item,
              ),
            },
      );
    },
    [],
  );

  const adminSetUserStatus = useCallback<PlatformActions["adminSetUserStatus"]>(
    async (userId, status) => {
      if (!appwriteConfigured) return;
      setState(
        await runPlatformAction("adminSetUserStatus", { userId, status }),
      );
    },
    [],
  );

  const acceptMatch = useCallback<PlatformActions["acceptMatch"]>(
    async (demandId, produceId) => {
      if (appwriteConfigured) {
        setState(await runPlatformAction("acceptMatch", { demandId, produceId }));
        return;
      }
      setState((current) => {
        const demand = current.demands.find(
          (item) => item.id === demandId && item.status === "open",
        );
        const produce = current.produce.find(
          (item) => item.id === produceId && item.status === "open",
        );
        if (
          !demand ||
          !produce ||
          demand.produce.toLowerCase() !== produce.produce.toLowerCase()
        ) {
          return current;
        }

        const quantityKg = Math.min(demand.quantityKg, produce.quantityKg);
        const deal = {
          id: createId("deal"),
          farmerId: produce.farmerId,
          farmerName: produce.farmerName,
          buyerId: demand.buyerId,
          buyerName: demand.buyerName,
          produce: produce.produce,
          quantityKg,
          agreedPricePerKg: produce.askingPricePerKg,
          totalValue: quantityKg * produce.askingPricePerKg,
          status: "confirmed" as const,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        const remainingQuantity = produce.quantityKg - quantityKg;
        const remainingDemand = demand.quantityKg - quantityKg;
        return {
          ...current,
          demands: current.demands.map((item) =>
            item.id === demandId
              ? {
                  ...item,
                  quantityKg: remainingDemand,
                  status: remainingDemand ? ("open" as const) : ("matched" as const),
                }
              : item,
          ),
          produce: current.produce.map((item) =>
            item.id === produceId
              ? {
                  ...item,
                  quantityKg: remainingQuantity,
                  status: remainingQuantity ? ("open" as const) : ("matched" as const),
                }
              : item,
          ),
          deals: [deal, ...current.deals],
        };
      });
    },
    [],
  );

  const updateDealStatus = useCallback<PlatformActions["updateDealStatus"]>(
    async (dealId, status: DealStatus) => {
      if (appwriteConfigured) {
        setState(await runPlatformAction("updateDealStatus", { dealId, status }));
        return;
      }
      setState((current) => ({
        ...current,
        deals: current.deals.map((deal) =>
          deal.id === dealId ? { ...deal, status } : deal,
        ),
      }));
    },
    [],
  );

  const value = useMemo(
    () => ({
      state,
      isReady,
      loadError,
      syncState,
      refreshState,
      signIn,
      signOut,
      addProduce,
      postDemand,
      updateProduce,
      updateDemand,
      closeProduce,
      closeDemand,
      adminCloseListing,
      adminSetUserStatus,
      acceptMatch,
      updateDealStatus,
    }),
    [
      state,
      isReady,
      loadError,
      syncState,
      refreshState,
      signIn,
      signOut,
      addProduce,
      postDemand,
      updateProduce,
      updateDemand,
      closeProduce,
      closeDemand,
      adminCloseListing,
      adminSetUserStatus,
      acceptMatch,
      updateDealStatus,
    ],
  );

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used within PlatformProvider");
  return context;
}
