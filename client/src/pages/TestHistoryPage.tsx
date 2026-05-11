import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Box, Typography, Button, Paper, Table, TableHead, TableBody, TableRow, TableCell, LinearProgress, CircularProgress, Alert } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getTestHistory } from "../services/apiService";
import type { TestHistoryResponse, TestHistoryRow } from "../types/TestHistory";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function dateOnly(value: string | null | undefined): string | null {
    if (!value) return null;
    return value.split("T")[0].split(" ")[0];
}

const TestHistoryPage: React.FC = () => {
    const { areaName, testName } = useParams<{ areaName: string; testName: string }>();
    const [searchParams] = useSearchParams();
    const env = (searchParams.get("env") ?? "qa") as "qa" | "release" | "sandbox";
    const daysBack = Number(searchParams.get("daysBack") ?? 30);
    const navigate = useNavigate();

    const [data, setData] = useState<TestHistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!areaName || !testName) return;
        setLoading(true);
        setError("");
        getTestHistory(areaName, testName, env, daysBack)
            .then(setData)
            .catch((e) => setError(e instanceof Error ? e.message : String(e)))
            .finally(() => setLoading(false));
    }, [areaName, testName, env, daysBack]);

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
        <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>
            <Box component="header" sx={{ bgcolor: "#fff", borderBottom: "1px solid #e5e7eb", px: 4, py: 1.5, display: "flex", alignItems: "center", gap: 2, position: "sticky", top: 0, zIndex: 100 }}>
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
                                    <AreaChart data={chartPoints} margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip
                                            contentStyle={{ bgcolor: "#0f172a", border: "1px solid #334155", borderRadius: 6 }}
                                            labelStyle={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}
                                            formatter={(value) => [`${value}%`, "Pass Rate"]}
                                        />
                                        <Area type="monotone" dataKey="passRate" stroke="#2e7d32" fill="#a7f3d0" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>

                        {(() => {
                            const grouped = new Map<string, TestHistoryRow[]>();
                            for (const row of data.rows) {
                                const server = row.server ?? "Unknown";
                                if (!grouped.has(server)) grouped.set(server, []);
                                grouped.get(server)!.push(row);
                            }
                            return Array.from(grouped.entries()).map(([server, rows]) => (
                                <Box key={server} sx={{ mb: 3 }}>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0f172a", mb: 1.5, px: 1 }}>
                                        🖥️ {server}
                                    </Typography>
                                    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                                    <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>Date</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Result</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Alma Version</TableCell>
                                                    <TableCell>Failure Text</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {rows.map((r: TestHistoryRow, i: number) => (
                                                    <TableRow key={i} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                                        <TableCell sx={{ fontSize: 13 }}>{dateOnly(r.testedOn) ?? "-"}</TableCell>
                                                        <TableCell align="center">{r.passed ? <Box sx={{ color: "#2e7d32", fontWeight: 700 }}>PASS</Box> : <Box sx={{ color: "#c62828", fontWeight: 700 }}>FAIL</Box>}</TableCell>
                                                        <TableCell sx={{ fontSize: 12 }}>{r.almaVersion ?? "-"}</TableCell>
                                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{r.failureText ? r.failureText.slice(0, 350) : "-"}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                </Box>
                            ));
                        })()}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default TestHistoryPage;
