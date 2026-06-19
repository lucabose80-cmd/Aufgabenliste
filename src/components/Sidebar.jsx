import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography, Button, useMediaQuery, useTheme } from '@mui/material';

// MUI Icons
import AssignmentIcon from '@mui/icons-material/Assignment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Award
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart'; // Activity
import HistoryIcon from '@mui/icons-material/History';
import MenuBookIcon from '@mui/icons-material/MenuBook'; // BookOpen
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'; // Flame
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddBoxIcon from '@mui/icons-material/AddBox'; // PlusSquare
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SyncIcon from '@mui/icons-material/Sync';

const Sidebar = ({ currentView, setCurrentView, isOpen, toggleSidebar }) => {
  const { forceSync, pinnedNavItems } = useTaskContext();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const menuItems = [
    { id: 'home', label: 'Aufgaben', icon: <AssignmentIcon /> },
    { id: 'review', label: 'Statistik', icon: <BarChartIcon /> },
    { id: 'past-review', label: 'Rückblick', icon: <HistoryIcon /> },
    { id: 'reading-speed', label: 'Lesegeschwindigkeit', icon: <MenuBookIcon /> },
    { id: 'calories', label: 'Kalorienziel', icon: <LocalFireDepartmentIcon /> },
    { id: 'shopping', label: 'Einkaufsliste', icon: <ShoppingCartIcon /> },
    { id: 'create', label: 'Aufgabe erstellen', icon: <AddBoxIcon /> },
    { id: 'categories', label: 'Kategorien', icon: <FolderIcon /> },
    { id: 'settings', label: 'Einstellungen', icon: <SettingsIcon /> },
  ];

  const visibleMenuItems = isMobile && pinnedNavItems 
    ? menuItems.filter(item => !pinnedNavItems.includes(item.id))
    : menuItems;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
        <CheckBoxIcon color="primary" fontSize="large" />
        <Typography variant="h6" fontWeight="bold">TaskMaster</Typography>
      </Box>
      <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
        {visibleMenuItems.map((item) => (
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
        anchor="bottom"
        variant="temporary"
        open={isOpen}
        onClose={toggleSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: '100%',
            maxHeight: '80vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          },
        }}
      >
        <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mt: 2, mb: 1 }} />
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
