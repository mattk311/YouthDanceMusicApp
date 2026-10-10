import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { AppState, Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";

let configured = false;
let configurationError: Error | null = null;
let customerOperations: Promise<unknown> = Promise.resolve();

function serializeCustomerOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = customerOperations.then(operation);
  customerOperations = result.catch(() => undefined);
  return result;
}

function forCustomer<T>(id: string, operation: () => Promise<T>): Promise<T> {
  return serializeCustomerOperation(async () => {
    if (await Purchases.getAppUserID() !== id) await Purchases.logIn(id);
    return operation();
  });
}

export function initializeRevenueCat() {
  if (Platform.OS !== "ios" || configured) return;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (!apiKey) {
    configurationError = new Error("App Store purchases are not configured. Please contact support.");
    return;
  }
  Purchases.configure({ apiKey });
  configured = true;
}

function hasPro(info: CustomerInfo | undefined): boolean {
  return Boolean(
    info?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER],
  );
}

function useSubscriptionContext() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Platform.OS === "ios" && configured && Boolean(user);
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;

  useEffect(() => {
    if (Platform.OS !== "ios" || !configured || user) return;
    queryClient.removeQueries({ queryKey: ["revenuecat"] });
    serializeCustomerOperation(async () => {
      if (!await Purchases.isAnonymous()) await Purchases.logOut();
    }).catch(() => console.warn("[RevenueCat] Could not clear customer session"));
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["revenuecat", "customer-info", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["usage"] });
    };
    const listener = () => refresh();
    Purchases.addCustomerInfoUpdateListener(listener);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
      subscription.remove();
    };
  }, [enabled, user?.id, queryClient]);

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info", user?.id],
    queryFn: () => forCustomer(user!.id, () => Purchases.getCustomerInfo()),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings", user?.id],
    queryFn: () => Purchases.getOfferings(),
    enabled,
    staleTime: 300_000,
  });

  const syncAccount = async (info: CustomerInfo) => {
    if (!user || currentUserId.current !== user.id) {
      throw new Error("Your account changed. Sign in again to refresh purchases.");
    }
    await apiFetch("/api/subscription/revenuecat/sync", { method: "POST" });
    await queryClient.invalidateQueries({ queryKey: ["usage"] });
    return info;
  };

  useEffect(() => {
    if (!customerInfoQuery.data) return;
    syncAccount(customerInfoQuery.data).catch((error) => {
      console.warn("[RevenueCat] Could not sync entitlement:", error);
    });
  }, [customerInfoQuery.data]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      if (!user) throw new Error("Sign in before purchasing.");
      const { customerInfo } = await forCustomer(user.id, () => Purchases.purchasePackage(packageToPurchase));
      return syncAccount(customerInfo);
    },
    onSuccess: (info) => {
      queryClient.setQueryData(
        ["revenuecat", "customer-info", user?.id],
        info,
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in before restoring purchases.");
      return syncAccount(await forCustomer(user.id, () => Purchases.restorePurchases()));
    },
    onSuccess: (info) => {
      queryClient.setQueryData(
        ["revenuecat", "customer-info", user?.id],
        info,
      );
    },
  });

  const value = useMemo(
    () => ({
      customerInfo: customerInfoQuery.data,
      offerings: offeringsQuery.data,
      isSubscribed: hasPro(customerInfoQuery.data),
      isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
      error: configurationError ?? customerInfoQuery.error ?? offeringsQuery.error,
      purchaseError: purchaseMutation.error,
      restoreError: restoreMutation.error,
      purchase: purchaseMutation.mutateAsync,
      restore: restoreMutation.mutateAsync,
      isPurchasing: purchaseMutation.isPending,
      isRestoring: restoreMutation.isPending,
    }),
    [
      customerInfoQuery.data,
      customerInfoQuery.error,
      customerInfoQuery.isLoading,
      offeringsQuery.data,
      offeringsQuery.error,
      offeringsQuery.isLoading,
      purchaseMutation.error,
      purchaseMutation.isPending,
      purchaseMutation.mutateAsync,
      restoreMutation.error,
      restoreMutation.isPending,
      restoreMutation.mutateAsync,
    ],
  );

  return value;
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}