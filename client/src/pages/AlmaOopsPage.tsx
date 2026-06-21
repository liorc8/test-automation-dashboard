import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Alert, CircularProgress, Chip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EnvToggle from "../components/EnvToggle";
import ThemeToggle from "../components/ThemeToggle";
import SearchInput from "../components/SearchInput";
import FailureCard from "../components/FailureCard";
import ImageModal from "../components/ImageModal";
import LogModal from "../components/LogModal";
import { getAlmaOops, type EnvFilter } from "../services/apiService";
import type { AlmaOopsItem } from "../types/AlmaOops";

const AlmaOopsPage: React.FC = () => {
  const navigate = useNavigate();
  const [env, setEnv] = useState<EnvFilter>(
    () => (localStorage.getItem("selectedEnv") as EnvFilter) ?? "qa"
  );
  const [items, setItems] = useState<AlmaOopsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<{ lines: string[]; testName: string; label: string } | null>(null);

  const handleEnvChange = (e: EnvFilter) => {
    setEnv(e);
    localStorage.setItem("selectedEnv", e);
  };

  const openHistory = (area: string, testName: string) => {
    navigate(`/area/${encodeURIComponent(area)}/test/${encodeURIComponent(testName)}/history?env=${env}`);
  };

  // Client-side filter on job name, server, or error message (also test/area).
  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter(it =>
        (it.jobName ?? "").toLowerCase().includes(q) ||
        (it.lastFailure.server ?? "").toLowerCase().includes(q) ||
        (it.reasons[0]?.text ?? "").toLowerCase().includes(q) ||
        it.testName.toLowerCase().includes(q) ||
        it.area.toLowerCase().includes(q)
      )
    : items;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getAlmaOops(env)
      .then(d => { if (!cancelled) setItems(d.items); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load Alma oops"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [env]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {imageSrc && <ImageModal src={imageSrc} onClose={() => setImageSrc(null)} />}
      {logModal && (
        <LogModal lines={logModal.lines} testName={logModal.testName} reasonLabel={logModal.label}
          onClose={() => setLogModal(null)} />
      )}

      {/* ── Sticky header ── */}
      <Box component="header" sx={{
        bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
        px: 4, py: 1.75, display: "flex", alignItems: "center", gap: 2,
        position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <Button
          variant="outlined" size="small" startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          sx={{ borderColor: "divider", color: "text.secondary", textTransform: "none" }}
        >
          Dashboard
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 26, fontWeight: 900, color: "text.primary", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Alma oops
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            "Message appear" popup failures · last 10 days · {env.toUpperCase()}
          </Typography>
        </Box>
        <EnvToggle value={env} onChange={handleEnvChange} />
        {!loading && !error && (
          <Box sx={{ bgcolor: "background.default", border: 1, borderColor: "divider", borderRadius: 2.5, px: 2.25, py: 0.75, textAlign: "center" }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: "text.primary" }}>{items.length}</Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>oops</Typography>
          </Box>
        )}
        <ThemeToggle />
      </Box>

      {/* ── Content ── */}
      <Box sx={{ p: "24px 40px" }}>
        {loading && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 8, color: "text.secondary" }}>
            <CircularProgress size={28} />
            <Typography>Loading Alma Oops…</Typography>
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && items.length === 0 && (
          <Alert severity="success">🎉 No Alma oops failures in the last 10 days!</Alert>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, alignItems: "center" }}>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search"
                sx={{ maxWidth: 480, flex: 1 }}
              />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{filtered.length} results</Typography>
            </Box>

            {filtered.length === 0 ? (
              <Alert severity="info">No Alma oops match <strong>"{search}"</strong></Alert>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                {filtered.map((item, i) => (
              <Box key={`${item.area}-${item.testName}`}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Chip label={item.area} size="small" variant="outlined" sx={{ fontSize: 11, color: "text.secondary", borderColor: "divider" }} />
                  <Chip label={`Occurred ${item.occurrences} ${item.occurrences === 1 ? "time" : "times"}`} size="small"
                    sx={{ fontSize: 11, fontWeight: 700, bgcolor: "#1e293b", color: "#f1f5f9" }} />
                </Box>
                <FailureCard
                  item={item}
                  index={i}
                  onImageClick={setImageSrc}
                  onExpandLog={(lines, testName, label) => setLogModal({ lines, testName, label })}
                  onOpenHistory={() => openHistory(item.area, item.testName)}
                  areaName={item.area}
                />
              </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default AlmaOopsPage;
