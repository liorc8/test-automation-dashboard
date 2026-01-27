import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { Grid } from '@mui/material'

import AreaCard from '../components/AreaCard';


const AREAS = [
  { id: 'PRM', name: 'PRM' },
  { id: 'ERM', name: 'ERM' },
  { id: 'FULFILLMENT', name: 'FULFILLMENT' },
  { id: 'ACQ', name: 'Acquisition' },
  { id: 'RSH', name: 'Resource Sharing' },
  { id: 'API', name: 'API' },
];

const DashboardPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ marginTop: 4, marginBottom: 4 }}>
      {/* כותרת הדף */}
      <Box sx={{ marginBottom: 4, borderBottom: '1px solid #eee', pb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
          Automation Status Overview
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Real-time status of all Alma testing areas
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {AREAS.map((area) => (
          <Grid key={area.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <AreaCard areaName={area.id} displayName={area.name} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default DashboardPage;