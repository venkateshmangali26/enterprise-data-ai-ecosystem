import "./env";
import { handleRequest, API_TOKEN } from "./app";

if (!API_TOKEN) {
  throw new Error("API_TOKEN must be configured before running integration tests.");
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`, detail !== undefined ? detail : "");
    failed++;
  }
}

// Fully decoupled in-process API test helper using web standard Headers API
async function testApi(
  path: string,
  init: RequestInit = {},
  withAuth = true
): Promise<{ res: Response; json: unknown; headers: Headers }> {
  const headers = new Headers(init.headers);

  if (withAuth && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${API_TOKEN}`);
  }

  const req = new Request(`http://localhost:3001${path}`, {
    ...init,
    headers,
  });

  const res = await handleRequest(req);

  let json: unknown = null;

  try {
    json = await res.json();
  } catch {
    // Empty response or non-JSON response
  }

  return {
    res,
    json,
    headers: res.headers,
  };
}

async function runIntegrationTests() {
  console.log("\n=======================================================");
  console.log("   RETAIL ANALYTICS API - FULL INTEGRATION TEST SUITE   ");
  console.log("=======================================================\n");

  try {
    // -------------------------------------------------------------
    // Group 1: Server Core & System Health (Public probe without leaking internals)
    // -------------------------------------------------------------
    const { res: healthRes, json: health } = await testApi("/api/health", {}, false);
    assert(healthRes.status === 200, "1. GET /api/health returns HTTP 200 without authentication");
    assert((health as any)?.status === "healthy", "1. Health check returns healthy status");
    assert((health as any)?.auth_required !== undefined, "1. Health check discloses auth requirement");
    assert((health as any)?.timestamp !== undefined, "1. Health check returns timestamp");

    // -------------------------------------------------------------
    // Group 2: Security & Authentication Enforcement (Constant-time token validation)
    // -------------------------------------------------------------
    // Missing bearer token returns 401
    const { res: missingAuthRes } = await testApi("/api/overview", {}, false);
    assert(missingAuthRes.status === 401, "2. Security: Missing bearer token returns HTTP 401");

    // Invalid bearer token returns 401
    const { res: invalidAuthRes } = await testApi("/api/overview", {
      headers: {
        Authorization: "Bearer invalid-test-token-12345",
      },
    });
    assert(invalidAuthRes.status === 401, "2. Security: Invalid bearer token returns HTTP 401");

    // Unknown API routes without auth require authentication before 404 handler
    const { res: protected404Res } = await testApi("/api/unknown-endpoint-xyz", {}, false);
    assert(protected404Res.status === 401, "2. Security: Unknown API routes require authentication");

    // -------------------------------------------------------------
    // Group 3: Executive Overview KPIs (Authenticated)
    // -------------------------------------------------------------
    const { res: overviewRes, json: overview } = await testApi("/api/overview");
    assert(overviewRes.status === 200, "3. GET /api/overview returns HTTP 200 with valid token");
    assert(typeof (overview as any)?.total_revenue === "number", "3. Overview total_revenue is a valid number");
    assert(typeof (overview as any)?.gross_profit === "number", "3. Overview gross_profit is a valid number");
    assert(typeof (overview as any)?.profit_margin_pct === "number", "3. Overview profit_margin_pct is a valid float");
    assert((overview as any)?.mom_growth_pct === null || typeof (overview as any)?.mom_growth_pct === "number", "3. Overview mom_growth_pct is null or a valid float");
    assert(typeof (overview as any)?.total_orders === "number", "3. Overview total_orders is a valid integer");
    assert(typeof (overview as any)?.average_order_value === "number", "3. Overview average_order_value is a valid number");

    // Filter overview by category
    const { res: catOverviewRes, json: catOverview } = await testApi("/api/overview?category=Electronics+%26+Gadgets");
    assert(catOverviewRes.status === 200, "3. GET /api/overview?category=... returns HTTP 200");
    assert(typeof (catOverview as any)?.total_revenue === "number", "3. Category-filtered total_revenue is valid");

    // -------------------------------------------------------------
    // Group 4: Regional Revenue Trends & Continuous Date Spine
    // -------------------------------------------------------------
    const { res: trendRes, json: trend } = await testApi("/api/revenue-trend");
    assert(trendRes.status === 200, "4. GET /api/revenue-trend returns HTTP 200");
    assert(Array.isArray(trend) && trend.length > 0, "4. Revenue trend returns non-empty calendar spine records");
    assert((trend as any[])[0]?.period !== undefined && (trend as any[])[0]?.month_short !== undefined && (trend as any[])[0]?.monthly_revenue !== undefined, "4. Revenue trend records contain period, month_short, and monthly_revenue");
    assert(typeof (trend as any[])[0]?.monthly_revenue === "number", "4. Revenue trend monthly_revenue is strictly numeric");

    // Filtered by specific region
    const { res: regTrendRes, json: regTrend } = await testApi("/api/revenue-trend?region=South");
    assert(regTrendRes.status === 200, "4. GET /api/revenue-trend?region=South returns HTTP 200");
    assert(Array.isArray(regTrend) && (regTrend as any[]).every((r) => r.region === "South"), "4. Filtered revenue trend returns only records for requested region");

    // -------------------------------------------------------------
    // Group 5: Top Stores Ranking & Limit Bounding
    // -------------------------------------------------------------
    const { res: topRes, json: topStores } = await testApi("/api/stores/top?limit=5");
    assert(topRes.status === 200, "5. GET /api/stores/top?limit=5 returns HTTP 200");
    assert(Array.isArray(topStores) && topStores.length <= 5 && topStores.length > 0, "5. Top stores returns bounded list matching limit");
    assert((topStores as any[])[0]?.square_footage !== undefined && (topStores as any[])[0]?.total_cost !== undefined && (topStores as any[])[0]?.primary_rank === 1, "5. Ranked store includes square_footage, total_cost, and primary_rank=1");

    // Malformed limit parameter falls back safely
    const { res: invalidLimitRes, json: fallbackStores } = await testApi("/api/stores/top?limit=invalid_param");
    assert(invalidLimitRes.status === 200, "5. GET /api/stores/top?limit=invalid handles non-numeric string gracefully");
    assert(Array.isArray(fallbackStores) && fallbackStores.length <= 10, "5. Malformed limit falls back safely to default limit of 10");

    // -------------------------------------------------------------
    // Group 6: Customer Segments RFM
    // -------------------------------------------------------------
    const { res: segRes, json: segments } = await testApi("/api/customer-segments");
    assert(segRes.status === 200, "6. GET /api/customer-segments returns HTTP 200");
    assert(Array.isArray(segments) && segments.length > 0, "6. Customer segments returns segment analysis list");

    // -------------------------------------------------------------
    // Group 7: Category Financial Breakdown & Parameterized Filtering
    // -------------------------------------------------------------
    const { res: catRes, json: categories } = await testApi("/api/categories");
    assert(catRes.status === 200, "7. GET /api/categories returns HTTP 200");
    assert(Array.isArray(categories) && categories.length > 0, "7. Categories returns list of product categories");
    assert((categories as any[])[0]?.total_revenue !== undefined && (categories as any[])[0]?.profit_margin_pct !== undefined, "7. Category financial records contain revenue and margin metrics");

    // Category filtering on /api/categories
    const { res: filteredCatRes, json: filteredCategories } = await testApi("/api/categories?category=Electronics+%26+Gadgets");
    assert(filteredCatRes.status === 200, "7. GET /api/categories?category=... returns HTTP 200");
    assert(
      Array.isArray(filteredCategories) &&
      filteredCategories.length > 0 &&
      (filteredCategories as any[]).every((c) => c.category === "Electronics & Gadgets"),
      "7. Filtered categories returns strictly matched category items"
    );

    // -------------------------------------------------------------
    // Group 8: Store Filters
    // -------------------------------------------------------------
    const { res: storeRes, json: stores } = await testApi("/api/stores");
    assert(storeRes.status === 200, "8. GET /api/stores returns HTTP 200");
    assert(Array.isArray(stores) && stores.length > 0, "8. Stores list returns all retail locations");
    const sampleStoreId = (stores as any[])[0]?.store_id || "STR-001";

    // -------------------------------------------------------------
    // Group 9: Transactions Explorer & Rigorous Pagination Validation
    // -------------------------------------------------------------
    const { res: txRes, json: txData } = await testApi("/api/transactions?page=1&limit=15");
    assert(txRes.status === 200, "9. GET /api/transactions returns HTTP 200");
    assert(Array.isArray((txData as any)?.items) && (txData as any).items.length > 0 && (txData as any).items.length <= 15, "9. Transactions pagination returns bounded items");
    assert(typeof (txData as any)?.total === "number" && (txData as any).total > 0, "9. Transactions response includes total record count");

    // Reject non-numeric page string
    const { res: textPageRes } = await testApi("/api/transactions?page=abc");
    assert(textPageRes.status === 400, "10. Validation: Non-numeric page '?page=abc' returns HTTP 400 Bad Request");

    // Reject fractional page number
    const { res: floatPageRes } = await testApi("/api/transactions?page=1.5");
    assert(floatPageRes.status === 400, "10. Validation: Fractional page '?page=1.5' returns HTTP 400 Bad Request");

    // Reject negative page number
    const { res: negativePageRes } = await testApi("/api/transactions?page=-5");
    assert(negativePageRes.status === 400, "10. Validation: Negative page '?page=-5' returns HTTP 400 Bad Request");

    // Reject invalid limit parameter
    const { res: badLimitRes } = await testApi("/api/transactions?limit=invalid");
    assert(badLimitRes.status === 400, "10. Validation: Malformed limit '?limit=invalid' returns HTTP 400 Bad Request");

    // Safe excessive limit is clamped to 100
    const { res: bigLimitRes, json: bigLimitData } = await testApi("/api/transactions?limit=999");
    assert(bigLimitRes.status === 200, "10. Validation: Limit > 100 is clamped to 100 with HTTP 200");
    assert((bigLimitData as any)?.limit === 100, "10. Limit clamped to 100");

    // Large safe page beyond range returns empty items array
    const { res: hugePageRes, json: hugePageData } = await testApi("/api/transactions?page=999999999&limit=15");
    assert(hugePageRes.status === 200, "11. Large safe page number handled without SQLite integer overflow");
    assert(Array.isArray((hugePageData as any)?.items) && (hugePageData as any).items.length === 0, "11. Page beyond total range returns empty items array safely");

    // Unsafe integer page (> MAX_SAFE_INTEGER) returns 400 Bad Request
    const { res: unsafePageRes } = await testApi("/api/transactions?page=9007199254740992&limit=15");
    assert(unsafePageRes.status === 400, "11. Unsafe pagination value (> MAX_SAFE_INTEGER) returns HTTP 400 Bad Request");

    // Dedicated storeId filter on transactions
    const { res: storeTxRes, json: storeTxData } = await testApi(`/api/transactions?storeId=${sampleStoreId}`);
    assert(storeTxRes.status === 200, `12. GET /api/transactions?storeId=${sampleStoreId} returns HTTP 200`);
    assert(
      Array.isArray((storeTxData as any)?.items) &&
      (storeTxData as any).items.length > 0 &&
      (storeTxData as any).items.every((t: any) => t.store_id === sampleStoreId),
      "12. StoreId filtering returns only records matching storeId"
    );

    // Search query matches store ID as well
    const { res: searchStoreRes, json: searchStoreData } = await testApi(`/api/transactions?search=${sampleStoreId}`);
    assert(searchStoreRes.status === 200, "12. Search query with store ID returns HTTP 200");
    assert(Array.isArray((searchStoreData as any)?.items) && (searchStoreData as any).items.length > 0, "12. Search matches store records");

    // -------------------------------------------------------------
    // Group 10: Single Transaction Detail & PII Masking
    // -------------------------------------------------------------
    const sampleTxId = (txData as any)?.items?.[0]?.transaction_id;

    if (sampleTxId) {
      const { res: singleTxRes, json: singleTx } = await testApi(
        `/api/transactions/${encodeURIComponent(String(sampleTxId))}`
      );

      assert(singleTxRes.status === 200, "13. Transaction detail returns HTTP 200");
      assert(
        typeof (singleTx as any)?.email === "string" && (singleTx as any).email.includes("***@"),
        "13. Customer email is masked (e.g. 'j***e@...')"
      );
      assert((singleTx as any)?.transaction_id === sampleTxId, "13. Returned transaction matches requested ID");
    } else {
      assert(false, "13. Transaction detail test requires a sample transaction");
    }

    // Unknown transaction ID returns 404
    const { res: unknownTxRes } = await testApi("/api/transactions/NON_EXISTENT_TX_ID_9999");
    assert(unknownTxRes.status === 404, "14. Unknown transaction ID returns HTTP 404");

    // Malformed encoded transaction ID returns 400 Bad Request
    const { res: malformedIdRes } = await testApi("/api/transactions/%E0%A4%A");
    assert(malformedIdRes.status === 400, "14. Malformed percent-encoded transaction ID returns HTTP 400 Bad Request");

    // -------------------------------------------------------------
    // Group 11: Security, CORS Origin Validation, Realistic Preflight, & HTTP Method Guard
    // -------------------------------------------------------------
    // Authorized origin CORS reflection
    const allowedOrigin = "http://localhost:5173";
    const { res: corsRes } = await testApi("/api/overview", {
      headers: {
        Origin: allowedOrigin,
      },
    });
    assert(
      corsRes.headers.get("Access-Control-Allow-Origin") === allowedOrigin,
      "15. CORS header reflects authorized origin"
    );

    // Unauthorized origin does NOT receive Access-Control-Allow-Origin header
    const unauthorizedOrigin = "http://unauthorized-malicious-site.com";
    const { res: unauthCorsRes } = await testApi("/api/overview", {
      headers: {
        Origin: unauthorizedOrigin,
      },
    });
    assert(
      unauthCorsRes.headers.get("Access-Control-Allow-Origin") === null,
      "15. Unauthorized CORS origin receives no Access-Control-Allow-Origin header"
    );

    // Realistic browser preflight request with Origin and Request headers
    const { res: preflightRes } = await testApi("/api/overview", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });
    assert(preflightRes.status === 204, "16. OPTIONS preflight request returns HTTP 204 No Content");
    assert(preflightRes.headers.get("Access-Control-Allow-Methods") === "GET, OPTIONS", "16. OPTIONS preflight matches allowed methods GET, OPTIONS");
    assert(
      preflightRes.headers.get("Access-Control-Allow-Origin") === "http://localhost:5173",
      "16. Preflight permits configured frontend origin"
    );

    // Method Guard: Reject POST on read endpoint
    const { res: methodRes, json: methodJson } = await testApi("/api/overview", { method: "POST" });
    assert(methodRes.status === 405, "17. POST on /api/overview rejected with HTTP 405 Method Not Allowed");
    assert((methodJson as any)?.error === "Method Not Allowed", "17. Error message correctly specifies Method Not Allowed");

    // Unknown API endpoint 404 guard (authenticated)
    const { res: notFoundRes, json: notFoundJson } = await testApi("/api/unknown-endpoint-xyz");
    assert(notFoundRes.status === 404, "18. Unknown API route returns HTTP 404 when authenticated");
    assert((notFoundJson as any)?.error === "API Endpoint Not Found", "18. Correct 404 error message returned for unknown route");

  } catch (error) {
    console.error("Fatal test runner error:", error);
    failed++;
  }

  console.log("\n=======================================================");
  console.log(`  INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED  `);
  console.log("=======================================================");

  process.exitCode = failed > 0 ? 1 : 0;
}

await runIntegrationTests();
