import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Button, BottomNavigation, BottomNavigationAction, Paper, Snackbar, Badge, Dialog } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddBoxIcon from '@mui/icons-material/AddBox';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CategoryIcon from '@mui/icons-material/Category';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import HistoryIcon from '@mui/icons-material/History';
import { createAppTheme } from './Theme';
import { TaskProvider, useTaskContext } from './context/TaskContext';
import Sidebar from './components/Sidebar';
import TaskGrid from './components/TaskGrid';
import TaskCreator from './components/TaskCreator';
import CategoriesManager from './components/CategoriesManager';
import PastReview from './components/PastReview';
import ReadingSpeed from './components/ReadingSpeed';
import AuthModal from './components/AuthModal';
import NotificationManager from './components/NotificationManager';
import Invitations from './components/Invitations';
import Settings from './components/Settings';
import ShoppingList from './components/ShoppingList';
import ProfileModal from './components/ProfileModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { initOfflineFirstOtaUpdater } from './utils/nativeBridge';
import { APP_VERSION } from './data/changelog';

const CURRENT_APP_VERSION = APP_VERSION;

function MainApp() {
  const [currentView, setCurrentView] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInvitationsModalOpen, setIsInvitationsModalOpen] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  
  const [hasUpdate, setHasUpdate] = useState(() => {
    return localStorage.getItem('app_version') !== CURRENT_APP_VERSION;
  });
  
  const { user, logout } = useAuth();
  const { theme, accentColor, pinnedNavItems, snackbarInfo, closeSnackbar, pendingTasks, pendingLists, enableReadingFeature, pendingWidgetFinish } = useTaskContext();
  const [otaApplyFn, setOtaApplyFn] = useState(null);
  
  const pendingCount = (pendingTasks?.length || 0) + (pendingLists?.length || 0) + (hasUpdate ? 1 : 0);

  useEffect(() => {
    if (pendingWidgetFinish) {
      setCurrentView('reading-speed');
    }
  }, [pendingWidgetFinish]);

  useEffect(() => {
    initOfflineFirstOtaUpdater((applyNow) => {
      setOtaApplyFn(() => applyNow);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setUserDisplayName('');
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists() && doc.data().displayName) {
        setUserDisplayName(doc.data().displayName);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const NAV_CONFIG = {
    'home': { label: 'Aufgaben', icon: <AssignmentIcon /> },
    'shopping': { label: 'Shopping', icon: <ShoppingCartIcon /> },
    ...(enableReadingFeature !== false ? { 'reading-speed': { label: 'Lesen', icon: <MenuBookIcon /> } } : {}),
    'settings': { label: 'Settings', icon: <SettingsIcon /> },
  };

  useEffect(() => {
    if (enableReadingFeature === false && currentView === 'reading-speed') {
      setCurrentView('home');
    }
  }, [enableReadingFeature, currentView]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <TaskGrid view="all" />;
      case 'past-review':
        return <PastReview />;
      case 'create':
        return <TaskCreator />;
      case 'reading-speed':
        return <ReadingSpeed />;
      case 'categories':
        return <CategoriesManager />;
      case 'settings':
        return <Settings />;
      case 'shopping':
        return <ShoppingList />;
      default:
        return <TaskGrid view="all" />;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'home': return 'Deine Aufgaben';
      case 'past-review': return 'Rückblick';
      case 'create': return 'Neue Aufgabe erstellen';
      case 'reading-speed': return 'Lesegeschwindigkeit';
      case 'categories': return 'Kategorien verwalten';
      case 'settings': return 'Einstellungen';
      case 'shopping': return 'Einkaufsliste';
      default: return 'TaskMaster';
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <NotificationManager />
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{
            bgcolor: 'background.default',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 60, sm: 68 }, px: { xs: 2, sm: 3.5 } }}>
            <Typography
              variant="h5"
              component="h1"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                fontSize: { xs: '1.15rem', sm: '1.3rem' },
                letterSpacing: '-0.02em',
                color: 'text.primary',
              }}
            >
              {getViewTitle()}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
              {user ? (
                <>
                  <IconButton 
                    color="inherit" 
                    onClick={() => setIsInvitationsModalOpen(true)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        color: 'text.primary',
                      },
                    }}
                  >
                    <Badge badgeContent={pendingCount} color="error">
                      <NotificationsIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                  <Box 
                    onClick={() => setIsProfileModalOpen(true)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: { xs: 1, sm: 1.5 },
                      py: 0.65,
                      borderRadius: 9999,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      color: 'text.primary',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease, border-color 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <AccountCircleIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    <Typography variant="body2" fontWeight={500} sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userDisplayName || user.email}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={logout}
                    size="small"
                    sx={{
                      borderRadius: 9999,
                      borderColor: 'divider',
                      color: 'text.secondary',
                      px: 2,
                      '&:hover': {
                        borderColor: 'text.secondary',
                        color: 'text.primary',
                        bgcolor: 'transparent',
                      },
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setIsAuthModalOpen(true)}
                  size="small"
                  sx={{ borderRadius: 9999, px: 2.5 }}
                >
                  Einloggen
                </Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            px: { xs: 2, sm: 3.5 },
            pt: { xs: 2.5, sm: 3.5 },
            pb: { xs: 12, sm: 4 },
          }}
        >
          <Box sx={{ maxWidth: 1120, mx: 'auto', width: '100%' }}>
            {renderContent()}
          </Box>
        </Box>

        {/* Bottom Navigation for Mobile */}
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: { md: 'none' },
            zIndex: 1100,
            borderRadius: 0,
            bgcolor: (t) => t.palette.mode === 'dark' ? '#131314' : '#FFFFFF',
          }}
          elevation={0}
        >
          <BottomNavigation
            showLabels
            value={currentView}
            onChange={(event, newValue) => {
              setCurrentView(newValue);
            }}
          >
            {Object.entries(NAV_CONFIG).map(([itemId, nav]) => (
              <BottomNavigationAction key={itemId} label={nav.label} value={itemId} icon={nav.icon} />
            ))}
          </BottomNavigation>
        </Paper>

        <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      
      <Dialog 
        open={isInvitationsModalOpen} 
        onClose={() => setIsInvitationsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Invitations 
          onClose={() => setIsInvitationsModalOpen(false)} 
          hasUpdate={hasUpdate}
          onClearUpdate={() => {
            localStorage.setItem('app_version', CURRENT_APP_VERSION);
            setHasUpdate(false);
          }}
        />
      </Dialog>
    
        {snackbarInfo && (
          <Snackbar
            open={snackbarInfo.open}
            autoHideDuration={4000}
            onClose={closeSnackbar}
            message={snackbarInfo.message}
            sx={{ bottom: { xs: 84, md: 24 } }}
            action={
              snackbarInfo.onUndo ? (
                <Button
                  size="small"
                  sx={{
                    color: '#A8C7FA',
                    fontWeight: 700,
                    px: 1.5,
                    borderRadius: 9999,
                    '&:hover': { bgcolor: 'rgba(168, 199, 250, 0.14)' },
                  }}
                  onClick={() => {
                    snackbarInfo.onUndo();
                    closeSnackbar();
                  }}
                >
                  Rückgängig
                </Button>
              ) : null
            }
          />
        )}

        <Snackbar
          open={!!otaApplyFn}
          onClose={(_, reason) => {
            if (reason !== 'clickaway') setOtaApplyFn(null);
          }}
          message="Neues App-Update bereit"
          sx={{ bottom: { xs: 84, md: 24 } }}
          action={
            <Button
              size="small"
              sx={{
                color: '#A8C7FA',
                fontWeight: 700,
                px: 1.5,
                borderRadius: 9999,
                '&:hover': { bgcolor: 'rgba(168, 199, 250, 0.14)' },
              }}
              onClick={() => {
                if (otaApplyFn) otaApplyFn();
                setOtaApplyFn(null);
              }}
            >
              Jetzt laden
            </Button>
          }
        />
      </Box>
    </Box>
  );
}

function ThemeWrapper() {
  const { theme, accentColor } = useTaskContext();
  const muiTheme = React.useMemo(() => createAppTheme(theme, accentColor), [theme, accentColor]);

  useEffect(() => {
    const bgColor = theme === 'dark' ? '#131314' : '#F0F4F9';
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', bgColor);
  }, [theme]);
  
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <MainApp />
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <ThemeWrapper />
      </TaskProvider>
    </AuthProvider>
  );
}

export default App;
