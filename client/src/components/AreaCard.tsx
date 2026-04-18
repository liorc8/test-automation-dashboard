import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EnvFilter, DailyTrendPoint } from '../services/apiService';
import { getAreaDailyTrend } from '../services/apiService';
import type { HealthBuckets } from '../types/Dashboard';
import { Card, CardContent, Typography, Box, Chip, Button, IconButton, Tooltip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import AreaTrendChart from './AreaTrendChart';

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
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const AreaCard: React.FC<AreaCardProps> = ({
  areaName,
  displayName,
  passRate,
  total,
  passed,
  failed,
  env = "qa",
  health,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const navigate = useNavigate();
  const [trendData, setTrendData] = useState<DailyTrendPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAreaDailyTrend(areaName, 8, env)
      .then(r => { if (!cancelled) setTrendData(r.points); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [areaName, env]);

  let statusColor = '#d32f2f';
  if (passRate > 80) statusColor = '#2e7d32';
  else if (passRate > 50) statusColor = '#ed6c02';

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        borderTop: `4px solid ${statusColor}`,
        boxShadow: 2,
        '&:hover': { boxShadow: 6 },
      }}
      data-area={areaName}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {displayName}
          </Typography>
          <Tooltip title={isFavorite ? 'Remove from My Areas' : 'Add to My Areas'}>
            <IconButton
              size="small"
              aria-label={isFavorite ? 'Remove from My Areas' : 'Add to My Areas'}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
              sx={{ color: isFavorite ? '#f59e0b' : '#9e9e9e', transition: 'color 0.2s', ml: 0.5 }}
            >
              {isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

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

        <Box sx={{ display: 'flex', gap: 1, mb: 0 }}>
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

        {failed > 0 ? (
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            size="small"
            startIcon={<ManageSearchIcon fontSize="small" />}
            onClick={(e) => { e.stopPropagation(); navigate(`/failures/${areaName}?env=${env}`); }}
            sx={{ my: 1.5, textTransform: 'none' }}
          >
            View Recent Failures
          </Button>
        ) : (
          <Button
            variant="outlined"
            fullWidth
            size="small"
            disabled
            sx={{ my: 1.5, textTransform: 'none' }}
          >
            No Recent Failures
          </Button>
        )}

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

        <AreaTrendChart data={trendData} />



      </CardContent>
    </Card>
  );
};

export default AreaCard;