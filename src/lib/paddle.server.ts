import { Environment, Paddle, EventName } from "@paddle/paddle-node-sdk";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export { EventName };

export type PaddleEnv = "sandbox" | "live";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev/paddle";

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === "sandbox" ? getEnv("PADDLE_SANDBOX_API_KEY") : getEnv("PADDLE_LIVE_API_KEY");
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Paddle(connectionApiKey, {
    environment: GATEWAY_BASE_URL as unknown as Environment,
    customHeaders: {
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
    },
  });
}

export async function gatewayFetch(
  env: PaddleEnv,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");
  return fetch(`${GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
      ...init?.headers,
    },
  });
}

export function getWebhookSecret(env: PaddleEnv): string {
  return env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

export class WebhookSignatureError extends Error {}

/**
 * İmzayı doğrular ve olayı çözümler.
 * İmza geçersizse `WebhookSignatureError` fırlatır (400 döndürülür).
 * İmza geçerli ama SDK olayı çözümleyemiyorsa (ör. ilgilenmediğimiz yeni bir
 * olay tipi) ham JSON ile geri döneriz; böylece Paddle'a gereksiz 400 dönüp
 * 3 gün boyunca yeniden denemesine yol açmayız.
 */
export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();
  const secret = getWebhookSecret(env);

  if (!signature || !body) {
    throw new WebhookSignatureError("Missing signature or body");
  }

  const paddle = getPaddleClient(env);

  if (!(await paddle.webhooks.isSignatureValid(body, secret, signature))) {
    throw new WebhookSignatureError("Invalid Paddle signature");
  }

  try {
    return await paddle.webhooks.unmarshal(body, secret, signature);
  } catch (e) {
    console.warn("Paddle event could not be parsed by SDK, falling back to raw JSON", e);
    const raw = JSON.parse(body) as { event_type?: string };
    return { eventType: raw.event_type ?? "unknown", data: null } as unknown as Awaited<
      ReturnType<typeof paddle.webhooks.unmarshal>
    >;
  }
}
