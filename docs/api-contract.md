
---

# `docs/api-contract.md`


# API Contract — Automation Dashboard

This document defines the HTTP API contract between the React frontend and the Node.js backend.

## Base URL
- Local development: `http://localhost:5000/api`

## Conventions
- All responses are JSON.
- Date/time fields (e.g. `testedOn`) are returned as strings in the backend’s current format.
- Errors are returned as JSON with an `error` field (recommended standard).

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
````

---

## Areas

### GET `/api/areas`

Returns the list of dashboard areas.

**Response — 200 OK**

```json
[
  { "id": "PRM", "name": "PRM" },
  { "id": "PRM_OLD", "name": "PRM (old)" },
  { "id": "ERM", "name": "ERM" },
  { "id": "ALMAE", "name": "Alma Starter" },
  { "id": "AUTHORITY", "name": "Authorities" },
  { "id": "ANALYTICS", "name": "Analytics" },
  { "id": "API", "name": "API" },
  { "id": "ACQ", "name": "Acquisition" },
  { "id": "FULF_OLD", "name": "Fulfillment (old)" },
  { "id": "FULF", "name": "Fulfillment" },
  { "id": "RSH", "name": "Resource Sharing" },
  { "id": "INTEROPERABILITY", "name": "Interoperability" },
  { "id": "INTEROPERABILITYNG", "name": "InteroperabilityNG" },
  { "id": "USERS", "name": "Users" },
  { "id": "LOD", "name": "Linked open data" },
  { "id": "NMDEDITOR", "name": "NMDEditor" },
  { "id": "METADATAMANAGEMENT", "name": "Metadata Management" },
  { "id": "RMANDCONSORTIA", "name": "RM and Consortia" },
  { "id": "STAFFSEARCH", "name": "StaffSearch" },
  { "id": "PUBLISHING", "name": "Publishing" },
  { "id": "GLOBALRS", "name": "Rapido" },
  { "id": "COLLECTO", "name": "Collecto" },
  { "id": "SPECTO", "name": "Specto" },
  { "id": "SPECTOESSENTIAL", "name": "Specto Essential" },
  { "id": "SPECTOPRESERVATION", "name": "Specto Preservation" }
]
```

**Notes**

* `id` is the value used by the frontend in URLs (e.g. `/api/areas/{id}/summary`).
* `name` is the display label shown in the UI.

---

## Area Summary

### GET `/api/areas/{areaId}/summary`

Returns an aggregated summary for a specific area.

**Path params**

* `areaId` (string) — the area identifier from `GET /api/areas` (example: `PRM`).

**Query params**

* `windowDays` (number, default: `1`) — number of days to look back.

**Response — 200 OK**

```json
{
  "area": "PRM",
  "windowDays": 1,
  "totals": {
    "passed": 99,
    "failed": 120,
    "total": 222,
    "passRate": 44.59
  },
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

### Response shape definitions

#### `totals`

* `passed` (number) — count of passed tests in the selected window.
* `failed` (number) — count of failed tests in the selected window.
* `total` (number) — total tests in the selected window.
* `passRate` (number) — pass percentage (0–100).

#### `lastRun`

* `testedOn` (string | null) — date/time of the last run in the selected window (format as returned by backend).
* `buildNumber` (number | null)
* `server` (string | null)
* `almaVersion` (string | null)

#### `recentFailures[]`

Each item includes:

* `testedOn` (string)
* `testName` (string)
* `server` (string)
* `almaVersion` (string)
* `buildNumber` (number)
* `logLink` (string | null)
* `screenshotLink` (string | null)
* `failureTextPreview` (string | null) — short failure preview (may contain escaped HTML).

---

## Errors (recommended standard)

The backend should return errors in this format:

**Response — 4xx/5xx**

```json
{ "error": "Unknown areaId: NOT_EXIST" }

{ "error": "limit must be a positive number" }
```

Examples:

* `400 Bad Request` — unknown `areaId` or invalid `windowDays`
* `500 Internal Server Error` — database connection or query failure
