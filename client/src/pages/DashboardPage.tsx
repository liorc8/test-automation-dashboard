import React, { useEffect, useState } from "react";
import { Container, Typography, Box, Alert, CircularProgress } from "@mui/material";
import { Grid } from "@mui/material";

import AreaCard from "../components/AreaCard";
import { getAreas } from "../services/apiService";
import type { AreaItem } from "../types/Area";

const DashboardPage: React.FC = () => {
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadAreas = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getAreas();
        setAreas(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load areas");
      } finally {
        setLoading(false);
      }
    };

    loadAreas();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ marginTop: 4, marginBottom: 4 }}>
      {/* Page header */}
      <Box sx={{ marginBottom: 4, borderBottom: "1px solid #eee", pb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", color: "#2c3e50" }}>
          Automation Status Overview
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Real-time status of all Alma testing areas
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <Grid container spacing={3}>
          {areas.map((area) => (
            <Grid key={area.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <AreaCard areaName={area.id} displayName={area.name} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default DashboardPage;
