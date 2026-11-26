"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  endAppwriteSession,
  hasAppwriteSession,
  loadPlatformState,
  runPlatformAction,
} from "@/lib/appwrite";
import type {
  DemoPaymentMethod,
  DealStatus,
  PlatformActions,
  PlatformState,
} from "@/types";

const emptyPlatformState: PlatformState = {
  user: null,
  farmers: [],
  buyers: [],
  riders: [],
  produce: [],
  demands: [],
  deals: [],
  metrics: {
    farmerCount: 0,
    buyerCount: 0,
    activeProduceCount: 0,
    activeDemandCount: 0,
    acceptedMatchCount: 0,
    completedOrderCount: 0,
    completedOrderVolumeKg: 0,
    estimatedCommissionTotal: 0,
  },
};
const PlatformContext = createContext<PlatformActions | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The platform request failed.";
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformState>(emptyPlatformState);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
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
    return () => {
      active = false;
    };
  }, []);

  const syncState = useCallback((remoteState: PlatformState) => {
    setLoadError(null);
    setState(remoteState);
    setIsReady(true);
  }, []);

  const refreshState = useCallback(async () => {
    const authenticated = await hasAppwriteSession();
    const remoteState = await loadPlatformState(authenticated);
    setLoadError(null);
    setState(remoteState);
  }, []);

  const signOut = useCallback(async () => {
    await endAppwriteSession();
    setState(emptyPlatformState);
    setLoadError(null);
    try {
      setState(await loadPlatformState(false));
    } catch (error) {
      setLoadError(errorMessage(error));
      throw error;
    }
  }, []);

  const addProduce = useCallback<PlatformActions["addProduce"]>(
    async (listing) => {
      setState(await runPlatformAction("addProduce", listing));
    },
    [],
  );

  const updateFarmPickupAddress = useCallback<
    PlatformActions["updateFarmPickupAddress"]
  >(
    async (pickupAddress) => {
      setState(
        await runPlatformAction("updateFarmPickupAddress", { pickupAddress }),
      );
    },
    [],
  );

  const postDemand = useCallback<PlatformActions["postDemand"]>(
    async (demand) => {
      setState(await runPlatformAction("postDemand", demand));
    },
    [],
  );

  const updateProduce = useCallback<PlatformActions["updateProduce"]>(
    async (produceId, listing) => {
      setState(
        await runPlatformAction("updateProduce", {
          produceId,
          ...listing,
          date: listing.availableBy,
          price: listing.askingPricePerKg,
        }),
      );
    },
    [],
  );

  const updateDemand = useCallback<PlatformActions["updateDemand"]>(
    async (demandId, demand) => {
      setState(
        await runPlatformAction("updateDemand", {
          demandId,
          ...demand,
          date: demand.requiredBy,
          price: demand.targetPricePerKg,
        }),
      );
    },
    [],
  );

  const closeProduce = useCallback<PlatformActions["closeProduce"]>(
    async (produceId) => {
      setState(await runPlatformAction("closeProduce", { produceId }));
    },
    [],
  );

  const closeDemand = useCallback<PlatformActions["closeDemand"]>(
    async (demandId) => {
      setState(await runPlatformAction("closeDemand", { demandId }));
    },
    [],
  );

  const acceptMatch = useCallback<PlatformActions["acceptMatch"]>(
    async (demandId, produceId) => {
      setState(
        await runPlatformAction("acceptMatch", { demandId, produceId }),
      );
    },
    [],
  );

  const updateDealStatus = useCallback<PlatformActions["updateDealStatus"]>(
    async (dealId, status: DealStatus) => {
      setState(await runPlatformAction("updateDealStatus", { dealId, status }));
    },
    [],
  );

  const simulatePayment = useCallback<PlatformActions["simulatePayment"]>(
    async (dealId, method: DemoPaymentMethod) => {
      setState(await runPlatformAction("simulatePayment", { dealId, method }));
    },
    [],
  );

  const adminAssignRider = useCallback<PlatformActions["adminAssignRider"]>(
    async (dealId, riderId, distanceKm, ratePerKm) => {
      setState(
        await runPlatformAction("adminAssignRider", {
          dealId,
          riderId,
          distanceKm,
          ratePerKm,
        }),
      );
    },
    [],
  );

  const riderUpdateDeliveryStatus = useCallback<
    PlatformActions["riderUpdateDeliveryStatus"]
  >(
    async (dealId, status) => {
      setState(
        await runPlatformAction("riderUpdateDeliveryStatus", { dealId, status }),
      );
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
      signOut,
      addProduce,
      updateFarmPickupAddress,
      postDemand,
      updateProduce,
      updateDemand,
      closeProduce,
      closeDemand,
      acceptMatch,
      updateDealStatus,
      simulatePayment,
      adminAssignRider,
      riderUpdateDeliveryStatus,
    }),
    [
      state,
      isReady,
      loadError,
      syncState,
      refreshState,
      signOut,
      addProduce,
      updateFarmPickupAddress,
      postDemand,
      updateProduce,
      updateDemand,
      closeProduce,
      closeDemand,
      acceptMatch,
      updateDealStatus,
      simulatePayment,
      adminAssignRider,
      riderUpdateDeliveryStatus,
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
