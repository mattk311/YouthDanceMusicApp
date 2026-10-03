import { ReplitConnectors } from "@replit/connectors-sdk";

interface ActiveEntitlement {
  id?: string;
  entitlement_id?: string;
}

interface ActiveEntitlementsResponse {
  items?: ActiveEntitlement[];
}

export function includesRevenueCatEntitlement(
  items: ActiveEntitlement[],
  entitlementResourceId: string,
): boolean {
  return items.some(
    (item) =>
      item.id === entitlementResourceId ||
      item.entitlement_id === entitlementResourceId,
  );
}

export async function hasActiveRevenueCatProEntitlement(
  appUserId: string,
): Promise<boolean> {
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  const entitlementResourceId = process.env.REVENUECAT_PRO_ENTITLEMENT_ID;
  if (!projectId || !entitlementResourceId) {
    throw new Error("RevenueCat project or Pro entitlement is not configured");
  }

  const connectors = new ReplitConnectors();
  const path =
    `/v2/projects/${encodeURIComponent(projectId)}` +
    `/customers/${encodeURIComponent(appUserId)}/active_entitlements`;
  const response = await connectors.proxy("revenuecat", path, { method: "GET" });

  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`RevenueCat entitlement lookup failed (${response.status})`);
  }

  const data = (await response.json()) as ActiveEntitlementsResponse;
  return includesRevenueCatEntitlement(
    data.items ?? [],
    entitlementResourceId,
  );
}