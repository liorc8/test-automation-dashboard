import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import { getAreaRecentFailuresGrouped } from "../services/apiService";
import type { AreaRecentFailuresGroupedResponse } from "../types/RecentFailuresGrouped";

const WINDOW_DAYS = 10;

const RecentFailuresPage: React.FC = () => {
  const { areaName } = useParams<{ areaName: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AreaRecentFailuresGroupedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!areaName) return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getAreaRecentFailuresGrouped(areaName, WINDOW_DAYS);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load failures");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [areaName]);

  return (
    <Container maxWidth={false} disableGutters sx={{ px: 3, py: 3 }}>

      <Button
        variant="text"
        onClick={() => navigate("/")}
        sx={{ mb: 2, textTransform: "none" }}
      >
        ← חזרה לדאשבורד
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          נפילות אחרונות – {areaName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {WINDOW_DAYS} ימים אחרונים
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            טוען נפילות...
          </Typography>
        </Box>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && data?.items.length === 0 && (
        <Alert severity="success">לא נמצאו נפילות ב-{WINDOW_DAYS} הימים האחרונים 🎉</Alert>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            סה"כ {data.items.length} טסטים שנפלו
          </Typography>

          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>שם הטסט</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">כמות נפילות</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>נפילה אחרונה</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>סיבות</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>סרבר</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>לינקים</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.items.map((item, index) => (
                  <TableRow
                    key={item.testName}
                    sx={{
                      bgcolor: index % 2 === 0 ? "#ffffff" : "#fafafa",
                      "&:hover": { bgcolor: "#fff3e0" },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: "medium", fontSize: "0.8rem" }}>
                        {item.testName}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={item.failCount}
                        size="small"
                        sx={{ bgcolor: "#ffebee", color: "#c62828", fontWeight: "bold" }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {item.lastFailedOn ?? "-"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 400 }}>
                      {item.reasons.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          {item.reasons.map((reason, i) => (
                            <Typography
                              key={i}
                              variant="caption"
                              sx={{
                                bgcolor: "#fff8e1",
                                px: 1,
                                py: 0.3,
                                borderRadius: 1,
                                display: "block",
                                fontSize: "0.7rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 380,
                              }}
                              title={reason}
                            >
                              {i + 1}. {reason}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {item.lastFailure.server ?? "-"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {item.lastFailure.logLink && (
                          <a
                            href={item.lastFailure.logLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.75rem", color: "#1976d2" }}
                          >
                            Log
                          </a>
                        )}
                        {item.lastFailure.screenshotLink && (
                          <a
                            href={item.lastFailure.screenshotLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.75rem", color: "#1976d2" }}
                          >
                            Screenshot
                          </a>
                        )}
                        {!item.lastFailure.logLink && !item.lastFailure.screenshotLink && (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </Box>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Container>
  );
};

export default RecentFailuresPage;