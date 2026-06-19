import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode, accentColor) => ({
  palette: {
    mode,
    primary: {
      main: accentColor || '#6750A4', // Standard M3 Indigo
    },
    secondary: {
      main: '#625B71',
    },
    error: {
      main: '#B3261E',
    },
    background: {
      default: mode === 'dark' ? '#141218' : '#FEF7FF',
      paper: mode === 'dark' ? '#2B2930' : '#F3EDF7',
    },
    text: {
      primary: mode === 'dark' ? '#E6E0E9' : '#1D1B20',
      secondary: mode === 'dark' ? '#CAC4D0' : '#49454F',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 400 },
    h2: { fontSize: '2rem', fontWeight: 400 },
    h3: { fontSize: '1.5rem', fontWeight: 400 },
    body1: { fontSize: '1rem', letterSpacing: '0.03125em' },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20, // Rounded pill buttons standard in M3
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'dark' 
            ? '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)'
            : '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1D1B20' : '#F3EDF7', // M3 Surface Container
          height: 80,
          paddingBottom: 8, // Safe area for modern phones
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          padding: '8px 0 8px 0',
          minWidth: 'auto',
          color: mode === 'dark' ? '#CAC4D0' : '#49454F',
          '&.Mui-selected': {
            color: mode === 'dark' ? '#E6E0E9' : '#1D1B20',
          },
          '& .MuiBottomNavigationAction-label': {
            marginTop: 4,
          },
          '& .MuiSvgIcon-root': {
            fontSize: '1.5rem',
            padding: '4px 20px', // Creates the pill shape horizontally
            borderRadius: 16,
            boxSizing: 'content-box', // CRITICAL: prevents padding from squishing the SVG
            transition: 'all 0.2s',
          },
          '&.Mui-selected .MuiSvgIcon-root': {
            backgroundColor: mode === 'dark' ? '#4A4458' : '#E8DEF8', // M3 Secondary Container
            color: mode === 'dark' ? '#E8DEF8' : '#1D192B', // M3 On Secondary Container
            transform: 'scale(1.1)', // Highlight active icon visually
          },
        },
        label: {
          fontSize: '0.75rem',
          fontWeight: 500,
          '&.Mui-selected': {
            fontSize: '0.75rem',
            fontWeight: 700,
          },
        },
      },
    },
  },
});

export const createAppTheme = (mode, accentColor) => createTheme(getDesignTokens(mode, accentColor));
