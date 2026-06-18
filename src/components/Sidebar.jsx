import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography, Button, useMediaQuery, useTheme } from '@mui/material';

// MUI Icons
import HomeIcon from '@mui/icons-material/Home';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Award
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart'; // Activity
import MenuBookIcon from '@mui/icons-material/MenuBook'; // BookOpen
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'; // Flame
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddBoxIcon from '@mui/icons-material/AddBox'; // PlusSquare
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SyncIcon from '@mui/icons-material/Sync';

const Sidebar = ({ currentView, setCurrentView, isOpen, toggleSidebar }) => {
  const { forceSync } = useTaskContext();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const menuItems = [
    { id: 'home', label: 'Startseite', icon: <HomeIcon /> },
    { id: 'review', label: 'Rückblick', icon: <EmojiEventsIcon /> },
    { id: 'tracker', label: 'Jahres-Tracker', icon: <BarChartIcon /> },
    { id: 'statistics', label: 'Statistiken', icon: <ShowChartIcon /> },
    { id: 'reading-speed', label: 'Lesegeschwindigkeit', icon: <MenuBookIcon /> },
    { id: 'calories', label: 'Kalorienziel', icon: <LocalFireDepartmentIcon /> },
    { id: 'shopping', label: 'Einkaufsliste', icon: <ShoppingCartIcon /> },
    { id: 'create', label: 'Aufgabe erstellen', icon: <AddBoxIcon /> },
    { id: 'categories', label: 'Kategorien', icon: <FolderIcon /> },
    { id: 'settings', label: 'Einstellungen', icon: <SettingsIcon /> },
  ];

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
        <CheckBoxIcon color="primary" fontSize="large" />
        <Typography variant="h6" fontWeight="bold">TaskMaster</Typography>
      </Box>
      <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              selected={currentView === item.id}
              onClick={() => {
                setCurrentView(item.id);
                if (isMobile) toggleSidebar();
              }}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ color: currentView === item.id ? 'primary.main' : 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{ 
                  fontWeight: currentView === item.id ? 'bold' : 'normal',
                  color: currentView === item.id ? 'primary.main' : 'inherit'
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      {user && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<SyncIcon />}
            onClick={() => {
              forceSync();
              if (isMobile) toggleSidebar();
            }}
            sx={{ borderRadius: 8 }}
          >
            Cloud Sync
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: 280 }, flexShrink: { md: 0 } }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={isOpen}
        onClose={toggleSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        {drawerContent}
      </Drawer>
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280, borderRight: 1, borderColor: 'divider' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
