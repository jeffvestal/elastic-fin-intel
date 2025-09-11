import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Box,
  Chip,
  Grid,
  Pagination,
  Button,
  Container,
  Stack,
  Skeleton,
  alpha,
  IconButton,
  Fade
} from '@mui/material';
import { motion } from 'framer-motion';
import AssessmentIcon from '@mui/icons-material/Assessment';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DescriptionIcon from '@mui/icons-material/Description';
import FilterListIcon from '@mui/icons-material/FilterList';
import FullReportDialog from '../components/FullReportDialog';
import MetricCard from '../components/MetricCard';
import axios from 'axios';

const ReportsList = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState({ documentId: null, index: null });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get('http://localhost:8000/reports');
      setReports(response.data.reports);
    } catch (err) {
      console.log('Backend not available - reports page will show empty state for MCP demo');
      setReports([]); // Empty state for MCP demo
      setError(null); // Don't show error for demo
    } finally {
      setLoading(false);
    }
  };

  const handleReadFullReport = (documentId, index) => {
    setSelectedReport({ documentId, index });
    setReportDialogOpen(true);
  };

  const handleCloseReportDialog = () => {
    setReportDialogOpen(false);
    setSelectedReport({ documentId: null, index: null });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const filteredReports = React.useMemo(() => {
    return reports.filter(report =>
      (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.symbol || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.summary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.source || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  const paginatedReports = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredReports.slice(startIndex, endIndex);
  }, [filteredReports, currentPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const getUniqueSymbols = () => {
    return [...new Set(reports.map(r => r.symbol).filter(Boolean))];
  };

  const getUniqueSources = () => {
    return [...new Set(reports.map(r => r.source).filter(Boolean))];
  };

  const renderSkeletonCard = () => (
    <Card 
      sx={{ 
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main',
        background: (theme) => alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(10px)',
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="between" alignItems="flex-start" mb={2}>
          <Skeleton variant="text" width="60%" height={32} />
          <Box display="flex" gap={1}>
            <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 12 }} />
            <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 12 }} />
          </Box>
        </Box>
        <Skeleton variant="text" width="30%" height={16} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
        <Box display="flex" gap={1}>
          <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
        </Box>
      </CardContent>
    </Card>
  );

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Skeleton */}
          <Card 
            sx={{ 
              mb: 4,
              background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                <Skeleton variant="text" width={200} height={40} />
              </Box>
              <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
              <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
            </CardContent>
          </Card>

          {/* Metrics Skeleton */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[1, 2, 3, 4].map((index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card 
                  sx={{ 
                    background: (theme) => alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(10px)',
                    border: '1px solid',
                    borderColor: (theme) => alpha(theme.palette.divider, 0.1),
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                      <Skeleton variant="text" width={80} height={20} />
                    </Box>
                    <Skeleton variant="text" width={60} height={32} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width={100} height={16} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Reports Skeleton */}
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                {renderSkeletonCard()}
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Container>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          {process.env.NODE_ENV === 'development' && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Check browser console for detailed error information
            </Typography>
          )}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchReports();
          }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        <Card 
          sx={{ 
            mb: 4,
            background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            }
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Box display="flex" alignItems="center" mb={3}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    mr: 2,
                    boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  <AssessmentIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography 
                    variant="h3" 
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      background: (theme) => `linear-gradient(135deg, ${theme.palette.text.primary}, ${alpha(theme.palette.primary.main, 0.8)})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      mb: 0.5,
                    }}
                  >
                    Financial Reports
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Analysis and insights from market reports
                  </Typography>
                </Box>
              </Box>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search reports by title, symbol, content, or source..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      background: (theme) => alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(10px)',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                />
                <IconButton
                  sx={{
                    background: (theme) => alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      background: (theme) => alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <FilterListIcon />
                </IconButton>
              </Stack>

              <Box display="flex" alignItems="center" mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Total Reports: <strong>{reports.length}</strong> | Showing: <strong>{filteredReports.length}</strong>
                </Typography>
              </Box>
            </motion.div>
          </CardContent>
        </Card>

        {/* Metrics Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Reports"
                value={reports.length}
                icon={<DescriptionIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Unique Symbols"
                value={getUniqueSymbols().length}
                icon={<TrendingUpIcon />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Sources"
                value={getUniqueSources().length}
                icon={<AssessmentIcon />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Filtered Results"
                value={filteredReports.length}
                icon={<FilterListIcon />}
                color="info"
              />
            </Grid>
          </Grid>
        </motion.div>

        {/* Reports Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Grid container spacing={3}>
            {paginatedReports.map((report, index) => (
              <Grid item xs={12} md={6} lg={4} key={report.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      background: (theme) => alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(10px)',
                      border: '1px solid',
                      borderColor: (theme) => alpha(theme.palette.divider, 0.1),
                      borderRadius: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      },
                      '&:hover': {
                        borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                        boxShadow: (theme) => `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                        '& .MuiCardContent-root': {
                          background: (theme) => alpha(theme.palette.background.paper, 0.9),
                        }
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography 
                          variant="h6" 
                          component="h2" 
                          sx={{ 
                            flexGrow: 1, 
                            pr: 2,
                            fontWeight: 600,
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {report.title}
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap" sx={{ minWidth: 'fit-content' }}>
                          {report.symbol && (
                            <Chip 
                              label={report.symbol} 
                              size="small" 
                              color="primary"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          )}
                          {report.source && (
                            <Chip 
                              label={report.source} 
                              size="small" 
                              variant="outlined"
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.75rem',
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      {report.published_date && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            fontWeight: 500,
                            display: 'block',
                            mb: 1.5,
                          }}
                        >
                          Published: {formatDate(report.published_date)}
                        </Typography>
                      )}

                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          lineHeight: 1.6,
                          mb: 3,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {report.summary}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AssessmentIcon />}
                          onClick={() => handleReadFullReport(report.document_id, report.index)}
                          sx={{
                            borderRadius: 1.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2,
                            background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            '&:hover': {
                              background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)}, ${alpha(theme.palette.secondary.main, 0.8)})`,
                              transform: 'translateY(-1px)',
                            },
                          }}
                        >
                          Full Report
                        </Button>
                        
                        {report.url && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<OpenInNewIcon />}
                            href={report.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              borderRadius: 1.5,
                              textTransform: 'none',
                              fontWeight: 600,
                              px: 2,
                              borderColor: (theme) => alpha(theme.palette.text.secondary, 0.3),
                              color: 'text.secondary',
                              '&:hover': {
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            Source
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Empty State */}
        {filteredReports.length === 0 && searchTerm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card 
              sx={{ 
                mt: 4,
                background: (theme) => alpha(theme.palette.background.paper, 0.5),
                backdropFilter: 'blur(10px)',
                border: '1px dashed',
                borderColor: (theme) => alpha(theme.palette.text.secondary, 0.3),
              }}
            >
              <CardContent sx={{ py: 6, textAlign: 'center' }}>
                <DescriptionIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'text.secondary', 
                    mb: 2,
                    opacity: 0.5,
                  }} 
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No reports found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No financial reports match your search for <strong>"{searchTerm}"</strong>
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {filteredReports.length === 0 && !searchTerm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card 
              sx={{ 
                mt: 4,
                background: (theme) => alpha(theme.palette.background.paper, 0.5),
                backdropFilter: 'blur(10px)',
                border: '1px dashed',
                borderColor: (theme) => alpha(theme.palette.text.secondary, 0.3),
              }}
            >
              <CardContent sx={{ py: 6, textAlign: 'center' }}>
                <AssessmentIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'text.secondary', 
                    mb: 2,
                    opacity: 0.5,
                  }} 
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No reports available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Financial reports will appear here when data is available
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Card 
              sx={{ 
                mt: 4,
                background: (theme) => alpha(theme.palette.background.paper, 0.7),
                backdropFilter: 'blur(10px)',
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.divider, 0.1),
              }}
            >
              <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      borderRadius: 2,
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                      },
                      '&.Mui-selected': {
                        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        color: 'white',
                        '&:hover': {
                          background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)}, ${alpha(theme.palette.secondary.main, 0.8)})`,
                        },
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

      {/* Full Report Dialog */}
      <FullReportDialog
        open={reportDialogOpen}
        onClose={handleCloseReportDialog}
        documentId={selectedReport.documentId}
        index={selectedReport.index}
      />
      </motion.div>
    </Container>
  );
};

export default ReportsList;