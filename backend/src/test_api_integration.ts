import { handleRequest } from "./server";

async function runIntegrationTests() {
  console.log("\n=======================================================");
  console.log("   RETAIL ANALYTICS API - FULL INTEGRATION TEST SUITE   ");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`, detail !== undefined ? detail : "");
      failed++;
    }
  }

  // Helper to send mock HTTP requests directly to the handler
  async function testApi(path: string, init: RequestInit = {}): Promise<{ res: Response; json: any }> {
    const req = new Request(`http://localhost:3001${path}`, init);
    const res = await handleRequest(req);
    let json = null;
    try {
      json = await res.json();
    } catch {
      // not json
    }
    return { res, json };
  }

  try {
    // 1. Health check
    const { res: healthRes, json: health } = await testApi("/api/health");
    assert(healthRes.status === 200, "1. GET /api/health returns HTTP 200");
    assert(health?.status === "healthy" && health.counts.transactions === 150000, "1. Health check verifies 150,000 transactions");

    // 2. Executive Overview
    const { res: overviewRes, json: overview } = await testApi("/api/overview");
    assert(overviewRes.status === 200, "2. GET /api/overview returns HTTP 200");
    assert(overview?.total_revenue > 0 && overview?.gross_profit > 0, "2. Overview total_revenue and gross_profit are positive numbers");
    assert(typeof overview?.profit_margin_pct === "number" && overview.profit_margin_pct > 0, "2. Overview profit_margin_pct is a valid percentage");
    assert(overview?.mom_growth_pct === null || typeof overview?.mom_growth_pct === "number", "2. Overview mom_growth_pct is null or valid number");
    assert(overview?.total_orders === 108000, "2. Total orders matches known store volume (108,000)");

    // 3. Revenue Trend (Continuous regional spine)
    const { res: trendRes, json: trend } = await testApi("/api/revenue-trend");
    assert(trendRes.status === 200, "3. GET /api/revenue-trend returns HTTP 200");
    assert(Array.isArray(trend) && trend.length === 180, "3. Revenue trend returns complete 180-month continuous regional spine");
    const sampleTrend = trend[0];
    assert(Boolean(sampleTrend.period && sampleTrend.month_short && sampleTrend.monthly_revenue), "3. Revenue trend contains period, month_short, and monthly_revenue");

    // 4. Stores Top with Limit
    const { res: top5Res, json: top5 } = await testApi("/api/stores/top?limit=5");
    assert(top5Res.status === 200, "4. GET /api/stores/top?limit=5 returns HTTP 200");
    assert(top5.length === 5, "4. Top stores returns exactly 5 items when limit=5");
    assert(top5[0].primary_rank === 1 && top5[0].square_footage > 0 && top5[0].total_cost > 0, "4. Ranked store includes square_footage, total_cost, and primary_rank");

    // 5. Stores Top with Malformed Limit (NaN fallback)
    const { res: nanLimitRes, json: nanLimit } = await testApi("/api/stores/top?limit=invalid_string");
    assert(nanLimitRes.status === 200, "5. GET /api/stores/top?limit=invalid handles non-numeric string gracefully");
    assert(nanLimit.length === 10, "5. Malformed limit falls back to default limit of 10");

    // 6. Customer Segments (RFM)
    const { res: rfmRes, json: rfm } = await testApi("/api/customer-segments");
    assert(rfmRes.status === 200, "6. GET /api/customer-segments returns HTTP 200");
    const segments = rfm.map((s: any) => s.rfm_segment);
    assert(segments.includes("Cannot Lose Them"), "6. RFM segmentation correctly populates 'Cannot Lose Them'");
    assert(segments.includes("Recent Customers"), "6. RFM segmentation correctly populates 'Recent Customers'");
    assert(segments.includes("Champions"), "6. RFM segmentation correctly populates 'Champions'");

    // 7. Categories
    const { res: catRes, json: cat } = await testApi("/api/categories");
    assert(catRes.status === 200, "7. GET /api/categories returns HTTP 200");
    assert(Array.isArray(cat) && cat.length > 0, "7. Categories returns list of product categories");
    assert(cat[0].units_sold !== undefined && cat[0].order_count !== undefined, "7. Categories contains units_sold and order_count aliases");

    // 8. Stores Filter Options
    const { res: storeListRes, json: storeList } = await testApi("/api/stores");
    assert(storeListRes.status === 200, "8. GET /api/stores returns HTTP 200");
    assert(Array.isArray(storeList) && storeList.length > 0, "8. Stores list returns all retail locations");

    // 9. Transactions pagination and search
    const { res: txRes, json: tx } = await testApi("/api/transactions?page=1&limit=15");
    assert(txRes.status === 200, "9. GET /api/transactions returns HTTP 200");
    assert(tx.items.length === 15 && tx.total === 150000, "9. Transactions pagination returns 15 items out of 150,000 total");

    // 10. Malformed Pagination parameters
    const { res: clampRes, json: clampTx } = await testApi("/api/transactions?page=-10&limit=9999");
    assert(clampRes.status === 200, "10. Malformed pagination returns HTTP 200");
    assert(clampTx.page === 1 && clampTx.limit === 100, "10. Negative page is clamped to 1, limit > 100 is clamped to 100");

    // 11. CORS Origin Reflection
    const { res: corsRes } = await testApi("/api/overview", {
      headers: { Origin: "http://localhost:5173" },
    });
    assert(
      corsRes.headers.get("Access-Control-Allow-Origin") === "http://localhost:5173",
      "11. CORS header reflects authorized origin (http://localhost:5173)"
    );

    // 12. HTTP Method Guard (Reject POST on read endpoint)
    const { res: methodRes, json: methodErr } = await testApi("/api/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ malicious: true }),
    });
    assert(methodRes.status === 405, "12. POST on /api/overview rejected with HTTP 405 Method Not Allowed");
    assert(methodErr.error === "Method Not Allowed", "12. Error message correctly specifies Method Not Allowed");

    // 13. Customer Privacy Masking in Transaction Details
    const firstTxId = tx.items[0].transaction_id;
    const { res: detailRes, json: detail } = await testApi(`/api/transactions/${firstTxId}`);
    assert(detailRes.status === 200, "13. GET /api/transactions/:id returns HTTP 200");
    assert(Boolean(detail.email && detail.email.includes("***@")), "13. Sensitive customer email is masked (contains '***@')");

  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  }

  console.log(`\n=======================================================`);
  console.log(`  INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED  `);
  console.log(`=======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runIntegrationTests();
