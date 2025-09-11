import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';

const LoadingScreen = ({ message = 'Loading...', progress = null }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.success.main} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ textAlign: 'center' }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: 'white',
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
              mb: 1,
              fontSize: { xs: '2.5rem', md: '3.5rem' }
            }}
          >
            Elastic Fin-Intel
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 300,
              letterSpacing: '0.1em'
            }}
          >
            AI-Powered Financial Intelligence
          </Typography>
        </Box>

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ marginBottom: '2rem' }}
        >
          <CircularProgress
            size={80}
            thickness={2}
            sx={{
              color: 'white',
              filter: 'drop-shadow(0 4px 20px rgba(255,255,255,0.3))'
            }}
          />
        </motion.div>

        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.8)',
            mb: 3,
            fontSize: '1.1rem'
          }}
        >
          {message}
        </Typography>

        {progress !== null && (
          <Box sx={{ width: 300, mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: 'white',
                  boxShadow: '0 0 20px rgba(255,255,255,0.5)'
                }
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                mt: 1,
                display: 'block'
              }}
            >
              {Math.round(progress)}% Complete
            </Typography>
          </Box>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: '2rem',
          textAlign: 'center'
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.875rem'
          }}
        >
          Powered by Elastic Search & AI
        </Typography>
      </motion.div>
    </Box>
  );
};

export default LoadingScreen;