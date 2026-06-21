# API Contract — Automation Dashboard

This document defines the HTTP API contract between the React frontend and the Node.js backend.

---

## Base URLs

- Health endpoint (not under `/api`): `http://localhost:5000/health`
- API base: `http://localhost:5000/api`

The frontend (`client/src/services/apiService.ts`) calls the API via the relative base `"/api"`. In production the Express server also serves the built client (`client/dist`) and falls back to `index.html` for any non-`/api`, non-`/health` route.

---

## Conventions

- All responses are JSON.
- Date/time fields are returned as strings; format varies per endpoint (ISO-like `YYYY-MM-DDTHH:mm:ss`, `YYYY-MM-DD`, or a display string), noted where relevant.
- Area identifiers are the values from `GET /api/areas` (examples use uppercase IDs such as `PRM`).
- The `env` query param accepts `qa` | `release` | `sandbox`. Any other/missing value falls back to `qa`. It maps to a server-name filter (`buildServerFilter`).
- `daysBack` and `windowDays` are interchangeable on endpoints that accept a lookback window; each endpoint clamps to its own maximum.
- Errors use the JSON shape `{ "error": "<message>" }` (see **Errors** section).

---

## Endpoint Summary

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Backend availability |
| GET | `/api/areas` | List dashboard areas (dynamic, DB-backed) |
| GET | `/api/areas/dashboard` | Per-area totals + health buckets for all areas |
| GET | `/api/areas/daily-trends` | Daily pass/fail trends for all areas |
| GET | `/api/areas/{areaName}/summary` | Single-area aggregated summary |
| GET | `/api/areas/{areaName}/health` | Daily health time-series for an area |
| GET | `/api/areas/{areaName}/failures` | Raw failure rows for an area |
| GET | `/api/areas/{areaName}/recent-failures-grouped` | Recent failures grouped by test name |
| GET | `/api/areas/{areaName}/health-tests` | Tests in a given health bucket |
| GET | `/api/areas/{areaName}/daily-trend` | Daily pass/fail trend for one area |
| GET | `/api/areas/{areaName}/latest-failed-tests` | Latest failed tests grouped by server |
| GET | `/api/areas/{areaName}/tests/{testName}/history` | Per-test run history |
| GET | `/api/areas/{areaName}/testrail-ids` | TestRail case IDs for an area's tests |
| GET | `/api/areas/{areaName}/failures-by-reason` | Failures grouped by reason text |
| GET | `/api/envs/{env}/health` | Daily health time-series for an environment |
| GET | `/api/common-failures` | Cross-area failure clusters |
| GET | `/api/alma-oops` | Legacy "Alma oops" failures (FATAL + "Message appear") |
| GET | `/api/logs/expand` | Parsed/expanded Jenkins log snippet |
| GET | `/api/test-results` | Test name search (and raw rows when no query) |

---

## Health

### GET `/health`

Returns backend availability information.

**Response — 200 OK**
```json
{
  "status": "OK",
  "system": "Automation Dashboard Backend"
}
```

---

## Areas

### GET `/api/areas`

Returns the list of dashboard areas. Resolved dynamically from the database (`SELECT DISTINCT` areas with display-name overrides, cached for 24h). On a DB error the server falls back to the static config in `config/areas.ts`.

**Response — 200 OK**
```json
[
  { "id": "PRM", "name": "PRM" },
  { "id": "ERM", "name": "ERM" },
  { "id": "ANALYTICS", "name": "Analytics" }
]
```

**Notes**
- `id` is the value used by the frontend in URLs (e.g. `/api/areas/{id}/summary`).
- `name` is the display label shown in the UI.

---

### GET `/api/areas/dashboard`

Per-area totals and health buckets for all areas (powers the dashboard grid).

**Query params**
- `daysBack` (number, default `8`, must be `> 0`) — lookback window.
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "daysBack": 8,
  "items": [
    {
      "area": "PRM",
      "last": { "passed": 99, "failed": 21, "total": 120, "passRate": 82.5 },
      "health": { "healthy": 40, "medium": 5, "bad": 3, "dead": 2 }
    }
  ]
}
```

---

### GET `/api/areas/daily-trends`

Daily pass/fail/total counts for every area, keyed by area name.

**Query params**
- `daysBack` (number, default `8`, must be `> 0`, max `90`).
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "env": "qa",
  "daysBack": 8,
  "areas": {
    "PRM": [
      { "date": "2026-06-18", "passed": 99, "failed": 21, "total": 120 }
    ]
  }
}
```

---

### GET `/api/areas/{areaName}/summary`

Aggregated summary for a single area.

**Path params**
- `areaName` (string) — area identifier from `GET /api/areas`.

