import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAreaRecentFailuresGrouped } from "../services/apiService";
import type {
  AreaRecentFailuresGroupedResponse,
  RecentFailureGroupedItem,
} from "../types/RecentFailuresGrouped";

const WINDOW_DAYS = 10;
const LIMIT = 200; // fetch up to 200 failing tests

// ─── Screenshot modal – click backdrop to close ───────────────────────────────
const ImageModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "zoom-out",
    }}
  >
    <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
      <img
        src={src}
        alt="screenshot"
        style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
      />
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: -16, right: -16,
          background: "#ef4444", border: "none", borderRadius: "50%",
          width: 32, height: 32, color: "#fff", fontSize: 18,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >×</button>
    </div>
  </div>
);

// ─── Shared styles ────────────────────────────────────────────────────────────
const fatalBoxStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#f1f5f9",
  borderRadius: 8,
  padding: "12px 16px",
  fontSize: 12,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  margin: 0,
  lineHeight: 1.6,
  
  
  border: "1px solid #1e293b", // no maxHeight – full FATAL text always visible
};

const metaStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  padding: "2px 10px",
  fontSize: 12,
  color: "#475569",
};

const linkBtnStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  padding: "4px 12px",
  fontSize: 12,
  color: "#3b82f6",
  textDecoration: "none",
};

// ─── Single test failure card ─────────────────────────────────────────────────
const FailureCard: React.FC<{
  item: RecentFailureGroupedItem;
  index: number;
  onImageClick: (src: string) => void;
}> = ({ item, index, onImageClick }) => {
  const [reasonsOpen, setReasonsOpen] = useState(false);

  const hasMultipleReasons = item.reasons.length > 1;
  const primaryReason = item.reasons[0] ?? null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.11)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)")}
    >
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "14px 20px 12px",
        borderBottom: "1px solid #f3f4f6",
        background: "#fafafa",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{
            background: "#f1f5f9", color: "#64748b",
            borderRadius: 6, padding: "2px 8px",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            #{index + 1}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 14, fontWeight: 700, color: "#1e293b",
            wordBreak: "break-all",
          }}>
            {item.testName}
          </span>
        </div>

        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 20, padding: "3px 12px",
          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13 }}>💥</span>
          <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 13 }}>
            {item.failCount} failures
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex" }}>

        {/* Left column – failure details */}
        <div style={{ flex: 1, padding: "14px 20px", minWidth: 0 }}>

          {/* Quick meta info */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {item.lastFailedOn && <span style={metaStyle}>🕐 {item.lastFailedOn}</span>}
            {item.lastFailure.server && <span style={metaStyle}>🖥️ {item.lastFailure.server}</span>}
            {item.lastFailure.almaVersion && <span style={metaStyle}>📦 {item.lastFailure.almaVersion}</span>}
            {item.lastFailure.buildNumber && item.lastFailure.buildNumber > 0 && <span style={metaStyle}>🔨 Build {item.lastFailure.buildNumber}</span>}
          </div>

          {/* Primary failure reason */}
          {primaryReason && (
            <div style={{ marginBottom: hasMultipleReasons ? 8 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Primary reason
              </div>
              <pre style={fatalBoxStyle}>{primaryReason}</pre>
            </div>
          )}

          {/* Accordion for additional reasons */}
          {hasMultipleReasons && (
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => setReasonsOpen(!reasonsOpen)}
                style={{
                  background: "none", border: "1px solid #e2e8f0",
                  borderRadius: 6, padding: "4px 12px",
                  cursor: "pointer", fontSize: 12, color: "#64748b",
                  display: "flex", alignItems: "center", gap: 6,
                  marginBottom: reasonsOpen ? 8 : 0,
                }}
              >
                <span style={{
                  display: "inline-block",
                  transform: reasonsOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>▶</span>
                {reasonsOpen ? "Hide" : `Show ${item.reasons.length - 1} more reasons`}
              </button>

              {reasonsOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {item.reasons.slice(1).map((reason, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Reason {i + 2}
                      </div>
                      <pre style={fatalBoxStyle}>{reason}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Links */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {item.lastFailure.logLink && (
              <a href={item.lastFailure.logLink} target="_blank" rel="noreferrer" style={linkBtnStyle}>
                📄 Log
              </a>
            )}
            {item.lastFailure.screenshotLink && (
              <a href={item.lastFailure.screenshotLink} target="_blank" rel="noreferrer" style={linkBtnStyle}>
                🔗 Screenshot URL
              </a>
            )}
          </div>
        </div>

        {/* Right column – screenshot thumbnail */}
        {item.lastFailure.screenshotLink && (
          <div style={{
            width: 180, flexShrink: 0,
            borderLeft: "1px solid #f3f4f6",
            padding: 12,
            display: "flex", alignItems: "flex-start", justifyContent: "center",
          }}>
            <img
              src={item.lastFailure.screenshotLink}
              alt="screenshot"
              onClick={() => onImageClick(item.lastFailure.screenshotLink!)}
              style={{
                width: "100%", borderRadius: 6,
                border: "1px solid #e2e8f0",
                cursor: "zoom-in",
                transition: "transform 0.2s, box-shadow 0.2s",
                objectFit: "cover",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onError={e => { (e.currentTarget.parentElement!).style.display = "none"; }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main page component ──────────────────────────────────────────────────────
const RecentFailuresPage: React.FC = () => {
  const { areaName } = useParams<{ areaName: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AreaRecentFailuresGroupedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"failCount" | "lastFailedOn">("failCount");
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!areaName) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getAreaRecentFailuresGrouped(areaName, WINDOW_DAYS, LIMIT);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load failures");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [areaName]);

  const items = useCallback(() => {
    if (!data) return [];
    let list = [...data.items];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.testName.toLowerCase().includes(q));
    }
    list.sort((a, b) =>
      sortBy === "failCount"
        ? b.failCount - a.failCount
        : (b.lastFailedOn ?? "").localeCompare(a.lastFailedOn ?? "")
    );
    return list;
  }, [data, search, sortBy])();

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>

      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      {/* ── Header sticky ── */}
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
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace" }}>
            {areaName}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            Recent failures • last {WINDOW_DAYS} days
          </div>
        </div>

        {data && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "6px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{data.items.length}</div>
            <div style={{ fontSize: 11, color: "#ef4444" }}>failed tests</div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "24px 40px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div>Loading failures...</div>
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

        {!loading && !error && data?.items.length === 0 && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 10, padding: 40, color: "#16a34a", textAlign: "center", fontSize: 16,
          }}>
            🎉 No failures found in the last {WINDOW_DAYS} days!
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            {/* Search and sort bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                placeholder="🔍  Search by test name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 220,
                  border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 14px", fontSize: 13, outline: "none",
                  background: "#fff", color: "#1e293b",
                }}
              />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 14px", fontSize: 13, outline: "none",
                  background: "#fff", color: "#475569", cursor: "pointer",
                }}
              >
                <option value="failCount">Sort: failure count</option>
                <option value="lastFailedOn">Sort: last failed</option>
              </select>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>{items.length} results</span>
            </div>

            {/* Failure cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {items.map((item, i) => (
                <FailureCard
                  key={item.testName}
                  item={item}
                  index={i}
                  onImageClick={setModalSrc}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RecentFailuresPage;