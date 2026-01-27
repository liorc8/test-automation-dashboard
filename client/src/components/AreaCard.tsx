import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Chip } from '@mui/material';
import { getAreaSummary } from '../services/apiService';
import type { AreaSummaryResponse } from '../types/AreaSummary';

interface AreaCardProps {
  areaName: string;
  displayName: string;
}

const AreaCard: React.FC<AreaCardProps> = ({ areaName, displayName }) => {
  const [data, setData] = useState<AreaSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getAreaSummary(areaName).then(setData).catch((err) => {
        console.error(`Failed to load ${areaName}`, err);
        setLoading(false);
    }).finally(() => setLoading(false));
  }, [areaName]);

  if (loading) {
    return (
      <Card sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={20} />
      </Card>
    );
  }

  if (!data) return <Card sx={{ height: 180, p: 2 }}>Error loading {displayName}</Card>;


  const passRate = data.totals.passRate;
  let statusColor = '#d32f2f';
  if (passRate > 90) statusColor = '#2e7d32';
  else if (passRate > 75) statusColor = '#ed6c02';

  return (
    <Card sx={{ height: '100%', position: 'relative', borderTop: `4px solid ${statusColor}`, boxShadow: 2, '&:hover': { boxShadow: 6, cursor: 'pointer' } }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {displayName}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h3" sx={{ color: statusColor, fontWeight: 'bold' }}>
                {passRate}%
            </Typography>
            <Box textAlign="right">
                <Typography variant="caption" display="block" color="text.secondary">Tests</Typography>
                <Typography variant="body1" fontWeight="bold">{data.totals.total}</Typography>
            </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`${data.totals.passed} Passed`} size="small" sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontSize: '0.7rem' }} />
            <Chip label={`${data.totals.failed} Failed`} size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', fontSize: '0.7rem' }} />
        </Box>
        
        <Typography variant="caption" sx={{ position: 'absolute', bottom: 10, right: 15, color: '#999' }}>
            {data.lastRun.testedOn?.split(' ')[0]}
        </Typography>

      </CardContent>
    </Card>
  );
};

export default AreaCard;