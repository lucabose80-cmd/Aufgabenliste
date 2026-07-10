import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SeriesManager from './SeriesManager';
import SeriesCalendar from './SeriesCalendar';

export default function SeriesTracker() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)} 
          aria-label="series tracker tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<LiveTvIcon />} label="Meine Serien" iconPosition="start" />
          <Tab icon={<CalendarMonthIcon />} label="Release Kalender" iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {activeTab === 0 && <SeriesManager />}
        {activeTab === 1 && <SeriesCalendar />}
      </Box>
    </Box>
  );
}
