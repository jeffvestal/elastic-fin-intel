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
  InputAdornment,
  IconButton,
  Skeleton,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArticleIcon from '@mui/icons-material/Article';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { motion, AnimatePresence } from 'framer-motion';
import MetricCard from '../components/MetricCard';
import PageTransition from '../components/PageTransition';
import FullArticleDialog from '../components/FullArticleDialog';
import axios from 'axios';

const NewsList = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState({ documentId: null, index: null });
  const itemsPerPage = 9;
  const theme = useTheme();

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await axios.get('http://localhost:8000/news');
      setNews(response.data.news);
    } catch (err) {
      console.log('Backend not available - news page will show empty state for MCP demo');
      setNews([]); // Empty state for MCP demo
      setError(null); // Don't show error for demo
    } finally {
      setLoading(false);
    }
  };

  const handleReadFullArticle = (documentId, index) => {
    setSelectedArticle({ documentId, index });
    setArticleDialogOpen(true);
  };

  const handleCloseArticleDialog = () => {
    setArticleDialogOpen(false);
    setSelectedArticle({ documentId: null, index: null });
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

  const filteredNews = React.useMemo(() => {
    return news.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.source.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [news, searchTerm]);

  const paginatedNews = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredNews.slice(startIndex, endIndex);
  }, [filteredNews, currentPage]);

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const renderSkeleton = () => (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="30%" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="60%" height={30} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 2 }} />
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[...Array(3)].map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="80%" height={30} />
                <Skeleton variant="text" width="60%" height={40} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="40%" height={20} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        {[...Array(9)].map((_, i) => (
          <Grid item xs={12} md={6} lg={4} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="100%" height={30} />
                <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={120} sx={{ mt: 2, borderRadius: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );

  if (loading) {
    return renderSkeleton();
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const uniqueSources = [...new Set(news.map(article => article.source))].filter(Boolean);
  const totalViews = news.length * 127; // Simulated view count

  return (
    <PageTransition>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ mb: 4 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Box
                sx={{
                  p: 1.5,
                  mr: 2,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <NewspaperIcon sx={{ fontSize: '2rem' }} />
              </Box>
              <Box>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent'
                  }}
                >
                  Financial News
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Latest market insights and financial updates
                </Typography>
              </Box>
            </Box>

            {/* Search */}
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search articles by title, symbol, content, or source..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClearSearch} edge="end" size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: theme.palette.background.paper,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.04),
                  },
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: theme.shadows[2],
                  },
                  '&.Mui-focused': {
                    boxShadow: theme.shadows[4],
                  },
                },
              }}
            />
          </Box>
        </motion.div>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Articles"
              value={news.length}
              subtitle="Available stories"
              icon={<ArticleIcon />}
              trend={news.length > 0 ? 'up' : null}
              trendValue="+24 today"
              gradient={[theme.palette.info.main, theme.palette.info.light]}
              delay={0.1}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Filtered Results"
              value={filteredNews.length}
              subtitle="Matching search"
              icon={<SearchIcon />}
              trend="up"
              trendValue={`${Math.round((filteredNews.length / Math.max(news.length, 1)) * 100)}%`}
              gradient={[theme.palette.primary.main, theme.palette.primary.light]}
              delay={0.2}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="News Sources"
              value={uniqueSources.length}
              subtitle="Active publishers"
              icon={<NewspaperIcon />}
              trend="up"
              trendValue="+3 new"
              gradient={[theme.palette.success.main, theme.palette.success.light]}
              delay={0.3}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Views"
              value={totalViews}
              subtitle="Across all articles"
              icon={<VisibilityIcon />}
              trend="up"
              trendValue="+12.5%"
              gradient={[theme.palette.warning.main, theme.palette.warning.light]}
              delay={0.4}
            />
          </Grid>
        </Grid>

        {/* News Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Grid container spacing={3}>
            <AnimatePresence>
              {paginatedNews.map((article, index) => (
                <Grid item xs={12} md={6} lg={4} key={article.id || index}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${theme.palette.info.main}`,
                        overflow: 'hidden',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          boxShadow: theme.shadows[8],
                          borderLeftWidth: '6px',
                          transform: 'translateY(-2px)',
                        },
                      }}
                      onClick={() => handleReadFullArticle(article.document_id, article.index)}
                    >
                      <Box
                        sx={
                          {
                            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                            p: 3,
                            pb: 2
                          }
                        }
                      >
                        {/* Header with chips */}
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box sx={{ flexGrow: 1, pr: 2 }}>
                            <Typography
                              variant="h6"
                              component="h2"
                              sx={{
                                fontWeight: 600,
                                mb: 1,
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {article.title || 'Untitled Article'}
                            </Typography>
                          </Box>
                          <Box display="flex" flexDirection="column" gap={0.5} alignItems="flex-end">
                            {article.symbol && (
                              <Chip
                                label={article.symbol}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                                  color: theme.palette.success.main,
                                  fontWeight: 600,
                                  fontSize: '0.75rem'
                                }}
                              />
                            )}
                            {article.source && (
                              <Chip
                                label={article.source}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Date */}
                        {article.published_date && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              mb: 2,
                              fontWeight: 500
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: theme.palette.info.main
                              }}
                            />
                            {formatDate(article.published_date)}
                          </Typography>
                        )}
                      </Box>

                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Summary */}
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 3,
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            flexGrow: 1
                          }}
                        >
                          {article.summary || 'No summary available for this article.'}
                        </Typography>

                        {/* Actions */}
                        <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 'auto' }}>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<ArticleIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReadFullArticle(article.document_id, article.index);
                              }}
                              sx={{
                                background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
                                fontWeight: 600,
                                textTransform: 'none'
                              }}
                            >
                              Read Article
                            </Button>
                          </motion.div>

                          {article.url && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<OpenInNewIcon />}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  textTransform: 'none',
                                  borderColor: theme.palette.info.main,
                                  color: theme.palette.info.main,
                                  '&:hover': {
                                    borderColor: theme.palette.info.dark,
                                    backgroundColor: alpha(theme.palette.info.main, 0.04)
                                  }
                                }}
                              >
                                Source
                              </Button>
                            </motion.div>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>
        </motion.div>

        {/* Empty State */}
        {filteredNews.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ mt: 4, textAlign: 'center', py: 8 }}>
              <CardContent>
                <NewspaperIcon
                  sx={{
                    fontSize: '4rem',
                    color: theme.palette.action.disabled,
                    mb: 2
                  }}
                />
                <Typography variant="h5" gutterBottom color="text.secondary">
                  {searchTerm ? `No articles found matching "${searchTerm}"` : 'No news articles available'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {searchTerm
                    ? 'Try adjusting your search criteria or clear the search to see all articles.'
                    : 'This page will show financial news when connected to Elasticsearch via MCP tools.'}
                </Typography>
                {searchTerm && (
                  <Box sx={{ mt: 3 }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClearSearch}
                      style={{
                        background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Clear Search
                    </motion.button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                size="large"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontWeight: 600,
                  },
                  '& .MuiPaginationItem-root.Mui-selected': {
                    background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
                  }
                }}
                showFirstButton
                showLastButton
              />
            </Box>
          </motion.div>
        )}

        {/* Full Article Dialog */}
        <FullArticleDialog
          open={articleDialogOpen}
          onClose={handleCloseArticleDialog}
          documentId={selectedArticle.documentId}
          index={selectedArticle.index}
        />
      </Container>
    </PageTransition>
  );
};

export default NewsList;