**Query params**
- `limit` (number, default `10`, must be `> 0`) — number of items in `recentFailures`.
- `daysBack` (number, default `7`, must be `> 0`) — parsed/validated but not currently applied in the SQL (summary uses the latest run day).

**Response — 200 OK**
```json
{
  "area": "PRM",
  "windowDays": 1,
  "totals": { "passed": 99, "failed": 120, "total": 222, "passRate": 44.59 },
  "lastRun": {
    "testedOn": "01/02/2026 00:00",
    "buildNumber": 0,
    "server": "SQA03_NA01",
    "almaVersion": "April2026"
  },
  "recentFailures": [
    {
      "testedOn": "01/02/2026 00:00",
      "testName": "SynchAndEditViaNACSIS_CloudAppMonographBib",
      "server": "SQA02_NA03",
      "almaVersion": "April2026",
      "buildNumber": 0,
      "logLink": "http://...",
      "screenshotLink": "http://...",
      "failureTextPreview": "DEBUG ... FATAL ..."
    }
  ]
}
```

---

### GET `/api/areas/{areaName}/health`

Daily health time-series for an area.

**Path params**
- `areaName` (string).

**Query params**
- `daysBack` (number, default `8`, must be `> 0`).

**Response — 200 OK**
```json
{
  "area": "PRM",
  "windowDays": 8,
  "series": [
    { "runDay": "2026-06-18", "passed": 99, "failed": 21, "skipped": 0, "total": 120, "passRate": 82.5 }
  ]
}
```

---

### GET `/api/areas/{areaName}/failures`

Raw failure rows for an area.

**Path params**
- `areaName` (string).

**Query params**
- `daysBack` (number, default `7`, clamped to max `90`).
- `limit` (number, default `50`, clamped to max `500`).
- `latestPerTest` (boolean-ish: `1|true|yes|y|on`, default `false`) — when true, only each test's latest failure.

**Response — 200 OK** — array of failure rows for the area (server-shaped failure objects).

---

### GET `/api/areas/{areaName}/recent-failures-grouped`

Recent failures grouped by test name (one card per test, with its distinct reasons).

**Path params**
- `areaName` (string).

**Query params**
- `windowDays` (alias `daysBack`, default `7`, clamped to max `90`).
- `limit` (number, default `50`, clamped to max `500`).
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "area": "PRM",
  "windowDays": 10,
  "reasonsMax": 3,
  "items": [
    {
      "testName": "SynchAndEdit...",
      "failCount": 4,
      "lastFailedOn": "2026-06-18",
      "jobName": "PRM_QA_NIGHTLY",
      "reasons": [
        { "text": "FATAL ...", "lastDate": "2026-06-18", "screenshotLink": "http://...", "logLink": "http://..." }
      ],
      "lastFailure": {
        "server": "SQA02_NA03",
        "almaVersion": "April2026",
        "buildNumber": 0,
        "logLink": "http://...",
        "screenshotLink": "http://..."
      }
    }
  ]
}
```

---

### GET `/api/areas/{areaName}/health-tests`

Tests belonging to a given health bucket.

**Path params**
- `areaName` (string).

**Query params**
- `bucket` (required, one of `healthy` | `medium` | `bad` | `dead`).
- `env` (`qa` | `release` | `sandbox`, default `qa`).
- `daysBack` (number, default `8`, must be `> 0`).

**Response — 200 OK**
```json
{
  "areaName": "PRM",
  "bucket": "bad",
  "env": "qa",
  "tests": [
    {
      "testName": "SynchAndEdit...",
      "passRate": 12.5,
      "successes": 1,
      "fails": 7,
      "lastRunDate": "2026-06-18",
      "lastPassed": false,
      "lastSuccess": "2026-06-10",
      "lastFailure": "2026-06-18"
    }
  ]
}
```

---

### GET `/api/areas/{areaName}/daily-trend`

Daily pass/fail trend for a single area.

**Path params**
- `areaName` (string).

**Query params**
- `daysBack` (number, default `8`, must be `> 0`, clamped to max `30`).
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "areaName": "PRM",
  "env": "qa",
  "daysBack": 8,
  "points": [
    { "date": "2026-06-18", "passed": 99, "failed": 21, "total": 120 }
  ]
}
```

---

### GET `/api/areas/{areaName}/latest-failed-tests`

Latest failed test per test name, grouped by server.

**Path params**
- `areaName` (string).

