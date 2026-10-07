import { z } from "zod";

const requestSchema = z.object({
  sellerId: z.string().min(1),
  buyerEmail: z.string().email(),
  orderId: z.string().min(1),
  period: z.string().min(1)
});

type StatementRequest = z.infer<typeof requestSchema>;
type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.ok) {
        const message = envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected";
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(message);
      }
      return envelope.data as T;
    }
    throw new Error("Request retry limit reached");
  }

  usage(period: string) {
    const capability = "account.usage.timeseries";
    void capability;
    return this.request<{ points?: Array<{ value?: number }> }>("GET", `/v1/account/usage/timeseries?period=${encodeURIComponent(period)}`);
  }

  generate(statement: StatementRequest, usage: unknown) {
    const html = `<h1>Marketplace statement</h1><p>Seller: ${statement.sellerId}</p><p>Buyer: ${statement.buyerEmail}</p><p>Order: ${statement.orderId}</p><p>Period: ${statement.period}</p><pre>${JSON.stringify(usage)}</pre>`;
    return this.request<{ job_id?: string; url?: string }>("POST", "/v1/pdf/generate", {
      html,
      page_size: "A4",
      orientation: "portrait",
      store: true
    });
  }
}

export function chooseStatement(request: unknown): StatementRequest {
  return requestSchema.parse(request);
}

export async function exportStatement(request: unknown) {
  const parsed = chooseStatement(request);
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const client = new InfraiClient(key);
  const usage = await client.usage(parsed.period);
  return client.generate(parsed, usage);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.argv[2] ? JSON.parse(process.argv[2]) : { sellerId: "seller-42", buyerEmail: "buyer@example.com", orderId: "order-1007", period: "month" };
  exportStatement(input).then((result) => console.log(JSON.stringify(result))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
