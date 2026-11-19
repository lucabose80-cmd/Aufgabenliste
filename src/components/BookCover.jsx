import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MenuBookIcon from '@mui/icons-material/MenuBook';

const BookCover = ({ coverUrl, title, width = 48, height = 70, borderRadius = '10px', sx = {} }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [coverUrl]);

  if (coverUrl && !imgError) {
    return (
      <Box
        component="img"
        src={coverUrl}
        alt={title || 'Buchcover'}
        loading="lazy"
        onError={() => setImgError(true)}
        sx={{
          width,
          height,
          borderRadius,
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
          bgcolor: 'background.paper',
          display: 'block',
          ...sx,
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width,
        height,
        borderRadius,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.08),
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, isDark ? 0.22 : 0.14),
        color: 'primary.main',
        ...sx,
      }}
    >
      <MenuBookIcon sx={{ fontSize: Math.max(16, Math.round(width * 0.42)), opacity: 0.7 }} />
    </Box>
  );
};

export default BookCover;
