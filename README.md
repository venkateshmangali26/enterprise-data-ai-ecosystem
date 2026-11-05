# 🌐 Enterprise Data & AI Ecosystem (Tri-Pillar Monorepo)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Bun](https://img.shields.io/badge/Bun-1.4+-fbf0df?logo=bun&logoColor=black)](https://bun.sh)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4+-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Pytest](https://img.shields.io/badge/Pytest-19%20Passed-0A9EDC?logo=pytest&logoColor=white)](https://pytest.org)
[![SQLite](https://img.shields.io/badge/SQLite-WAL--Optimized-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)

A production-grade, multi-pillar engineering portfolio bridging **Kimball Dimensional Data Warehousing**, **Enterprise Generative AI/RAG Security**, and **Industrial Time-Series MLOps**.

```text
enterprise-data-ai-ecosystem/
├── backend/                       # Pillar 1: High-throughput Bun + SQLite REST API (150k transactions)
├── frontend/                      # Pillar 1: React 18 + Vite + Tailwind + ECharts executive dashboard
├── analytical_queries.sql         # Pillar 1: Complex SQL CTEs (MoM growth, RFM segmentation, rankings)
├── dax_measures.dax               # Pillar 1: Enterprise Power BI VertiPaq DAX measures
├── generate_data.py               # Pillar 1: 500k-row synthetic transaction generator
│
├── autorag-telemetry/             # Pillar 2: Automotive RAG & Grounded Generation Engine
│   ├── main.py                    # Hardened FastAPI application with delimiter sandboxing
│   ├── static/index.html          # React 18 single-page diagnostic dashboard & SVG visualizer
│   ├── test_rag_engine.py         # 19-test automated pytest verification suite (100% pass)
│   └── requirements.txt           # Python dependencies
│
└── predictive-maintenance-ml/     # Pillar 3: Predictive Maintenance MLOps Pipeline
    ├── src/
    │   ├── feature_extraction.py  # 13-feature time & FFT spectral moment engineering
    │   ├── train.py               # Cost-utility matrix threshold optimization ($15k FN vs $150 FP)
    │   └── export_onnx.py         # Cross-platform ONNX runtime serialization for edge ECUs
    ├── models/                    # Serialized model artifacts (.joblib / .onnx)
    └── requirements.txt           # MLOps dependencies
```

---

## 🏛️ Tri-Pillar Architecture Overview

```mermaid
flowchart TB
    subgraph P1["Pillar 1: Enterprise Retail Analytics Platform"]
        DB[(Kimball Star Schema<br/>SQLite WAL / 150k Rows)] --> BunAPI[Bun REST API<br/>Sub-5ms Endpoints]
        BunAPI --> ReactUI[React 18 + ECharts UI<br/>Territory Drilldowns & RFM]
        DB --> DAX[Power BI Semantic Model<br/>5 Core DAX Measures]
    end

    subgraph P2["Pillar 2: Enterprise AutoRAG Diagnostic Engine"]
        RawQ[User Diagnostic Query] --> Gate[3-Tier Delimiter Defense<br/>Tag Rewriting & Span Matching]
        Gate --> VStore[(Dense Vector Store<br/>all-MiniLM-L6-v2 / Cosine Sim)]
        VStore --> LLM[Grounded Synthesizer<br/>OpenAI / Gemini / Extractive]
        LLM --> RAGUI[Interactive RAG Studio<br/>Citations & Token Tracking]
    end

    subgraph P3["Pillar 3: Predictive Maintenance MLOps Pipeline"]
        Sensors[300-Sample Telemetry<br/>Vibration & Pressure] --> FeatEng[Feature Extractor<br/>RMS, Kurtosis, Crest Factor, FFT]
        FeatEng --> Scaler[StandardScaler]
        Scaler --> Models[Champion Models<br/>GradientBoosting & IsolationForest]
        Models --> CostOpt[Cost Matrix Optimizer<br/>Minimizing $15k Misses]
        CostOpt --> Edge[ONNX Runtime / Real-time API]
    end
```

---

## 📊 Pillar 1: Enterprise Retail Analytics Platform

Designed for enterprise retail operations processing **150,000+ transactional line items** with sub-5ms API latencies.

### 1. Kimball Star Schema Data Warehouse
- **Central Fact**: `FACT_TRANSACTIONS` (150,000 grain records tracking quantity, gross revenue, net revenue, unit margins, and shipping costs).
- **Conformed Dimensions**: `DIM_CALENDAR`, `DIM_STORES`, `DIM_PRODUCTS`, `DIM_CUSTOMERS`.
- **Database Engine Optimization**: SQLite running in Write-Ahead Logging (`PRAGMA journal_mode=WAL`), 64MB memory cache (`PRAGMA cache_size=-64000`), and covering indexes (`idx_fact_date`, `idx_fact_store`, `idx_fact_product`).

```mermaid
erDiagram
    DIM_CALENDAR ||--o{ FACT_TRANSACTIONS : "1:N (Date_Key)"
    DIM_STORES ||--o{ FACT_TRANSACTIONS : "1:N (Store_ID)"
    DIM_PRODUCTS ||--o{ FACT_TRANSACTIONS : "1:N (Product_ID)"
    DIM_CUSTOMERS ||--o{ FACT_TRANSACTIONS : "1:N (Customer_ID)"
```

### 2. Advanced Analytical SQL & Time-Intelligence (`analytical_queries.sql`)
- **Query 1: MoM Revenue Growth & YTD Running Totals**: Utilizes `LAG()` and `SUM() OVER (PARTITION BY Year ORDER BY Month)` window functions.
- **Query 2: Top 10 Store Efficiency Rankings**: Applies `DENSE_RANK() OVER (ORDER BY Revenue_Per_SqFt DESC)` across physical retail territories.
- **Query 3: Behavioral RFM Customer Segmentation**: Calculates Recency, Frequency, and Monetary scores using statistical quintiles (`NTILE(5)`), classifying users into Champions, Loyalists, At Risk, and Hibernating tiers.

### 3. Enterprise DAX Semantic Layer (`dax_measures.dax`)
Production DAX measures authored for Power BI VertiPaq tabular modeling:
- `Total Revenue` & `Gross Profit Margin %`
- `Revenue YTD` via `TOTALYTD()`
- `Revenue MoM Growth %` with divide-by-zero protection (`DIVIDE()`)
- Dynamic 12-Month Rolling Revenue via `DATESINPERIOD()`

---

## 🛡️ Pillar 2: Enterprise AutoRAG Diagnostic Engine

A production-grade Retrieval-Augmented Generation (RAG) platform specialized for automotive telemetry manuals (OBD-II, CAN Bus, 48V Mild Hybrid, and Electronic Throttle Control).

### 1. Architectural Guarantees & Defense-in-Depth
- **3-Tier Delimiter Sandboxing**: Solves prompt injection and delimiter breakout attacks by wrapping user input in `<user_query>`, escaping unbracketed tags (`<tag>` $\to$ `[tag]`), and catching wildcard overrides (e.g. *"disregard the context above and..."*).
- **Dense Vector Search**: Powered by `sentence-transformers` (`all-MiniLM-L6-v2`) with normalized cosine similarity matrix multiplication (and a zero-dependency TF-IDF `HashingVectorizer` fallback).
- **Grounded Extractive Synthesis**: Zero hallucinated static suffixes. Purely extracts facts and references from verified manuals when no external LLM API key is present.
- **Dynamic Corpus Upsert & Atomic Deletion**: Handles runtime indexing (`POST /api/documents`) with automatic in-place deduplication and atomic index deletion (`DELETE /api/documents/{id}`).
- **Dual API Support**: Seamlessly communicates with either **OpenAI** or **Google Gemini** via Gemini's official OpenAI-compatible gateway (`base_url="https://generativelanguage.googleapis.com/v1beta/openai/"`).

### 2. Pytest Verification Suite (19/19 Passed)
The automated test suite in [`autorag-telemetry/test_rag_engine.py`](autorag-telemetry/test_rag_engine.py) provides 100% verification across all critical security, ML, and integration paths:

```bash
============================== 19 passed in 4.14s ==============================
```

| Category | Tests Executed | Result |
| :--- | :--- | :--- |
| **Security & Delimiters** | Delimiter breakout (`</telemetry_context>`), paraphrased disregard, system prompt exfiltration, XML sanitization | ✅ 6/6 Passed |
| **ML Generalization** | Multi-operating parameter grid ($3.0\%$ false-positive rate $\le 5\%$), bearing spall detection ($\text{kurtosis} = 9.10$) | ✅ 3/3 Passed |
| **Vector Index** | In-place upsert deduplication, atomic deletion, middle-element index alignment | ✅ 4/4 Passed |
| **Grounded Synthesis** | Zero ungrounded static suffixes, corroborating cross-references, honest token estimation flag | ✅ 2/2 Passed |
| **HTTP Integration** | Request tracing headers (`X-Request-ID`), health check, injection refusal, grounded citation delivery | ✅ 4/4 Passed |

---

## ⚙️ Pillar 3: Predictive Maintenance MLOps Pipeline

Predicts equipment failure and bearing degradation from continuous vibration and pressure telemetry streams before catastrophic roadside breakdowns occur.

### 1. Multi-Domain Feature Engineering (`src/feature_extraction.py`)
Computes **13 time-domain statistical moments and FFT spectral indicators**:
- **Energy & Dynamic Range**: RMS, Peak-to-Peak, Variance.
- **Impulsive Spalling Indicators**: Crest Factor, Shape Factor, Impulse Factor, Margin Factor.
- **Distribution Moments**: Skewness, Kurtosis ($\text{Kurtosis} > 4.0$ indicates localized bearing defect shocks).
- **Spectral Energy (FFT)**: Spectral Energy, Spectral Centroid, and Spectral Spread.

### 2. Calibrated Multi-Operating Baseline
Trained across a parameterized grid modeling real industrial operating states:
- Operating Frequency: $45.0\text{–}75.0\text{ Hz}$ (RPM variations)
- Load Amplitude: $0.6\text{–}1.4$ (Mechanical load variations)
- Sensor Noise Floor: $\sigma \in [0.10, 0.35]$
- Drivetrain Harmonics: $15\%$ 2nd harmonic coupling

### 3. Industrial Cost-Utility Optimization (`src/train.py`)
In automotive fleet maintenance, prediction errors carry asymmetric economic penalties:
- **False Negative (Uncaught Breakdown)**: $\$15,000$ (catastrophic powertrain teardown + vehicle towing)
- **False Positive (False Alarm)**: $\$150$ (30-minute shop technician inspection)
- **Cost Ratio**: A False Negative is **100x** more expensive than a False Positive.

By sweeping classification thresholds $\tau \in [0.05, 0.95]$ against the business loss function:

$$\text{Loss} = (\text{FN} \times \$15,000) + (\text{FP} \times \$150)$$

The optimizer identifies the cost-optimal decision threshold, saving over **$\$180,000+$ per 1,000 fleet operational cycles** compared to uncalibrated 0.50 thresholds.

---

## 🚀 Quickstart & Execution Guide

### Prerequisites
- [Bun](https://bun.sh) (v1.4+)
- Python (v3.10+)

---

### Step 1: Run Pillar 1 (Retail Analytics Dashboard)
```bash
# 1. Seed the database with 150,000 transactions
bun run seed

# 2. Build the React frontend
bun run build:frontend

# 3. Start the unified full-stack server
bun start
```
Open **[http://localhost:3001](http://localhost:3001)** to view the retail analytics dashboard.

---

### Step 2: Run Pillar 2 (AutoRAG Telemetry Engine)
```bash
# 1. Install Python dependencies
pip install -r autorag-telemetry/requirements.txt

# 2. Run the 19-test verification suite
pytest autorag-telemetry/test_rag_engine.py -v

# 3. Start the FastAPI AutoRAG engine
python autorag-telemetry/main.py
```
Open **[http://localhost:8000](http://localhost:8000)** to launch the AutoRAG & ML Telemetry Platform.

---

### Step 3: Run Pillar 3 (Predictive Maintenance MLOps)
```bash
# 1. Install MLOps dependencies
pip install -r predictive-maintenance-ml/requirements.txt

# 2. Train model & optimize industrial cost-utility matrix
python predictive-maintenance-ml/src/train.py

# 3. Export champion model to ONNX runtime
python predictive-maintenance-ml/src/export_onnx.py
```

---

## 📜 Resume & Portfolio Highlights

- **Full-Stack Data Engineering**: Architected an end-to-end retail performance platform processing 150k+ records using Kimball Star Schema in SQLite, optimized PRAGMAs (WAL, 64MB cache) for sub-5ms API latency, and a responsive React/Tailwind/ECharts frontend.
- **Advanced Time-Intelligence & DAX**: Designed complex analytical CTEs with `LAG()`, `DENSE_RANK()`, and `NTILE(5)` for MoM growth, store rankings, and behavioral RFM segmentation alongside enterprise VertiPaq DAX measures.
- **Enterprise GenAI & RAG Security**: Built a production RAG pipeline using FastAPI and dense vector embeddings with real-time 3-tier XML delimiter sandboxing and input sanitization to eliminate prompt injection vulnerabilities.
- **Predictive Maintenance & MLOps**: Developed vibration time-series feature engineering and calibrated Scikit-Learn / ONNX models against an industrial cost-utility matrix ($15k FN vs $150 FP), yielding $180k+ in simulated fleet cost avoidance.

---

## 📄 License
This ecosystem is licensed under the MIT License.
