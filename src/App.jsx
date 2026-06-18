import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Button, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HomeIcon from '@mui/icons-material/Home';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddBoxIcon from '@mui/icons-material/AddBox';
import { createAppTheme } from './Theme';
import { TaskProvider, useTaskContext } from './context/TaskContext';
import Sidebar from './components/Sidebar';
import TaskGrid from './components/TaskGrid';
import YearTracker from './components/YearTracker';
import CategoriesManager from './components/CategoriesManager';
import TaskCreator from './components/TaskCreator';
import Statistics from './components/Statistics';
import Review from './components/Review';
import ReadingSpeed from './components/ReadingSpeed';
import Calories from './components/Calories';
import AuthModal from './components/AuthModal';
import NotificationManager from './components/NotificationManager';
import Settings from './components/Settings';
import ShoppingList from './components/ShoppingList';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainApp() {
  const [currentView, setCurrentView] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, accentColor } = useTaskContext();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <TaskGrid view="all" />;
      case 'review':
        return <Review />;
      case 'create':
        return <TaskCreator />;
      case 'tracker':
        return <YearTracker />;
      case 'statistics':
        return <Statistics />;
      case 'reading-speed':
        return <ReadingSpeed />;
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
      case 'home': return 'Startseite';
      case 'review': return 'Monats- & Jahresrückblick';
      case 'create': return 'Neue Aufgabe erstellen';
      case 'tracker': return 'Jahres-Tracker';
      case 'statistics': return 'Statistiken';
      case 'reading-speed': return 'Lesegeschwindigkeit';
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
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleSidebar}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              {getViewTitle()}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {user ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <AccountCircleIcon />
                    <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      {user.email}
                    </Typography>
                  </Box>
                  <Button variant="outlined" color="inherit" onClick={logout} size="small" sx={{ borderRadius: 8 }}>
                    Logout
                  </Button>
                </>
              ) : (
                <Button variant="contained" color="primary" onClick={() => setIsAuthModalOpen(true)} size="small" sx={{ borderRadius: 8 }}>
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
              setCurrentView(newValue);
            }}
          >
            <BottomNavigationAction label="Start" value="home" icon={<HomeIcon />} />
            <BottomNavigationAction label="Lesen" value="reading-speed" icon={<MenuBookIcon />} />
            <BottomNavigationAction label="Neu" value="create" icon={<AddBoxIcon />} />
            <BottomNavigationAction label="Rückblick" value="review" icon={<EmojiEventsIcon />} />
            <BottomNavigationAction label="Shopping" value="shopping" icon={<ShoppingCartIcon />} />
          </BottomNavigation>
        </Paper>
      </Box>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
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
