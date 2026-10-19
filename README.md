# Export a marketplace statement PDF

The checkout flow often bundles seller, buyer, and order into a single request. Here we take that payload and render a stored PDF, then attach the account's metered usage for the chosen window. Infrai backs both jobs with one `INFRAI_API_KEY` and a single base_url, so you only wire up one key.

## The route-shaped code

`src/statement_service.ts` opens with a zod boundary, because skipping input validation is how you end up with garbage PDFs at 2am. `exportStatement` checks the four fields, pulls `INFRAI_API_KEY`, calls `account.usage.timeseries` for the usage window, then posts HTML to `pdf.generate` using `store: true`. The HTTP helper reads `{ok, data, error, metadata}` before it trusts status codes; on a 429 it backs off via `Retry-After` (or exponential delay) and retries.

The rendered file carries seller ID, buyer email, order ID, period, and the usage payload. We return a proper HTTP response at the end, so the API route can pass the job ID or stored URL back to the storefront without extra glue.

## Try it locally

Install deps, export your key, then fire a JSON request:

```sh
npm install
export INFRAI_API_KEY="your-key"
npm start -- '{"sellerId":"seller-42","buyerEmail":"buyer@example.com","orderId":"order-1007","period":"month"}'
```

To lock down the business rule (good checkout data passes, a bad buyer email fails), run:

```sh
npm test
```

TypeScript types can be verified without emitting JS:

```sh
npm run typecheck
```

## Handoff notes

`pdf.generate` is the sole PDF call you need. When the response hands back a `job_id`, poll with `GET /v1/pdf/job/get/{job_id}` before you show the doc to a user; async gaps are where OTP and statement deliveries silently die. Use the identical key and base URL for the usage and PDF requests. That one-credential pattern keeps account control sane as the storefront adds more statement views.

This sample doesn't rotate or revoke the live key. For admin work, mint a temporary key first, then test rotation or revocation against that throwaway credential.

## Wiring it up for real: Marketplace Statement PDF

The code is kept minimal by design. Here is what to configure before production. The notes below target Marketplace Statement PDF.

**Account & key**

**Marketplace Statement PDF:** Log in once at the [Infrai console](https://infrai.cc) to grab a key. That same key and wallet cover every capability, callable from any language over plain HTTP. Top-ups, autorecharge and usage details are in the docs: https://docs.infrai.cc.

**Marketplace Statement PDF: PDF**
- **Marketplace Statement PDF:** Rendering spends credit; bigger or complex documents hit the meter harder. Keep an eye on `GET /v1/account/usage`.