**Query params**
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "area": "PRM",
  "env": "qa",
  "totalCount": 12,
  "servers": [
    {
      "server": "SQA02_NA03",
      "tests": [
        {
          "testName": "SynchAndEdit...",
          "server": "SQA02_NA03",
          "testedOn": "2026-06-18",
          "failureText": "FATAL ...",
          "logLink": "http://...",
          "screenshotLink": "http://...",
          "almaVersion": "April2026",
          "buildNumber": 0
        }
      ]
    }
  ]
}
```

---

### GET `/api/areas/{areaName}/tests/{testName}/history`

Run history for a single test.

**Path params**
- `areaName` (string).
- `testName` (string).

**Query params**
- `daysBack` (alias `windowDays`, number, default `30`, must be `> 0`, clamped to max `365`).
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "area": "PRM",
  "testName": "SynchAndEdit...",
  "env": "qa",
  "rows": [
    {
      "testedOn": "2026-06-18T00:00:00",
      "endingTimeUnix": 1750204800000,
      "passed": false,
      "server": "SQA02_NA03",
      "buildNumber": 0,
      "almaVersion": "April2026",
      "failureText": "FATAL ...",
      "logLink": "http://...",
      "screenshotLink": "http://..."
    }
  ]
}
```

---

### GET `/api/areas/{areaName}/testrail-ids`

TestRail case IDs mapped per test name, plus the TestRail base URL for building deep links.

**Path params**
- `areaName` (string).

**Query params**
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "areaName": "PRM",
  "env": "qa",
  "baseUrl": "https://exlibris.testrail.com/index.php?/cases/view/",
  "ids": { "SynchAndEdit...": "123456" }
}
```

---

### GET `/api/areas/{areaName}/failures-by-reason`

Failures grouped by their reason text (the "By Reason" view). Each reason groups the affected tests.

**Path params**
- `areaName` (string).

**Query params**
- `windowDays` (alias `daysBack`, number, default `10`, must be `> 0`, clamped to max `90`).
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "area": "PRM",
  "windowDays": 10,
  "env": "qa",
  "reasons": [
    {
      "reasonText": "FATAL ...",
      "failCount": 5,
      "tests": [
        {
          "testName": "SynchAndEdit...",
          "failCount": 3,
          "lastFailedOn": "2026-06-18",
          "jobName": "PRM_QA_NIGHTLY",
          "reasons": [
            { "text": "FATAL ...", "lastDate": "2026-06-18", "screenshotLink": "http://...", "logLink": "http://..." }
          ],
          "lastFailure": {
            "server": "SQA02_NA03",
            "almaVersion": "April2026",
            "buildNumber": 0,
            "logLink": "http://...",
            "screenshotLink": "http://..."
          }
        }
      ]
    }
  ]
}
```

---

## Environments

### GET `/api/envs/{env}/health`

Daily health time-series for an environment.

**Path params**
- `env` (string) — must match `^[A-Za-z0-9_-]+$`.

**Query params**
- `daysBack` (number, default `8`, must be `> 0`).

**Response — 200 OK**
```json
{
  "env": "qa",
  "windowDays": 8,
  "series": [
    { "runDay": "2026-06-18", "passed": 990, "failed": 210, "skipped": 0, "total": 1200, "passRate": 82.5 }
  ]
}
```

---

## Common Failures

### GET `/api/common-failures`

Failure clusters shared across multiple areas (same failure text seen in more than one place).

