import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface StatCardProps {
  title: string;
  value: number | string;
  type?: 'success' | 'danger' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, type = 'neutral' }) => {
  let color = '#1976d2';
  if (type === 'success') color = '#2e7d32';
  if (type === 'danger') color = '#d32f2f';

  return (
    <Card sx={{ height: '100%', borderLeft: `6px solid ${color}`, boxShadow: 3 }}>
      <CardContent sx={{ textAlign: 'center' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#333' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default StatCard;