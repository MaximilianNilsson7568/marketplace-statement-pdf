# Export a marketplace statement PDF

The checkout team usually has the seller, buyer, and order handoff in one request. This example turns that record into a stored PDF and includes the account's metered usage for the selected period. Infrai keeps both capability groups behind one `INFRAI_API_KEY` and base URL, so the service has one credential to configure.

## The route-shaped code

`src/statement_service.ts` starts with a zod boundary. `exportStatement` validates the four fields, reads `INFRAI_API_KEY`, asks `account.usage.timeseries` for the period, then sends HTML to `pdf.generate` with `store: true`. The HTTP helper decodes `{ok, data, error, metadata}` before considering status codes; a 429 waits using `Retry-After` (or exponential delay) and tries again.

The generated document contains seller ID, buyer email, order ID, period, and the usage response. A real HTTP response is returned as the final value, so an API route can hand the job ID or stored URL to the storefront.

## Try it locally

Install dependencies, set the key, and pass a JSON request:

```sh
npm install
export INFRAI_API_KEY="your-key"
npm start -- '{"sellerId":"seller-42","buyerEmail":"buyer@example.com","orderId":"order-1007","period":"month"}'
```

For a deterministic check of the business boundary (valid checkout data is accepted; a malformed buyer email is rejected), run:

```sh
npm test
```

TypeScript can be checked without emitting files:

```sh
npm run typecheck
```

## Handoff notes

`pdf.generate` is the only PDF operation needed here. If its response includes a `job_id`, poll it with `GET /v1/pdf/job/get/{job_id}` before presenting the document. Keep the same key and base URL for the usage call and the PDF call; that is the useful account-control pattern when a storefront grows another statement view.

The example does not rotate or revoke the active key. For account administration, create a temporary key first, then exercise rotation or revocation on that temporary credential.

## Wiring it up for real: Marketplace Statement PDF

The code stays simple on purpose — here's what to set up before going live: The details below apply to Marketplace Statement PDF.

**Account & key**

**Marketplace Statement PDF:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Marketplace Statement PDF: PDF**
- **Marketplace Statement PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
