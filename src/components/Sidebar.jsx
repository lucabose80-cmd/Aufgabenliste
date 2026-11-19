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

import { alpha } from '@mui/material/styles';

const Sidebar = ({ currentView, setCurrentView, isOpen, toggleSidebar }) => {
  const { forceSync, pinnedNavItems } = useTaskContext();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  
  const menuItems = [
    { id: 'home', label: 'Aufgaben', icon: <AssignmentIcon fontSize="small" /> },
    { id: 'shopping', label: 'Einkaufsliste', icon: <ShoppingCartIcon fontSize="small" /> },
    { id: 'reading-speed', label: 'Lesegeschwindigkeit', icon: <MenuBookIcon fontSize="small" /> },
    { id: 'settings', label: 'Einstellungen', icon: <SettingsIcon fontSize="small" /> },
  ];

  const visibleMenuItems = menuItems;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.12),
            color: 'primary.main',
          }}
        >
          <CheckBoxIcon fontSize="small" />
        </Box>
        <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: 'text.primary' }}>
          TaskMaster
        </Typography>
      </Box>
      <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, pt: 0.5 }}>
        {visibleMenuItems.map((item) => {
          const isSelected = currentView === item.id;
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                selected={isSelected}
                onClick={() => {
                  setCurrentView(item.id);
                  if (isMobile) toggleSidebar();
                }}
                sx={{
                  borderRadius: 9999,
                  px: 2,
                  py: 1.1,
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.12),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, isDark ? 0.26 : 0.18),
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isSelected ? 'primary.main' : 'text.secondary',
                    minWidth: 36,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{ 
                    fontSize: '0.9rem',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'primary.main' : 'text.primary',
                  }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      {user && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<SyncIcon fontSize="small" />}
            onClick={() => {
              forceSync();
              if (isMobile) toggleSidebar();
            }}
            sx={{
              borderRadius: 9999,
              bgcolor: 'background.paper',
              color: 'text.primary',
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'background.paper',
              },
            }}
          >
            Cloud Sync
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: 264 }, flexShrink: { md: 0 } }}>
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
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            bgcolor: 'background.default',
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
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 264,
            bgcolor: 'background.default',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
