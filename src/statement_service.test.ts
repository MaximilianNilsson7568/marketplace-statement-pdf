import assert from "node:assert/strict";
import { chooseStatement } from "./statement_service.js";

const valid = { sellerId: "shop-7", buyerEmail: "buyer@example.com", orderId: "order-9", period: "month" };
assert.deepEqual(chooseStatement(valid), valid);
assert.throws(() => chooseStatement({ ...valid, buyerEmail: "not-an-email" }));
console.log("statement boundary test passed");
