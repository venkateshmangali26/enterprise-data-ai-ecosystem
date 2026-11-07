import { handleRequest, API_TOKEN } from "./app";

async function runIntegrationTests() {
  console.log("\n=======================================================");
  console.log("   RETAIL ANALYTICS API - FULL INTEGRATION TEST SUITE   ");
  console.log("=======================================================\n");

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

  // Helper to send mock HTTP requests directly to the handler in-process
  // Zero network sockets, zero port conflicts, zero Bun.serve dependencies
  async function testApi(
    path: string,
    init: RequestInit = {}
  ): Promise<{ res: Response; json: any; headers: Headers }> {
    const defaultHeaders: Record<string, string> = {
      Authorization: `Bearer ${API_TOKEN}`,
    };
    const mergedHeaders = { ...defaultHeaders, ...(init.headers as Record<string, string> || {}) };
    const req = new Request(`http://localhost:3001${path}`, {
      ...init,
      headers: mergedHeaders,
    });
    const res = await handleRequest(req);
    let json = null;
    try {
      json = await res.json();
    } catch {
      // not json or empty body
    }
    return { res, json, headers: res.headers };
  }

  try {
    // -------------------------------------------------------------
    // Group 1: Server Core & System Health
    // -------------------------------------------------------------
    const { res: healthRes, json: health } = await testApi("/api/health");
    assert(healthRes.status === 200, "1. GET /api/health returns HTTP 200");
    assert(health?.status === "healthy", "1. Health check returns healthy status");
    assert(typeof health?.counts?.transactions === "number" && health.counts.transactions > 0, "1. Database contains transactional records");

    // -------------------------------------------------------------
    // Group 2: Executive Overview KPIs
    // -------------------------------------------------------------
    const { res: overviewRes, json: overview } = await testApi("/api/overview");
    assert(overviewRes.status === 200, "2. GET /api/overview returns HTTP 200");
    assert(typeof overview?.total_revenue === "number" && overview.total_revenue > 0, "2. Overview total_revenue is a valid positive number");
    assert(typeof overview?.gross_profit === "number" && overview.gross_profit > 0, "2. Overview gross_profit is a valid positive number");
    assert(typeof overview?.profit_margin_pct === "number" && overview.profit_margin_pct >= 0, "2. Overview profit_margin_pct is a valid non-negative number");
    assert(overview?.mom_growth_pct === null || typeof overview?.mom_growth_pct === "number", "2. Overview mom_growth_pct is null or a valid float");
    assert(typeof overview?.total_orders === "number" && overview.total_orders > 0, "2. Overview total_orders is a valid integer");
    assert(typeof overview?.average_order_value === "number" && overview.average_order_value > 0, "2. Overview average_order_value is a valid number");

    // -------------------------------------------------------------
    // Group 3: Regional Revenue Trends & Continuous Date Spine
    // -------------------------------------------------------------
    const { res: trendRes, json: trend } = await testApi("/api/revenue-trend");
    assert(trendRes.status === 200, "3. GET /api/revenue-trend returns HTTP 200");
    assert(Array.isArray(trend) && trend.length >= 36, "3. Revenue trend returns complete calendar spine records");
    assert(trend[0]?.period !== undefined && trend[0]?.month_short !== undefined && trend[0]?.monthly_revenue !== undefined, "3. Revenue trend records contain period, month_short, and monthly_revenue");
    assert(typeof trend[0]?.monthly_revenue === "number", "3. Revenue trend monthly_revenue is strictly numeric");

    // Filtered by specific region
    const { res: regTrendRes, json: regTrend } = await testApi("/api/revenue-trend?region=South");
    assert(regTrendRes.status === 200, "3. GET /api/revenue-trend?region=South returns HTTP 200");
    assert(Array.isArray(regTrend) && regTrend.every((r: any) => r.region === "South"), "3. Filtered revenue trend returns only records for requested region");

    // -------------------------------------------------------------
    // Group 4: Top Stores Ranking & Limit Bounding
    // -------------------------------------------------------------
    const { res: topRes, json: topStores } = await testApi("/api/stores/top?limit=5");
    assert(topRes.status === 200, "4. GET /api/stores/top?limit=5 returns HTTP 200");
    assert(Array.isArray(topStores) && topStores.length === 5, "4. Top stores returns exactly 5 items when limit=5");
    assert(topStores[0]?.square_footage !== undefined && topStores[0]?.total_cost !== undefined && topStores[0]?.primary_rank === 1, "4. Ranked store includes square_footage, total_cost, and primary_rank=1");

    // Malformed limit parameter handling
    const { res: invalidLimitRes, json: fallbackStores } = await testApi("/api/stores/top?limit=invalid_param");
    assert(invalidLimitRes.status === 200, "5. GET /api/stores/top?limit=invalid handles non-numeric string gracefully");
    assert(Array.isArray(fallbackStores) && fallbackStores.length === 10, "5. Malformed limit falls back safely to default limit of 10");

    // -------------------------------------------------------------
    // Group 5: Customer Segments RFM
    // -------------------------------------------------------------
    const { res: segRes, json: segments } = await testApi("/api/customer-segments");
    assert(segRes.status === 200, "6. GET /api/customer-segments returns HTTP 200");
    assert(Array.isArray(segments) && segments.length > 0, "6. Customer segments returns segment analysis list");
    const segNames = segments.map((s: any) => s.rfm_segment);
    assert(segNames.includes("Champions") || segNames.includes("Loyal Customers"), "6. RFM segmentation categorizes high-value customer profiles");

    // -------------------------------------------------------------
    // Group 6: Category Financial Breakdown
    // -------------------------------------------------------------
    const { res: catRes, json: categories } = await testApi("/api/categories");
    assert(catRes.status === 200, "7. GET /api/categories returns HTTP 200");
    assert(Array.isArray(categories) && categories.length > 0, "7. Categories returns list of product categories");
    assert(categories[0]?.total_revenue !== undefined && categories[0]?.profit_margin_pct !== undefined, "7. Category financial records contain revenue and margin metrics");

    // -------------------------------------------------------------
    // Group 7: Store Filters
    // -------------------------------------------------------------
    const { res: storeRes, json: stores } = await testApi("/api/stores");
    assert(storeRes.status === 200, "8. GET /api/stores returns HTTP 200");
    assert(Array.isArray(stores) && stores.length > 0, "8. Stores list returns all retail locations");

    // -------------------------------------------------------------
    // Group 8: Transactions Explorer & Pagination Hardening
    // -------------------------------------------------------------
    const { res: txRes, json: txData } = await testApi("/api/transactions?page=1&limit=15");
    assert(txRes.status === 200, "9. GET /api/transactions returns HTTP 200");
    assert(Array.isArray(txData?.items) && txData.items.length === 15, "9. Transactions pagination returns requested page size of 15");
    assert(typeof txData?.total === "number" && txData.total > 0, "9. Transactions response includes total record count");

    // Safe negative page and excess limit clamping
    const { res: badPageRes, json: badPageData } = await testApi("/api/transactions?page=-5&limit=999");
    assert(badPageRes.status === 200, "10. Malformed pagination returns HTTP 200");
    assert(badPageData?.page === 1 && badPageData?.limit === 100, "10. Negative page is clamped to 1, limit > 100 is clamped to 100");

    // Extremely large page number overflow protection
    const { res: hugePageRes, json: hugePageData } = await testApi("/api/transactions?page=999999999&limit=15");
    assert(hugePageRes.status === 200, "11. Ultra-large page number handled without SQLite integer overflow");
    assert(Array.isArray(hugePageData?.items) && hugePageData.items.length === 0, "11. Page beyond total range returns empty items array safely");

    // Excessively long search string protection
    const longSearchString = "A".repeat(500);
    const { res: longSearchRes, json: longSearchData } = await testApi(`/api/transactions?search=${longSearchString}`);
    assert(longSearchRes.status === 200, "12. 500-character search parameter safely truncated without SQL error");
    assert(Array.isArray(longSearchData?.items), "12. Truncated search executes safely");

    // -------------------------------------------------------------
    // Group 9: Single Transaction Detail & PII Masking
    // -------------------------------------------------------------
    const sampleTxId = txData.items[0]?.transaction_id;
    const { res: singleTxRes, json: singleTx } = await testApi(`/api/transactions/${sampleTxId}`);
    assert(singleTxRes.status === 200, "13. GET /api/transactions/:id returns HTTP 200");
    assert(typeof singleTx?.email === "string" && singleTx.email.includes("***@"), "13. Sensitive customer email is masked (e.g. 'j***e@...')");
    assert(singleTx?.transaction_id === sampleTxId, "13. Retrieved transaction matches requested transaction ID");

    // Unknown transaction ID returns 404
    const { res: unknownTxRes } = await testApi("/api/transactions/NON_EXISTENT_TX_ID_9999");
    assert(unknownTxRes.status === 404, "14. Unknown transaction ID returns HTTP 404");

    // -------------------------------------------------------------
    // Group 10: Security, CORS, Preflight, & HTTP Method Guard
    // -------------------------------------------------------------
    // Authorized origin CORS reflection
    const originHeader = { headers: { Origin: "http://localhost:5173" } };
    const { res: corsRes } = await testApi("/api/overview", originHeader);
    assert(corsRes.headers.get("Access-Control-Allow-Origin") === "http://localhost:5173", "15. CORS header reflects authorized origin (http://localhost:5173)");

    // OPTIONS preflight check
    const { res: preflightRes } = await testApi("/api/overview", { method: "OPTIONS" });
    assert(preflightRes.status === 204, "16. OPTIONS preflight request returns HTTP 204 No Content");
    assert(preflightRes.headers.get("Access-Control-Allow-Methods")?.includes("GET"), "16. OPTIONS preflight includes Allowed Methods header");

    // Method Guard: Reject POST on read endpoint
    const { res: methodRes, json: methodJson } = await testApi("/api/overview", { method: "POST" });
    assert(methodRes.status === 405, "17. POST on /api/overview rejected with HTTP 405 Method Not Allowed");
    assert(methodJson?.error === "Method Not Allowed", "17. Error message correctly specifies Method Not Allowed");

    // Unknown API endpoint 404 guard
    const { res: notFoundRes, json: notFoundJson } = await testApi("/api/unknown-endpoint-xyz");
    assert(notFoundRes.status === 404, "18. Unknown API route returns HTTP 404");
    assert(notFoundJson?.error === "API Endpoint Not Found", "18. Correct 404 error message returned for unknown route");

  } catch (error) {
    console.error("Fatal test runner error:", error);
    failed++;
  }

  console.log("\n=======================================================");
  console.log(`  INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED  `);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationTests();
