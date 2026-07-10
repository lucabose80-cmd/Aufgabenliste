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
import LiveTvIcon from '@mui/icons-material/LiveTv';
import { createAppTheme } from './Theme';
import { TaskProvider, useTaskContext } from './context/TaskContext';
import Sidebar from './components/Sidebar';
import TaskGrid from './components/TaskGrid';
import TaskCreator from './components/TaskCreator';
import CategoriesManager from './components/CategoriesManager';
import Review from './components/Review';
import PastReview from './components/PastReview';
import ReadingSpeed from './components/ReadingSpeed';
import SeriesTracker from './components/SeriesTracker';
import Calories from './components/Calories';
import AuthModal from './components/AuthModal';
import NotificationManager from './components/NotificationManager';
import Invitations from './components/Invitations';
import Settings from './components/Settings';
import ShoppingList from './components/ShoppingList';
import ProfileModal from './components/ProfileModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

function MainApp() {
  const [currentView, setCurrentView] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInvitationsModalOpen, setIsInvitationsModalOpen] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  
  const { user, logout } = useAuth();
  const { theme, accentColor, pinnedNavItems, snackbarInfo, closeSnackbar, pendingTasks, pendingLists } = useTaskContext();
  
  const pendingCount = (pendingTasks?.length || 0) + (pendingLists?.length || 0);

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
    'reading-speed': { label: 'Lesen', icon: <MenuBookIcon /> },
    'series-tracker': { label: 'Serien', icon: <LiveTvIcon /> },
    'review': { label: 'Statistik', icon: <BarChartIcon /> },
    'past-review': { label: 'Rückblick', icon: <HistoryIcon /> },
    'shopping': { label: 'Shopping', icon: <ShoppingCartIcon /> },
    'calories': { label: 'Kalorienziel', icon: <LocalFireDepartmentIcon /> },
    'categories': { label: 'Kategorien', icon: <CategoryIcon /> },
    'create': { label: 'Erstellen', icon: <AddBoxIcon /> },
    'settings': { label: 'Settings', icon: <SettingsIcon /> },
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <TaskGrid view="all" />;
      case 'review':
        return <Review />;
      case 'past-review':
        return <PastReview />;
      case 'create':
        return <TaskCreator />;
      case 'reading-speed':
        return <ReadingSpeed />;
      case 'series-tracker':
        return <SeriesTracker />;
      case 'calories':
        return <Calories />;
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
      case 'home': return 'Aufgaben';
      case 'review': return 'Statistik';
      case 'past-review': return 'Rückblick';
      case 'create': return 'Neue Aufgabe erstellen';
      case 'reading-speed': return 'Lesegeschwindigkeit';
      case 'series-tracker': return 'Serien Tracker';
      case 'calories': return 'Kalorienziel';
      case 'categories': return 'Kategorien verwalten';
      case 'settings': return 'Einstellungen';
      case 'shopping': return 'Einkaufsliste';
      default: return 'TaskMaster';
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <NotificationManager />
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
        <AppBar position="static" color="primary" elevation={2} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Toolbar>
            {/* Removed Hamburger Menu for Mobile */}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              {getViewTitle()}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {user ? (
                <>
                  <IconButton 
                    color="inherit" 
                    onClick={() => setIsInvitationsModalOpen(true)}
                  >
                    <Badge badgeContent={pendingCount} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                  <Box 
                    onClick={() => setIsProfileModalOpen(true)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                  >
                    <AccountCircleIcon />
                    <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      {userDisplayName || user.email}
                    </Typography>
                  </Box>
                  <Button variant="outlined" color="inherit" onClick={logout} size="small" sx={{ borderRadius: 8, borderColor: 'primary.contrastText', color: 'primary.contrastText' }}>
                    Logout
                  </Button>
                </>
              ) : (
                <Button variant="contained" color="secondary" onClick={() => setIsAuthModalOpen(true)} size="small" sx={{ borderRadius: 8, bgcolor: 'background.paper', color: 'primary.main', '&:hover': { bgcolor: 'background.default' } }}>
                  Einloggen
                </Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>
        
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', p: { xs: 2, sm: 3 }, pb: { xs: 10, sm: 3 } }}>
          {renderContent()}
        </Box>

        {/* Bottom Navigation for Mobile */}
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: { md: 'none' }, zIndex: 1100 }} elevation={8}>
          <BottomNavigation
            showLabels
            value={currentView}
            onChange={(event, newValue) => {
              if (newValue !== 'more') {
                setCurrentView(newValue);
              }
            }}
          >
            {(pinnedNavItems || []).slice(0, 5).map(itemId => {
              const nav = NAV_CONFIG[itemId];
              if (!nav) return null;
              return <BottomNavigationAction key={itemId} label={nav.label} value={itemId} icon={nav.icon} />;
            })}
            
            <BottomNavigationAction 
              label="Mehr" 
              value="more" 
              icon={<MenuIcon />} 
              onClick={(e) => {
                e.preventDefault();
                toggleSidebar();
              }}
            />
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
        <Invitations onClose={() => setIsInvitationsModalOpen(false)} />
      </Dialog>
    
        {snackbarInfo && (
          <Snackbar
            open={snackbarInfo.open}
            autoHideDuration={4000}
            onClose={closeSnackbar}
            message={snackbarInfo.message}
            action={
              snackbarInfo.onUndo ? (
                <Button color="secondary" size="small" onClick={() => {
                  snackbarInfo.onUndo();
                  closeSnackbar();
                }}>
                  RÜCKGÄNGIG
                </Button>
              ) : null
            }
          />
        )}
      </Box>
    </Box>
  );
}

function ThemeWrapper() {
  const { theme, accentColor } = useTaskContext();
  const muiTheme = React.useMemo(() => createAppTheme(theme, accentColor), [theme, accentColor]);
  
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
