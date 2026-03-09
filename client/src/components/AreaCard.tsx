import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { EnvFilter } from '../services/apiService';
import type { HealthBuckets } from '../types/Dashboard';
import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material';

interface AreaCardProps {
  areaName: string;
  displayName: string;
  passRate: number;
  total: number;
  passed: number;
  failed: number;
  lastRunDay?: string | null;
  env?: EnvFilter;
  health?: HealthBuckets;
}

const AreaCard: React.FC<AreaCardProps> = ({
  areaName,
  displayName,
  passRate,
  total,
  passed,
  failed,
  lastRunDay,
  env = "qa",
  health,
}) => {
  const navigate = useNavigate();

  let statusColor = '#d32f2f';
  if (passRate > 80) statusColor = '#2e7d32';
  else if (passRate > 50) statusColor = '#ed6c02';


  const handleViewFailures = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/failures/${areaName}?env=${env}`);
  };

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        borderTop: `4px solid ${statusColor}`,
        boxShadow: 2,
        '&:hover': { boxShadow: 6, cursor: 'pointer' },
      }}
      data-area={areaName}
    >
      <CardContent>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {displayName}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h3" sx={{ color: statusColor, fontWeight: 'bold' }}>
            {passRate}%
          </Typography>

          <Box textAlign="right">
            <Typography variant="caption" display="block" color="text.secondary">
              Tests
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {total}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            label={`${passed} Passed`}
            size="small"
            sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontSize: '0.7rem' }}
          />
          <Chip
            label={`${failed} Failed`}
            size="small"
            sx={{ bgcolor: '#ffebee', color: '#c62828', fontSize: '0.7rem' }}
          />
        </Box>

        {health && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1.5 }}>
            {([
              { bucket: 'healthy', color: '#2e7d32', count: health.healthy },
              { bucket: 'medium',  color: '#ed6c02', count: health.medium  },
              { bucket: 'bad',     color: '#c62828', count: health.bad     },
              { bucket: 'dead',    color: '#757575', count: health.dead    },
            ] as const).map(({ bucket, color, count }) => (
              <Box
                key={bucket}
                onClick={(e) => { e.stopPropagation(); navigate(`/health/${areaName}/${bucket}?env=${env}`); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  cursor: 'pointer',
                  '&:hover .bucket-label': { textDecoration: 'underline', color },
                }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                <Typography
                  className="bucket-label"
                  variant="caption"
                  color="text.secondary"
                  sx={{ transition: 'color 0.15s' }}
                >
                  {bucket.charAt(0).toUpperCase() + bucket.slice(1)}: {count}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {failed > 0 && (
          <Button
            size="small"
            variant="text"
            onClick={handleViewFailures}
            sx={{
              color: '#c62828',
              fontSize: '0.72rem',
              textTransform: 'none',
              p: 0,
              minWidth: 0,
              '&:hover': { textDecoration: 'underline', bgcolor: 'transparent' },
            }}
          >
            ⚠️ Recent Failures
          </Button>
        )}

        <Typography
          variant="caption"
          sx={{ position: 'absolute', bottom: 10, right: 15, color: '#999' }}
        >
          {lastRunDay ?? ''}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AreaCard;