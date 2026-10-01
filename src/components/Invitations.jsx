import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Typography, Button, Card, CardContent, Divider, Stack } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const Invitations = ({ onClose, hasUpdate, onClearUpdate }) => {
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
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">Benachrichtigungen</Typography>
      <Stack spacing={2}>
        {hasUpdate && (
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'primary.main', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom sx={{ opacity: 0.8 }}>App Update</Typography>
              <Typography variant="h6">Neue Version ist live!</Typography>
              <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                Das Update wurde erfolgreich installiert. Der Fehler beim Hinzufügen von Artikeln (grauer Kasten) wurde behoben.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  color="inherit" 
                  size="small" 
                  sx={{ color: 'primary.main', bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
                  onClick={onClearUpdate}
                >
                  Verstanden
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {pendingTasks.map(task => (
          <Card key={task.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>Aufgabe geteilt</Typography>
              <Typography variant="h6">{task.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Jemand hat eine Aufgabe mit dir geteilt.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="small" 
                  startIcon={<CheckIcon />}
                  onClick={() => handleAcceptTask(task.id)}
                >
                  Annehmen
                </Button>
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small" 
                  startIcon={<CloseIcon />}
                  onClick={() => handleRejectTask(task.id)}
                >
                  Ablehnen
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}

        {pendingLists.map(list => (
          <Card key={list.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="secondary" gutterBottom>Einkaufsliste geteilt</Typography>
              <Typography variant="h6">{list.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Jemand hat dich zu einer Einkaufsliste eingeladen.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="small" 
                  startIcon={<CheckIcon />}
                  onClick={() => handleAcceptList(list.id)}
                >
                  Annehmen
                </Button>
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small" 
                  startIcon={<CloseIcon />}
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
