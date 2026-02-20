import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material';

interface AreaCardProps {
  areaName: string;
  displayName: string;
  passRate: number;
  total: number;
  passed: number;
  failed: number;
  lastRunDay?: string | null;
}

const AreaCard: React.FC<AreaCardProps> = ({
  areaName,
  displayName,
  passRate,
  total,
  passed,
  failed,
  lastRunDay,
}) => {
  const navigate = useNavigate();

  let statusColor = '#d32f2f';
  if (passRate > 80) statusColor = '#2e7d32';
  else if (passRate > 50) statusColor = '#ed6c02';

  const handleViewFailures = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/failures/${areaName}`);
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
            ⚠️ נפילות אחרונות
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