import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Typography, Button, Card, CardContent, Divider, Stack } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { CHANGELOG_ENTRIES } from '../data/changelog';

const Invitations = ({ onClose, hasUpdate, onClearUpdate }) => {
  const latestRelease = CHANGELOG_ENTRIES[0];
  const { 
    pendingTasks, 
    pendingLists, 
    acceptTaskInvitation, 
    rejectTaskInvitation, 
    acceptListInvitation, 
    rejectListInvitation 
  } = useTaskContext();

  const handleAcceptTask = async (taskId) => {
    await acceptTaskInvitation(taskId);
  };

  const handleRejectTask = async (taskId) => {
    await rejectTaskInvitation(taskId);
  };

  const handleAcceptList = async (listId) => {
    await acceptListInvitation(listId);
  };

  const handleRejectList = async (listId) => {
    await rejectListInvitation(listId);
  };

  if (pendingTasks.length === 0 && pendingLists.length === 0 && !hasUpdate) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Du hast aktuell keine offenen Benachrichtigungen.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mb: 2 }}>Benachrichtigungen</Typography>
      <Stack spacing={2}>
        {hasUpdate && latestRelease && (
          <Card
            sx={{
              borderRadius: '18px',
              bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(138, 180, 248, 0.14)' : 'rgba(26, 115, 232, 0.08)',
              borderColor: 'primary.main',
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                App Update · v{latestRelease.version}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>{latestRelease.title}</Typography>
              <Box component="ul" sx={{ mt: 1, mb: 2, pl: 2.25, color: 'text.secondary', '& li': { mb: 0.5, fontSize: '0.86rem', lineHeight: 1.5 } }}>
                {latestRelease.highlights.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" color="primary" size="small" onClick={onClearUpdate}>
                  Verstanden
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {pendingTasks.map(task => (
          <Card key={task.id} sx={{ borderRadius: '18px', bgcolor: 'background.surfaceVariant', border: 'none' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Aufgabe geteilt
              </Typography>
              <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>{task.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Jemand hat eine Aufgabe mit dir geteilt.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="small" 
                  startIcon={<CheckIcon fontSize="small" />}
                  onClick={() => handleAcceptTask(task.id)}
                >
                  Annehmen
                </Button>
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small" 
                  startIcon={<CloseIcon fontSize="small" />}
                  onClick={() => handleRejectTask(task.id)}
                >
                  Ablehnen
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}

        {pendingLists.map(list => (
          <Card key={list.id} sx={{ borderRadius: '18px', bgcolor: 'background.surfaceVariant', border: 'none' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="secondary.main" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Einkaufsliste geteilt
              </Typography>
              <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>{list.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Jemand hat dich zu einer Einkaufsliste eingeladen.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="small" 
                  startIcon={<CheckIcon fontSize="small" />}
                  onClick={() => handleAcceptList(list.id)}
                >
                  Annehmen
                </Button>
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small" 
                  startIcon={<CloseIcon fontSize="small" />}
                  onClick={() => handleRejectList(list.id)}
                >
                  Ablehnen
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default Invitations;
