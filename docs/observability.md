# Observability & Metrics

The PDR AI backend now exposes Prometheus-compatible metrics so you can track request health, cache efficiency, and search fallbacks in real time.

## Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `pdr_predictive_analysis_duration_seconds` | Histogram | End-to-end latency for predictive document analysis requests, labeled by `result` and `cached`. |
| `pdr_predictive_analysis_requests_total` | Counter | Request totals labeled by success/error and cache usage. |
| `pdr_predictive_analysis_cache_hits_total` | Counter | Number of times cached analysis results were returned. |
| `pdr_predictive_analysis_ai_calls` | Histogram | Distribution of GPT call counts per analysis (estimates cost/latency pressure). |
| `pdr_qa_request_duration_seconds` | Histogram | Latency for `/api/AIAssistant` requests labeled by `result` and retrieval strategy. |
| `pdr_qa_requests_total` | Counter | Total Q&A requests split by result (`success`, `empty`, `error`). |

All metrics live under the `pdr_` prefix alongside `prom-client` default process metrics.

## Scraping the Endpoint

1. Run the application (`pnpm dev`).
2. Scrape `http://localhost:3000/api/metrics`:

```bash
curl -s http://localhost:3000/api/metrics
```

3. Wire Prometheus by adding a scrape config:

```yaml
scrape_configs:
  - job_name: pdrai
    scrape_interval: 10s
    static_configs:
      - targets: ["host.docker.internal:3000"]
```

## Grafana Ideas

- **Predictive Analysis Dashboard**
  - Request rate & errors: `rate(pdr_predictive_analysis_requests_total[5m])`
  - Cache hit %: `rate(pdr_predictive_analysis_cache_hits_total[5m]) / rate(pdr_predictive_analysis_requests_total{cached="true"}[5m])`
  - GPT call histogram: `histogram_quantile(0.95, sum(rate(pdr_predictive_analysis_ai_calls_bucket[5m])) by (le))`

- **Q&A Reliability**
  - Latency (P95) split by retrieval: `histogram_quantile(0.95, sum(rate(pdr_qa_request_duration_seconds_bucket[5m])) by (le,retrieval))`
  - Fallback ratio: `rate(pdr_qa_requests_total{retrieval="ann_fallback"}[5m]) / rate(pdr_qa_requests_total[5m])`

With these dashboards you can quickly spot cache regressions, surging GPT usage, or ensemble search failures long before end users notice.
