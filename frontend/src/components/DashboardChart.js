import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';

const DashboardChart = ({
  title,
  type = 'line',
  data = [],
  height = 300,
  gradient = false,
  colors = null,
  delay = 0
}) => {
  const theme = useTheme();

  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const chartColors = colors || defaultColors;

  const generateSampleData = () => {
    if (type === 'pie') {
      return [
        { name: 'Stocks', value: 45, color: chartColors[0] },
        { name: 'Bonds', value: 30, color: chartColors[1] },
        { name: 'Real Estate', value: 15, color: chartColors[2] },
        { name: 'Cash', value: 10, color: chartColors[3] }
      ];
    }
    
    return Array.from({ length: 12 }, (_, i) => ({
      name: `${i + 1}`,
      value: Math.floor(Math.random() * 100000) + 50000,
      value2: Math.floor(Math.random() * 80000) + 40000
    }));
  };

  const chartData = data.length > 0 ? data : generateSampleData();

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
            <XAxis 
              dataKey="name" 
              stroke={theme.palette.text.secondary}
              fontSize={12}
            />
            <YAxis 
              stroke={theme.palette.text.secondary}
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8,
                boxShadow: theme.shadows[4]
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColors[0]}
              strokeWidth={2}
              fill="url(#colorArea)"
              dot={{ fill: chartColors[0], strokeWidth: 2, r: 4 }}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
            <XAxis 
              dataKey="name" 
              stroke={theme.palette.text.secondary}
              fontSize={12}
            />
            <YAxis 
              stroke={theme.palette.text.secondary}
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8,
                boxShadow: theme.shadows[4]
              }}
            />
            <Bar 
              dataKey="value" 
              fill={chartColors[0]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || chartColors[index % chartColors.length]} 
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8,
                boxShadow: theme.shadows[4]
              }}
            />
          </PieChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
            <XAxis 
              dataKey="name" 
              stroke={theme.palette.text.secondary}
              fontSize={12}
            />
            <YAxis 
              stroke={theme.palette.text.secondary}
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8,
                boxShadow: theme.shadows[4]
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColors[0]}
              strokeWidth={3}
              dot={{ fill: chartColors[0], strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: chartColors[0] }}
            />
            {chartData[0]?.value2 && (
              <Line
                type="monotone"
                dataKey="value2"
                stroke={chartColors[1]}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: chartColors[1], strokeWidth: 2, r: 4 }}
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      <Card
        sx={{
          height: '100%',
          background: gradient 
            ? `linear-gradient(135deg, ${alpha(chartColors[0], 0.1)} 0%, ${alpha(chartColors[1] || chartColors[0], 0.05)} 100%)`
            : undefined,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[8],
          },
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mb: 3,
              color: theme.palette.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {title}
          </Typography>
          
          <Box sx={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardChart;