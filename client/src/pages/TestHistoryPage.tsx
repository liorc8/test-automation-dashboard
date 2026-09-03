import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Box, Typography, Button, Paper, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Alert } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { getTestHistory } from "../services/apiService";
import { useTestRailIds } from "../hooks/useTestRailIds";
import ThemeToggle from "../components/ThemeToggle";
import type { TestHistoryResponse, TestHistoryRow } from "../types/TestHistory";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDateOnly, extractFatalLine } from "../components/failureHelpers";
import FailureCard, { testHistoryRowToGroupedItem } from "../components/FailureCard";
import ImageModal from "../components/ImageModal";
import LogModal from "../components/LogModal";

const TestHistoryPage: React.FC = () => {
    const { areaName, testName } = useParams<{ areaName: string; testName: string }>();
    const [searchParams] = useSearchParams();
    const env = (searchParams.get("env") ?? "qa") as "qa" | "release" | "sandbox";
    const daysBack = Number(searchParams.get("daysBack") ?? 30);
    const navigate = useNavigate();

    const [data, setData] = useState<TestHistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { urlFor: testRailUrlFor, idFor: testRailIdFor } = useTestRailIds(areaName, env);
    const testRailUrl = testName ? testRailUrlFor(testName) : null;


    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [logModal, setLogModal] = useState<{ lines: string[]; testName: string; label: string } | null>(null);

    const selectedRow = selectedIndex !== null && data ? data.rows[selectedIndex] : null;

    useEffect(() => {
        if (!areaName || !testName) return;
        setLoading(true);
        setError("");
        getTestHistory(areaName, testName, env, daysBack)
            .then(setData)
            .catch((e) => setError(e instanceof Error ? e.message : String(e)))
            .finally(() => setLoading(false));
    }, [areaName, testName, env, daysBack]);

    useEffect(() => {
    if (!data) return;
    const firstFailIdx = data.rows.findIndex((r) => !r.passed);
    setSelectedIndex(firstFailIdx >= 0 ? firstFailIdx : null);
    }, [data]);

    // Build chart points: daily pass rate over daysBack window
    const chartPoints = React.useMemo(() => {
        if (!data) return [] as any[];
        // Aggregate by date
        const byDate: Record<string, { passed: number; total: number }> = {};
        for (const r of data.rows) {
            const d = r.testedOn ? r.testedOn.split("T")[0] : "unknown";
            if (!byDate[d]) byDate[d] = { passed: 0, total: 0 };
            byDate[d].total += 1;
            if (r.passed) byDate[d].passed += 1;
        }
        const points = Object.entries(byDate)
            .map(([date, v]) => ({ date, passRate: Math.round((v.passed / v.total) * 100) }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return points;
    }, [data]);

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <Box component="header" sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", px: 4, py: 1.5, display: "flex", alignItems: "center", gap: 2, position: "sticky", top: 0, zIndex: 100 }}>
                <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => {
                    const referrer = sessionStorage.getItem('recentFailuresTab');
                    if (referrer === 'from-recent-failures') {
                        const tab = sessionStorage.getItem('recentFailuresViewTab') || '0';
                        sessionStorage.removeItem('recentFailuresTab');
                        sessionStorage.removeItem('recentFailuresViewTab');
                        navigate(`/failures/${encodeURIComponent(areaName ?? '')}?tab=${tab}&env=${env}`);
                    } else {
                        navigate(-1);
                    }
                }} sx={{ borderColor: "#e2e8f0", color: "#64748b", textTransform: "none" }}>
                    Back
                </Button>
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{testName}</Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>{areaName} · {env.toUpperCase()}</Typography>
                </Box>
                {testRailUrl && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        href={testRailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ borderColor: "#e2e8f0", color: "#64748b", textTransform: "none" }}
                    >
                        TestRail
                    </Button>
                )}
                <ThemeToggle />
            </Box>

            <Box sx={{ p: "24px 40px" }}>
                {loading && (
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <CircularProgress size={20} />
                        <Typography>Loading test history…</Typography>
                    </Box>
                )}

                {!loading && error && <Alert severity="error">{error}</Alert>}

                {!loading && data && (
                    <>
                        <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
                            <Typography sx={{ fontWeight: 700, mb: 1 }}>Pass Rate (by day)</Typography>
                            <Box sx={{ width: "100%", height: 160 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={chartPoints} margin={{ top: 6, right: 12, left: 0, bottom: 24 }}>
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(value: string) => {
                                                const [, m, d] = value.split("-");
                                                return d && m ? `${d}/${m}` : value;
                                            }}
                                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                                            tickMargin={8}
                                            minTickGap={20}
                                        />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 6 }}
                                            labelStyle={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}
                                            formatter={(value) => [`${value}%`, "Pass Rate"]}
                                        />
                                        <Area type="monotone" dataKey="passRate" stroke="#2e7d32" fill="#a7f3d0" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                        <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
                            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Failure Details</Typography>
                            {selectedRow ? (
                                <FailureCard
                                    item={testHistoryRowToGroupedItem(selectedRow, testName ?? "")}
                                    index={0}
                                    onImageClick={setImageSrc}
                                    onExpandLog={(lines, tName, label) => setLogModal({ lines, testName: tName, label })}
                                    testRailUrl={testRailUrl}
                                    areaName={areaName}
                                    testRailId={testName ? testRailIdFor(testName) : null}
                                    targetUnixTime={selectedRow.endingTimeUnix != null ? Math.round(selectedRow.endingTimeUnix / 1000) : null}
                                />
                            ) : (
                                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                    No failures in this window — nothing to show.
                                </Typography>
                            )}
                        </Paper>
                        {(() => {
                            const grouped = new Map<string, { row: TestHistoryRow; idx: number }[]>();
                            data.rows.forEach((row, idx) => {
                                const server = row.server ?? "Unknown";
                                if (!grouped.has(server)) grouped.set(server, []);
                                grouped.get(server)!.push({ row, idx });
                            });
                            return Array.from(grouped.entries()).map(([server, entries]) => (
                                <Box key={server} sx={{ mb: 3 }}>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", mb: 1.5, px: 1 }}>
                                        🖥️ {server}
                                    </Typography>
                                    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: "background.default" }}>
                                                    <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>Date</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Result</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Alma Version</TableCell>
                                                    <TableCell>Failure Text</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {entries.map(({ row: r, idx }) => {
                                                    const isSelected = selectedIndex === idx;
                                                    const clickable = !r.passed;
                                                    return (
                                                        <TableRow
                                                            key={idx}
                                                            onClick={() => { if (clickable) setSelectedIndex(idx); }}
                                                            sx={{
                                                                '&:last-child td': { borderBottom: 0 },
                                                                cursor: clickable ? "pointer" : "default",
                                                                borderLeft: isSelected ? "3px solid #c62828" : "3px solid transparent",
                                                                bgcolor: isSelected ? "rgba(198, 40, 40, 0.08)" : "transparent",
                                                                transition: "background-color 0.15s ease, border-color 0.15s ease",
                                                                "&:hover": clickable ? { bgcolor: isSelected ? "rgba(198, 40, 40, 0.08)" : "action.hover" } : undefined,
                                                            }}
                                                        >
                                                            <TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>
                                                                {formatDateOnly(r.testedOn) ?? "-"}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                {r.passed ? (
                                                                    <Box sx={{ color: "#2e7d32", fontWeight: 700 }}>PASS</Box>
                                                                ) : (
                                                                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "#c62828", fontWeight: isSelected ? 800 : 700, }}>
                                                                        FAIL
                                                                        <VisibilityIcon sx={{ fontSize: 15, opacity: isSelected ? 1 : 0.45 }} />
                                                                    </Box>
                                                                )}
                                                            </TableCell>
                                                            <TableCell sx={{ fontSize: 12 }}>{r.almaVersion ?? "-"}</TableCell>
                                                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word", maxWidth: 600 }}>{r.failureText ? extractFatalLine(r.failureText) : "-"}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                </Box>
                            ));
                        })()}
                        {imageSrc && <ImageModal src={imageSrc} onClose={() => setImageSrc(null)} />}
                        {logModal && (
                            <LogModal lines={logModal.lines} testName={logModal.testName} reasonLabel={logModal.label}
                                onClose={() => setLogModal(null)} />
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default TestHistoryPage;
