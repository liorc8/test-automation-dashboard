import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getAreaHealthTests, type HealthBucket, type HealthTestItem } from "../services/apiService";

const BUCKET_COLOR: Record<HealthBucket, string> = {
  healthy: "#2e7d32",
  medium:  "#ed6c02",
  bad:     "#c62828",
  dead:    "#757575",
};

const BUCKET_BG: Record<HealthBucket, string> = {
  healthy: "#f0fdf4",
  medium:  "#fff7ed",
  bad:     "#fef2f2",
  dead:    "#f5f5f5",
};

const BUCKET_BORDER: Record<HealthBucket, string> = {
  healthy: "#bbf7d0",
  medium:  "#fed7aa",
  bad:     "#fecaca",
  dead:    "#e0e0e0",
};

const isValidBucket = (b: string | undefined): b is HealthBucket =>
  b === "healthy" || b === "medium" || b === "bad" || b === "dead";

const AreaHealthPage: React.FC = () => {
  const { areaName, bucket } = useParams<{ areaName: string; bucket: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const env = (searchParams.get("env") ?? "qa") as "qa" | "release" | "sandbox";

  const [tests, setTests] = useState<HealthTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!areaName || !isValidBucket(bucket)) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getAreaHealthTests(areaName, bucket, env);
        setTests(result.tests);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tests");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [areaName, bucket, env]);

  if (!isValidBucket(bucket)) {
    return <div style={{ padding: 40, color: "#c62828" }}>Invalid bucket: {bucket}</div>;
  }

  const color  = BUCKET_COLOR[bucket];
  const bg     = BUCKET_BG[bucket];
  const border = BUCKET_BORDER[bucket];
  const label  = bucket.charAt(0).toUpperCase() + bucket.slice(1);

  const filtered = search.trim()
    ? tests.filter(t => t.testName.toLowerCase().includes(search.toLowerCase()))
    : tests;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>

      {/* ── Sticky header ── */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "14px 32px",
        display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none", border: "1px solid #e2e8f0",
            borderRadius: 8, padding: "6px 14px",
            cursor: "pointer", fontSize: 13, color: "#64748b",
          }}
        >
          ← Dashboard
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 18, fontWeight: 800, color: "#1e293b",
            }}>
              {areaName}
            </span>
            <span style={{
              background: bg, border: `1px solid ${border}`,
              color, borderRadius: 20, padding: "2px 12px",
              fontSize: 12, fontWeight: 700,
            }}>
              {label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            Test health • {env.toUpperCase()}
          </div>
        </div>

        {!loading && !error && (
          <div style={{
            background: bg, border: `1px solid ${border}`,
            borderRadius: 10, padding: "6px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{tests.length}</div>
            <div style={{ fontSize: 11, color }}>{label.toLowerCase()} tests</div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "24px 40px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div>Loading tests...</div>
          </div>
        )}

        {!loading && error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: 20, color: "#dc2626", textAlign: "center",
          }}>
            ❌ {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Search bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
              <input
                type="text"
                placeholder="🔍  Search by test name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, maxWidth: 480,
                  border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 14px", fontSize: 13, outline: "none",
                  background: "#fff", color: "#1e293b",
                }}
              />
              <span style={{ fontSize: 13, color: "#94a3b8" }}>{filtered.length} results</span>
            </div>

            {/* Table */}
            <div style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 120px 120px 80px",
                padding: "10px 20px",
                background: "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
                fontSize: 11, fontWeight: 700, color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                <span>Test Name</span>
                <span style={{ textAlign: "center" }}>Pass Rate</span>
                <span style={{ textAlign: "center" }}>Successes</span>
                <span style={{ textAlign: "center" }}>Failures</span>
                <span style={{ textAlign: "center" }}>Last Run</span>
              </div>

              {/* Table rows */}
              {filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                  No tests found
                </div>
              ) : (
                filtered.map((t, i) => (
                  <div
                    key={t.testName}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 120px 120px 80px",
                      padding: "12px 20px",
                      borderBottom: i < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                      alignItems: "center",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: 13, color: "#1e293b", wordBreak: "break-all",
                    }}>
                      {t.testName}
                    </span>

                    {/* Pass rate bar */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        flexDirection: "column",
                      }}>
                        <span style={{ fontWeight: 700, color, fontSize: 14 }}>
                          {t.passRate}%
                        </span>
                        <div style={{
                          width: 80, height: 4, background: "#e5e7eb", borderRadius: 2,
                        }}>
                          <div style={{
                            width: `${t.passRate}%`, height: "100%",
                            background: color, borderRadius: 2,
                          }} />
                        </div>
                      </div>
                    </div>

                    <span style={{ textAlign: "center", color: "#2e7d32", fontWeight: 600, fontSize: 13 }}>
                      {t.successes}
                    </span>
                    <span style={{ textAlign: "center", color: "#c62828", fontWeight: 600, fontSize: 13 }}>
                      {t.fails}
                    </span>
                    <span style={{ textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                      {t.lastRunDate}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AreaHealthPage;
