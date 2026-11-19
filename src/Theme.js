import { createTheme, alpha } from '@mui/material/styles';

const getDesignTokens = (mode, accentColor) => {
  const isDark = mode === 'dark';
  const primaryMain = accentColor || (isDark ? '#8AB4F8' : '#1A73E8');

  const bgDefault = isDark ? '#131314' : '#F0F4F9';
  const bgPaper = isDark ? '#1E1F20' : '#FFFFFF';
  const surfaceVariant = isDark ? '#282A2C' : '#E9EEF6';
  const textPrimary = isDark ? '#E3E3E3' : '#1F1F1F';
  const textSecondary = isDark ? '#9AA0A6' : '#5F6368';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(31, 31, 31, 0.08)';

  return {
    palette: {
      mode,
      primary: {
        main: primaryMain,
      },
      secondary: {
        main: isDark ? '#A8C7FA' : '#0B57D0',
      },
      success: {
        main: isDark ? '#81C995' : '#1E8E3E',
      },
      warning: {
        main: isDark ? '#FDD663' : '#E37400',
      },
      error: {
        main: isDark ? '#F28B82' : '#D93025',
      },
      background: {
        default: bgDefault,
        paper: bgPaper,
        surfaceVariant,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: dividerColor,
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
        fontSize: '2.25rem',
        fontWeight: 600,
        letterSpacing: '-0.025em',
      },
      h2: {
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
        fontSize: '1.75rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h3: {
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
        fontSize: '1.375rem',
        fontWeight: 600,
        letterSpacing: '-0.015em',
      },
      h4: {
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
        fontSize: '1.25rem',
        fontWeight: 600,
        letterSpacing: '-0.015em',
      },
      h5: {
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
        fontSize: '1.125rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
        fontSize: '1rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      body1: {
        fontSize: '0.95rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.45,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '-0.005em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: bgDefault,
            color: textPrimary,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 9999,
            padding: '8px 20px',
            transition: 'background-color 0.2s ease, transform 0.15s ease, border-color 0.2s ease',
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
          outlined: {
            borderColor: dividerColor,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.2s ease, transform 0.15s ease',
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 20,
            backgroundColor: bgPaper,
            border: `1px solid ${dividerColor}`,
            boxShadow: isDark
              ? 'none'
              : '0 1px 2px rgba(0, 0, 0, 0.04)',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            border: `1px solid ${dividerColor}`,
            boxShadow: isDark
              ? '0 24px 48px rgba(0, 0, 0, 0.55)'
              : '0 20px 40px rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 14,
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              '& fieldset': {
                borderColor: dividerColor,
              },
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 9999,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(31, 31, 31, 0.07)',
          },
          bar: {
            borderRadius: 9999,
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 9999,
            fontWeight: 500,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 10,
            fontSize: '0.78rem',
            padding: '6px 12px',
            backgroundColor: isDark ? '#303134' : '#1F1F1F',
            color: '#FFFFFF',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.88rem',
            minHeight: 46,
            borderRadius: '12px 12px 0 0',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: `1px solid ${dividerColor}`,
            boxShadow: isDark
              ? '0 12px 32px rgba(0, 0, 0, 0.5)'
              : '0 8px 24px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
            fontWeight: 700,
            fontSize: '1.15rem',
            padding: '20px 24px 12px',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '12px 24px 20px',
            gap: 8,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            '& fieldset': {
              borderColor: dividerColor,
            },
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? alpha('#1E1F20', 0.88) : alpha('#FFFFFF', 0.88),
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            height: 72,
            paddingBottom: 6,
            borderTop: `1px solid ${dividerColor}`,
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            padding: '6px 0',
            minWidth: 'auto',
            color: textSecondary,
            transition: 'color 0.2s ease',
            '&.Mui-selected': {
              color: textPrimary,
            },
            '& .MuiBottomNavigationAction-label': {
              marginTop: 4,
              fontSize: '0.72rem',
              fontWeight: 500,
              '&.Mui-selected': {
                fontSize: '0.72rem',
                fontWeight: 600,
              },
            },
            '& .MuiSvgIcon-root': {
              fontSize: '1.35rem',
              padding: '4px 18px',
              borderRadius: 9999,
              boxSizing: 'content-box',
              transition: 'background-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
            },
            '&.Mui-selected .MuiSvgIcon-root': {
              backgroundColor: alpha(primaryMain, isDark ? 0.22 : 0.14),
              color: primaryMain,
              transform: 'scale(1.04)',
            },
          },
        },
      },
    },
  };
};

export const createAppTheme = (mode, accentColor) => createTheme(getDesignTokens(mode, accentColor));
