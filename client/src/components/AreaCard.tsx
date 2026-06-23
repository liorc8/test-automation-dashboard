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
  env?: EnvFilter;
  health?: HealthBuckets;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  trendData?: DailyTrendPoint[];
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
  trendData: trendDataProp,
}) => {
  const navigate = useNavigate();
  const [fetchedTrend, setFetchedTrend] = useState<DailyTrendPoint[]>([]);

  useEffect(() => {
    if (trendDataProp && trendDataProp.length > 0) return;
    let cancelled = false;
    getAreaDailyTrend(areaName, 8, env)
      .then(r => { if (!cancelled) setFetchedTrend(r.points); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [areaName, env, trendDataProp]);

  const trendData = (trendDataProp && trendDataProp.length > 0) ? trendDataProp : fetchedTrend;

  // Show the EXACT pass rate of the latest day — matching the right-most plotted
  // point in the trend chart (same ascending-date sort + rounding it uses).
  const sortedTrend = [...trendData].sort((a, b) => a.date.localeCompare(b.date));
  const latestDay = [...sortedTrend].reverse().find((p) => p.total > 0) ?? null;
  const displayRate = latestDay
    ? Math.round((latestDay.passed / latestDay.total) * 100)
    : passRate;

  let statusColor = '#d32f2f';
  if (displayRate > 80) statusColor = '#2e7d32';
  else if (displayRate > 50) statusColor = '#ed6c02';

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
            {displayRate}%
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
              { bucket: 'healthy', color: '#2e7d32', count: health.healthy, tip: 'Healthy: pass rate ≥ 80%' },
              { bucket: 'medium',  color: '#ed6c02', count: health.medium,  tip: 'Medium: pass rate 20–79%' },
              { bucket: 'bad',     color: '#c62828', count: health.bad,      tip: 'Bad: pass rate 1–19%' },
              { bucket: 'dead',    color: '#757575', count: health.dead,     tip: 'Dead: test not pass' },
            ] as const).map(({ bucket, color, count, tip }) => (
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
                <Tooltip
                  title={tip}
                  arrow
                  placement="top"
                  slotProps={{
                    tooltip: {
                      sx: {
                        bgcolor: '#1e293b',
                        color: '#e2e8f0',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        border: '1px solid #334155',
                        borderRadius: 1.5,
                        px: 1.25,
                        py: 0.75,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                      },
                    },
                    arrow: { sx: { color: '#1e293b', '&::before': { border: '1px solid #334155' } } },
                  }}
                >
                  <Typography
                    className="bucket-label"
                    variant="caption"
                    color="text.secondary"
                    sx={{ transition: 'color 0.15s' }}
                  >
                    {bucket.charAt(0).toUpperCase() + bucket.slice(1)}: {count}
                  </Typography>
                </Tooltip>
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