**Query params**
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "env": "qa",
  "clusters": [
    {
      "failureText": "FATAL ...",
      "occurrenceCount": 12,
      "affectedAreas": ["PRM", "ERM"],
      "examples": [
        { "area": "PRM", "testName": "SynchAndEdit...", "logLink": "http://...", "screenshotLink": "http://..." }
      ]
    }
  ]
}
```

---

## Alma oops

### GET `/api/alma-oops`

Legacy "Alma oops" failures, reproducing the old dashboard's logic exactly:

- **Fixed 10-day window** (`TESTEDON >= SYSDATE - 10`).
- Each test is evaluated on its **latest run only** (`ROW_NUMBER() PARTITION BY UPPER(TESTNAME) ORDER BY TESTEDON DESC, ENDINGTIMEUNIX DESC`).
- A test qualifies only if that **latest run's** `FAILURETEXT` contains both `FATAL` **and** `Message appear` (case-sensitive `LIKE`), exactly matching the legacy `String.contains` checks. Tests whose latest run passed (or otherwise doesn't match) are excluded.
- Server scoped by the `env` filter.
- On top of the legacy set: results are aggregated with `GROUP BY AREA, TESTNAME` and a `COUNT(*)` **occurrences** count (how many matching runs each test had in the window), avoiding duplicate rows.

**Query params**
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK**
```json
{
  "env": "qa",
  "windowDays": 10,
  "items": [
    {
      "area": "PRM",
      "testName": "SynchAndEdit...",
      "occurrences": 4,
      "failCount": 4,
      "lastFailedOn": "2026-06-18",
      "jobName": "PRM_QA_NIGHTLY",
      "reasons": [
        { "text": "FATAL ... Message appear ...", "lastDate": "2026-06-18", "screenshotLink": "http://...", "logLink": "http://..." }
      ],
      "lastFailure": {
        "server": "SQA02_NA03",
        "almaVersion": "April2026",
        "buildNumber": 0,
        "logLink": "http://...",
        "screenshotLink": "http://..."
      }
    }
  ]
}
```

**Notes**
- `failCount` mirrors `occurrences` so the shared `FailureCard` badge renders correctly.
- `windowDays` is always `10` (fixed).

---

## Logs

### GET `/api/logs/expand`

Fetches a Jenkins log and returns a parsed snippet around the failure (first `FATAL`, searching back to the test name, falling back to the last lines). Results are cached in-memory. Sensitive values are redacted.

**Query params**
- `logUrl` (string, **required**) — the Jenkins log URL.
- `testName` (string, optional) — used to anchor the parsed window.

**Response — 200 OK (parsed/fallback)**
```json
{
  "available": true,
  "lines": ["...log line...", "...FATAL..."],
  "source": "parsed"
}
```
`source` is `"parsed"` or `"fallback"`.

**Response — 200 OK (unavailable)**
```json
{
  "available": false,
  "error": "Log file is no longer available on Jenkins. Please use the Full Log link."
}
```

**Response — 400 Bad Request** — missing `logUrl`
```json
{ "available": false, "error": "Missing logUrl" }
```

---

## Test Results / Search

### GET `/api/test-results`

Searches test names (when `q` is provided) or returns raw rows.

**Query params**
- `q` (string, optional) — test-name search term. When present, returns the latest run per matching `(area, testName)`.
- `limit` (number, default `10`, clamped to max `25`) — only applies to search results.
- `env` (`qa` | `release` | `sandbox`, default `qa`).

**Response — 200 OK (with `q`)**
```json
[
  { "area": "PRM", "testName": "SynchAndEdit...", "testedOn": "2026-06-18T00:00:00" }
]
```

**Response — 200 OK (no `q`)** — up to 50 raw `QA_AUTOMATION.TESTRESULTS` rows (Oracle column shape).

---

## Response shape definitions

### `totals` / `last` (DashboardTotals)
- `passed` (number)
- `failed` (number)
- `total` (number)
- `passRate` (number) — pass percentage (0–100).

### `health` (HealthBuckets)
- `healthy` / `medium` / `bad` / `dead` (number) — count of tests in each bucket.
- Bucketing thresholds: `≥80%` healthy, `20–79%` medium, `1–19%` bad, `0 tests` dead.

### Health series point
- `runDay` (string `YYYY-MM-DD`)
- `passed` / `failed` / `skipped` / `total` (number)
- `passRate` (number)

### Daily trend point
- `date` (string `YYYY-MM-DD`)
- `passed` / `failed` / `total` (number)

### Grouped failure item (`recent-failures-grouped`, `failures-by-reason`, `alma-oops`)
- `testName` (string)
- `failCount` (number)
- `lastFailedOn` (string | null)
- `jobName` (string | null, optional) — Jenkins job extracted from the log/screenshot URL.
- `reasons[]` — `{ text, lastDate, screenshotLink, logLink }`
- `lastFailure` — `{ server, almaVersion, buildNumber, logLink, screenshotLink }`

---

## Errors

### Standard error shape

```json
{ "error": "Human readable message" }
```

### By status code

- **`400 Bad Request`** — invalid query/path params. Examples:
  - `{ "error": "daysBack must be a positive number" }`
  - `{ "error": "limit must be a positive number" }`
  - `{ "error": "bucket must be one of: healthy, medium, bad, dead" }`
  - `{ "error": "daysBack must not exceed 90" }`
  - `{ "error": "env contains invalid characters" }`
  - `{ "available": false, "error": "Missing logUrl" }` (logs endpoint)

- **`404 Not Found`** — unknown area on area-scoped endpoints (validated via dynamic `isKnownArea`):
  - `{ "error": "Unknown areaId: NOT_EXIST" }`

- **`500 Internal Server Error`** — database connection or query failure:
  - `{ "error": "Internal Server Error" }`
  - `{ "error": "Failed to fetch test results" }` (test-results endpoint)
  - `{ "available": false, "error": "Failed to parse log." }` (logs endpoint)

**Note:** `GET /api/areas/{areaName}/summary` does not 404 via `isKnownArea` for genuinely empty areas the same way — an unknown area returns `404`, but an area with no data in the window returns a zero-filled summary.
