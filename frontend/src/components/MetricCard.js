import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  alpha,
  useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useDemoMode } from '../contexts/DemoModeContext';
import MiniChart from './MiniChart';

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  trendValue, 
  onClick,
  gradient,
  delay = 0,
  chartData = [],
  chartType = 'line',
  showChart = true
}) => {
  const theme = useTheme();
  const { isDemoMode } = useDemoMode();


  const getTrendColor = () => {
    if (!trend) return theme.palette.text.secondary;
    return trend === 'up' ? theme.palette.success.main : theme.palette.error.main;
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend === 'up' ? '↗' : '↘';
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
      whileHover={{ y: -4 }}
      style={{ height: '100%' }}
    >
      <Card
        onClick={onClick}
        sx={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'hidden',
          background: gradient 
            ? `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`
            : undefined,
          '&:hover': {
            transform: onClick ? 'translateY(-2px)' : 'none',
            boxShadow: theme.shadows[6],
          },
          '&::before': gradient ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.palette.mode === 'dark' 
              ? 'rgba(0, 0, 0, 0.2)' 
              : 'rgba(255, 255, 255, 0.1)',
            zIndex: 1,
          } : {},
        }}
      >
        <CardContent
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 2,
            p: isDemoMode ? 3 : 2.5,
          }}
        >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            mb: 2
          }}>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: gradient 
                  ? theme.palette.common.white 
                  : theme.palette.text.secondary,
                fontSize: isDemoMode ? '0.8rem' : '0.75rem',
              }}
            >
              {title}
            </Typography>
            {icon && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: isDemoMode ? 12 : 8,
                  backgroundColor: gradient
                    ? alpha(theme.palette.common.white, 0.2)
                    : alpha(theme.palette.primary.main, 0.1),
                  color: gradient
                    ? theme.palette.common.white
                    : theme.palette.primary.main,
                }}
              >
                {icon}
              </Box>
            )}
          </Box>

          {/* Value */}
          <Box sx={{ mb: 1, flexGrow: 1 }}>
            <Typography
              variant="h3"
              component="div"
              className="count-up"
              sx={{
                fontWeight: 700,
                fontSize: isDemoMode ? '2.5rem' : '2rem',
                lineHeight: 1.1,
                color: gradient 
                  ? theme.palette.common.white 
                  : theme.palette.text.primary,
                mb: 0.5,
              }}
            >
              {title.toLowerCase().includes('aum') && '$'}
              <CountUp
                end={typeof value === 'number' ? value : 0}
                duration={2}
                delay={delay}
                separator=","
                preserveValue
              />
            </Typography>
            
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: gradient 
                    ? alpha(theme.palette.common.white, 0.8)
                    : theme.palette.text.secondary,
                  fontSize: isDemoMode ? '1rem' : '0.875rem',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {/* Chart */}
          {showChart && !isDemoMode && (
            <Box sx={{ 
              mt: 2, 
              mb: 2,
              height: 60,
              opacity: 0.8
            }}>
              <MiniChart
                data={chartData}
                type={chartType}
                color={gradient ? theme.palette.common.white : theme.palette.primary.main}
                height={60}
                strokeWidth={gradient ? 1.5 : 2}
              />
            </Box>
          )}

          {/* Trend */}
          {(trend || trendValue) && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              pt: 1,
              borderTop: `1px solid ${
                gradient 
                  ? alpha(theme.palette.common.white, 0.2)
                  : theme.palette.divider
              }`,
            }}>
              {trend && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: gradient ? theme.palette.common.white : getTrendColor(),
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <span style={{ fontSize: '1.2em' }}>{getTrendIcon()}</span>
                    {trendValue}
                  </Typography>
                </Box>
              )}
              
              <Typography
                variant="caption"
                sx={{
                  color: gradient 
                    ? alpha(theme.palette.common.white, 0.7)
                    : theme.palette.text.secondary,
                  fontSize: isDemoMode ? '0.8rem' : '0.7rem',
                }}
              >
                Last 30 days
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MetricCard;