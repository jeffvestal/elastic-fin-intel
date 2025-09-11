import React from 'react';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { useTheme, alpha } from '@mui/material';

const MiniChart = ({ 
  data = [], 
  type = 'line', 
  color,
  height = 60,
  strokeWidth = 2 
}) => {
  const theme = useTheme();
  
  const chartColor = color || theme.palette.primary.main;
  
  const generateSampleData = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: Math.floor(Math.random() * 100) + 50 + (i * 2),
      name: `Month ${i + 1}`
    }));
  };

  const chartData = data.length > 0 ? data : generateSampleData();

  const commonProps = {
    width: '100%',
    height,
    data: chartData,
  };

  if (type === 'area') {
    return (
      <ResponsiveContainer {...commonProps}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${chartColor}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={chartColor} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={strokeWidth}
            fill={`url(#gradient-${chartColor})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer {...commonProps}>
        <BarChart data={chartData}>
          <Bar 
            dataKey="value" 
            fill={alpha(chartColor, 0.7)}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer {...commonProps}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={chartColor}
          strokeWidth={strokeWidth}
          dot={false}
          activeDot={{ r: 4, fill: chartColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MiniChart;