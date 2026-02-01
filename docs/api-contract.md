# API Contract — Automation Dashboard

This document defines the HTTP API contract between the React frontend and the Node.js backend.

---

## Base URLs

- Health endpoint (not under `/api`): `http://localhost:5000/health`
- API base (areas endpoints): `http://localhost:5000/api`

---

## Conventions

- All responses are JSON.
- Date/time fields (e.g. `testedOn`) are returned as strings in the backend’s current format.
- Area identifiers are case-sensitive in the API (examples use uppercase IDs such as `PRM`).
- Errors use the JSON shape `{ "error": "<message>" }` when returned (see **Errors** section).

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

* `limit` (number, default: `10`) — number of failure items to return in `recentFailures`.
* `daysBack` (number, default: `7`) — planned lookback window.

  * **Current implementation note:** the backend currently summarizes the *latest run day* (based on `MAX(TRUNC(TESTEDON))`). `daysBack` is parsed but not applied in the SQL yet.

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

---

## Response shape definitions

### `totals`

* `passed` (number) — count of passed tests in the selected summary scope.
* `failed` (number) — count of failed tests in the selected summary scope.
* `total` (number) — total tests in the selected summary scope.
* `passRate` (number) — pass percentage (0–100).

### `lastRun`

* `testedOn` (string | null) — date/time of the last run day (format as returned by backend).
* `buildNumber` (number | null)
* `server` (string | null)
* `almaVersion` (string | null)

### `recentFailures[]`

Each item includes:

* `testedOn` (string | null)
* `testName` (string | null)
* `server` (string | null)
* `almaVersion` (string | null)
* `buildNumber` (number | null)
* `logLink` (string | null)
* `screenshotLink` (string | null)
* `failureTextPreview` (string | null) — short failure preview (may include escaped HTML).

---

## Errors

### Current behavior

* Unknown `areaId` returns `200 OK` with an empty summary object:

  * `totals` values are all `0`
  * `lastRun` fields are `null`
  * `recentFailures` is an empty array

Example (unknown area):

```json
{
  "area": "NOT_EXIST",
  "windowDays": 1,
  "totals": {
    "passed": 0,
    "failed": 0,
    "total": 0,
    "passRate": 0
  },
  "lastRun": {
    "testedOn": null,
    "buildNumber": null,
    "server": null,
    "almaVersion": null
  },
  "recentFailures": []
}
```

### Recommended standard (planned)

The backend should return errors in this format:

```json
{ "error": "Human readable message" }
```

Examples:

* `404 Not Found` — unknown `areaId`

```json
{ "error": "Unknown areaId: NOT_EXIST" }
```

* `400 Bad Request` — invalid query params (e.g., negative or non-numeric `limit`)

```json
{ "error": "limit must be a positive number" }
```

* `500 Internal Server Error` — database connection or query failure

```json
{ "error": "Internal Server Error" }
```
