import { createServerFn } from "@tanstack/react-start";
import { gatewayFetch, getPaddleClient, type PaddleEnv } from "@/lib/paddle.server";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: PaddleEnv }) => data)
  .handler(async ({ data }) => {
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const result = (await response.json()) as { data?: Array<{ id: string }> };
    if (!result.data?.length) throw new Error("Price not found");
    return result.data[0].id;
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .inputValidator((data: { customerId: string; subscriptionId: string; environment: PaddleEnv }) => data)
  .handler(async ({ data }) => {
    const paddle = getPaddleClient(data.environment);
    const session = await paddle.customerPortalSessions.create(data.customerId, [
      data.subscriptionId,
    ]);
    return { url: session.urls.general.overview };
  });
