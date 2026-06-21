import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, subHours } from 'date-fns';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs, query, where } from 'firebase/firestore';

const TaskContext = createContext();

export const useTaskContext = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
  const { user } = useAuth();
  
  // States
  const [personalTasks, setPersonalTasks] = useState([]);
  const [sharedTasks, setSharedTasks] = useState([]);
  const tasks = !user ? personalTasks : [...personalTasks, ...sharedTasks];

  const [categories, setCategories] = useState([]);
  const [readingSessions, setReadingSessions] = useState([]);
  const [calorieLogs, setCalorieLogs] = useState([]);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  
  // Settings
  const [theme, setTheme] = useState('dark');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [shoppingListId, setShoppingListId] = useState(null);
  const [pinnedNavItems, setPinnedNavItems] = useState(['home', 'reading-speed', 'shopping']);
  const [dashboardOrder, setDashboardOrder] = useState(['tracker', 'highlights', 'chart', 'quickStats']);
  const [pastReviewOrder, setPastReviewOrder] = useState(['tasks', 'perfectDays', 'reading', 'speed', 'calories']);
  const [isLoading, setIsLoading] = useState(true);

  // Global Reading Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Load from LocalStorage if NOT logged in
  useEffect(() => {
    if (!user) {
      const savedTasks = localStorage.getItem('tasks');
      let loadedTasks = savedTasks ? JSON.parse(savedTasks) : [];
      loadedTasks = loadedTasks.map(t => {
        if (t.type === undefined) {
          return {
            ...t,
            type: t.isDaily ? 'daily' : 'general',
            targetCount: 1,
            specificDays: [],
            timerLogs: t.timerLogs || []
          };
        }
        if (!t.timerLogs) t.timerLogs = [];
        return t;
      });
      setPersonalTasks(loadedTasks);

      const savedCategories = localStorage.getItem('categories');
      const loadedCategories = savedCategories ? JSON.parse(savedCategories) : [
        { id: '1', name: 'Allgemein', color: '#6366f1' },
        { id: '2', name: 'Gesundheit', color: '#10b981' },
        { id: '3', name: 'Lernen', color: '#ec4899' },
      ];
      setCategories(loadedCategories);

      const savedReading = localStorage.getItem('readingSessions');
      setReadingSessions(savedReading ? JSON.parse(savedReading) : []);

      const savedCalories = localStorage.getItem('calorieLogs');
      setCalorieLogs(savedCalories ? JSON.parse(savedCalories) : []);

      const savedGoal = localStorage.getItem('calorieGoal');
      setCalorieGoal(savedGoal || 2000);

      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) setTheme(savedTheme);

      const savedColor = localStorage.getItem('accentColor');
      if (savedColor) setAccentColor(savedColor);

      const savedList = localStorage.getItem('shoppingListId');
      if (savedList) setShoppingListId(savedList);

      const savedPinned = localStorage.getItem('pinnedNavItems');
      if (savedPinned) setPinnedNavItems(JSON.parse(savedPinned));

      const savedDash = localStorage.getItem('dashboardOrder');
      if (savedDash) setDashboardOrder(JSON.parse(savedDash));

      const savedPastDash = localStorage.getItem('pastReviewOrder');
      if (savedPastDash) setPastReviewOrder(JSON.parse(savedPastDash));

      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user && !isLoading) {
      localStorage.setItem('tasks', JSON.stringify(personalTasks));
      localStorage.setItem('categories', JSON.stringify(categories));
      localStorage.setItem('readingSessions', JSON.stringify(readingSessions));
      localStorage.setItem('calorieLogs', JSON.stringify(calorieLogs));
      localStorage.setItem('calorieGoal', calorieGoal);
      localStorage.setItem('theme', theme);
      localStorage.setItem('accentColor', accentColor);
      localStorage.setItem('shoppingListId', shoppingListId || '');
      localStorage.setItem('pinnedNavItems', JSON.stringify(pinnedNavItems));
      localStorage.setItem('dashboardOrder', JSON.stringify(dashboardOrder));
      localStorage.setItem('pastReviewOrder', JSON.stringify(pastReviewOrder));
    }
  }, [personalTasks, categories, readingSessions, calorieLogs, calorieGoal, theme, accentColor, shoppingListId, pinnedNavItems, dashboardOrder, pastReviewOrder, user, isLoading]);

  const [userDisplayName, setUserDisplayName] = useState('');

  // Firestore Realtime Listeners
  useEffect(() => {
    if (!user) {
      setUserDisplayName('');
      return;
    }

    setIsLoading(true);

    const userProfileRef = doc(db, 'users', user.uid);
    const unsubscribeUserProfile = onSnapshot(userProfileRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().displayName) {
        setUserDisplayName(docSnap.data().displayName);
      } else {
        setUserDisplayName('');
      }
    });

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const unsubscribeTasks = onSnapshot(tasksRef, (snapshot) => {
      const fbTasks = snapshot.docs.map(doc => doc.data());
      setPersonalTasks(fbTasks);
    });

    const sharedTasksRef = collection(db, 'shared_tasks');
    const qShared = query(sharedTasksRef, where('members', 'array-contains', user.uid));
    const unsubscribeSharedTasks = onSnapshot(qShared, (snapshot) => {
      const fbSharedTasks = snapshot.docs.map(doc => doc.data());
      setSharedTasks(fbSharedTasks);
    });

    const categoriesRef = collection(db, 'users', user.uid, 'categories');
    const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
      const fbCategories = snapshot.docs.map(doc => doc.data());
      setCategories(fbCategories);
    });

    const readingRef = collection(db, 'users', user.uid, 'readingSessions');
    const unsubscribeReading = onSnapshot(readingRef, (snapshot) => {
      setReadingSessions(snapshot.docs.map(doc => doc.data()));
    });

    const caloriesRef = collection(db, 'users', user.uid, 'calorieLogs');
    const unsubscribeCalories = onSnapshot(caloriesRef, (snapshot) => {
      setCalorieLogs(snapshot.docs.map(doc => doc.data()));
    });

    const settingsRef = doc(db, 'users', user.uid, 'settings', 'general');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.calorieGoal !== undefined) setCalorieGoal(data.calorieGoal);
        if (data.theme) setTheme(data.theme);
        if (data.accentColor) setAccentColor(data.accentColor);
        if (data.shoppingListId !== undefined) setShoppingListId(data.shoppingListId);
        if (data.pinnedNavItems) setPinnedNavItems(data.pinnedNavItems);
        if (data.dashboardOrder) setDashboardOrder(data.dashboardOrder);
        if (data.pastReviewOrder) setPastReviewOrder(data.pastReviewOrder);
      }
      setIsLoading(false);
    });

    const migrateLocalData = async () => {
      const hasMigrated = localStorage.getItem('migrated_' + user.uid);
      if (hasMigrated) return;

      try {
        const snap = await getDocs(categoriesRef);
        if (!snap.empty) {
          localStorage.setItem('migrated_' + user.uid, 'true');
          return;
        }

        const localTasksStr = localStorage.getItem('tasks');
        const localTasks = localTasksStr ? JSON.parse(localTasksStr) : [];
        const localCatsStr = localStorage.getItem('categories');
        let localCats = localCatsStr ? JSON.parse(localCatsStr) : [
            { id: '1', name: 'Allgemein', color: '#6366f1' },
            { id: '2', name: 'Gesundheit', color: '#10b981' },
            { id: '3', name: 'Lernen', color: '#ec4899' }
        ];

        const batch = writeBatch(db);
        localTasks.forEach(t => batch.set(doc(db, 'users', user.uid, 'tasks', t.id), t));
        localCats.forEach(c => batch.set(doc(db, 'users', user.uid, 'categories', c.id), c));
        await batch.commit();
        localStorage.setItem('migrated_' + user.uid, 'true');
      } catch (err) {
        console.error("Migration failed:", err);
      }
    };
    
    migrateLocalData();

    return () => {
      unsubscribeUserProfile();
      unsubscribeTasks();
      unsubscribeSharedTasks();
      unsubscribeCategories();
      unsubscribeReading();
      unsubscribeCalories();
      unsubscribeSettings();
    };
  }, [user]);

  const getTodayDateString = () => format(subHours(new Date(), 3), 'yyyy-MM-dd');

  // Auto-reset subtasks for a new day
  useEffect(() => {
    if (tasks.length === 0 || isLoading) return;
    const today = getTodayDateString();
    let hasChanges = false;
    const updatedTasks = tasks.map(task => {
      if (task.type !== 'general' && task.subTasks && task.subTasks.length > 0) {
        if (!(task.completedDates || []).includes(today) && task.lastResetDate !== today) {
          const needsReset = task.subTasks.some(st => st.completed);
          if (needsReset) {
            hasChanges = true;
            return {
              ...task,
              subTasks: task.subTasks.map(st => ({ ...st, completed: false })),
              lastResetDate: today
            };
          } else if (task.lastResetDate !== today) {
            hasChanges = true;
            return { ...task, lastResetDate: today };
          }
        }
      }
      return task;
    });

    if (hasChanges) {
      if (!user) {
        setPersonalTasks(updatedTasks.filter(t => !t.isShared));
      } else {
        const batch = writeBatch(db);
        updatedTasks.forEach(t => {
          const original = tasks.find(orig => orig.id === t.id);
          if (original && (original.lastResetDate !== t.lastResetDate || JSON.stringify(original.subTasks) !== JSON.stringify(t.subTasks))) {
            const ref = t.isShared 
              ? doc(db, 'shared_tasks', t.id) 
              : doc(db, 'users', user.uid, 'tasks', t.id);
            batch.update(ref, { subTasks: t.subTasks, lastResetDate: t.lastResetDate });
          }
        });
        batch.commit().catch(err => console.error("Auto-reset error:", err));
      }
    }
  }, [tasks, isLoading, user]);

  const saveTaskToFirestore = async (taskData) => {
    if (!user) return;
    if (taskData.isShared) {
      await setDoc(doc(db, 'shared_tasks', taskData.id), taskData);
    } else {
      await setDoc(doc(db, 'users', user.uid, 'tasks', taskData.id), taskData);
    }
  };

  const deleteTaskFromFirestore = async (taskId, isShared = false) => {
    if (!user) return;
    if (isShared) {
      await deleteDoc(doc(db, 'shared_tasks', taskId));
    } else {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
    }
  };

  const addTask = async (taskData) => {
    const newTask = {
      id: uuidv4(),
      title: taskData.title,
      categoryId: taskData.categoryId || '1',
      type: taskData.type || 'general',
      targetCount: taskData.targetCount || 1,
      specificDays: taskData.specificDays || [],
      hasTimer: false,
      subTasks: taskData.subTasks || [],
      completedDates: [],
      timerLogs: [],
      averageSpeed: null,
      createdAt: new Date().toISOString(),
      order: Date.now(),
      isShared: taskData.isShared || false,
      members: taskData.members || []
    };
    
    if (!user) {
      if (!newTask.isShared) {
        setPersonalTasks([...personalTasks, newTask]);
      }
    }
    await saveTaskToFirestore(newTask);
  };

  const updateTask = async (id, updates) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updatedTask = { ...task, ...updates };
    if (!user && !updatedTask.isShared) {
      setPersonalTasks(personalTasks.map(t => t.id === id ? updatedTask : t));
    }
    
    if (task.isShared !== updatedTask.isShared) {
      await deleteTaskFromFirestore(task.id, task.isShared);
    }
    
    await saveTaskToFirestore(updatedTask);
  };

  const reorderTasks = async (activeId, overId) => {
    const sortedTasks = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
    const activeIndex = sortedTasks.findIndex(t => t.id === activeId);
    const targetIndex = sortedTasks.findIndex(t => t.id === overId);
    if (activeIndex === -1 || targetIndex === -1) return;
    const newSorted = [...sortedTasks];
    const [moved] = newSorted.splice(activeIndex, 1);
    newSorted.splice(targetIndex, 0, moved);
    const updatedTasks = newSorted.map((t, idx) => ({ ...t, order: idx * 1000 }));
    
    if (!user) {
      setPersonalTasks(current => current.map(t => {
        const update = updatedTasks.find(ut => ut.id === t.id);
        return update ? { ...t, order: update.order } : t;
      }));
    }
    
    if (user) {
      const batch = writeBatch(db);
      updatedTasks.forEach(t => {
        const ref = t.isShared 
          ? doc(db, 'shared_tasks', t.id) 
          : doc(db, 'users', user.uid, 'tasks', t.id);
        batch.update(ref, { order: t.order });
      });
      await batch.commit();
    }
  };

  const deleteTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (!user && !task.isShared) {
      setPersonalTasks(personalTasks.filter(t => t.id !== taskId));
    }
    await deleteTaskFromFirestore(taskId, task.isShared);
  };

  const toggleSubTask = async (taskId, subTaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const myName = userDisplayName || user?.email || 'Unbekannt';
    const updatedSubTasks = task.subTasks.map(st => 
      st.id === subTaskId 
        ? { ...st, completed: !st.completed, completedBy: !st.completed ? myName : null } 
        : st
    );
    const allCompleted = updatedSubTasks.every(st => st.completed);
    const today = getTodayDateString();
    let updatedCompletedDates = [...(task.completedDates || [])];
    let newCompletedByMap = { ...(task.completedByMap || {}) };
    
    if (task.type === 'general') {
      if (allCompleted) { await deleteTask(taskId); return; }
    } else {
      const isMainCompletedToday = (task.completedDates || []).includes(today);
      if (allCompleted && !isMainCompletedToday) {
        updatedCompletedDates.push(today);
        newCompletedByMap[today] = myName;
      }
      else if (!allCompleted && isMainCompletedToday) {
        updatedCompletedDates = updatedCompletedDates.filter(d => d !== today);
        delete newCompletedByMap[today];
      }
    }
    const updatedTask = { ...task, subTasks: updatedSubTasks, completedDates: updatedCompletedDates, completedByMap: newCompletedByMap };
    if (!user && !task.isShared) {
      setPersonalTasks(personalTasks.map(t => t.id === taskId ? updatedTask : t));
    }
    await saveTaskToFirestore(updatedTask);
  };

  const [snackbarInfo, setSnackbarInfo] = useState({ open: false, message: '', onUndo: null });

  const showSnackbar = (message, onUndo) => setSnackbarInfo({ open: true, message, onUndo });
  const closeSnackbar = () => setSnackbarInfo(prev => ({ ...prev, open: false }));

  const toggleTaskCompletion = async (taskId, date = getTodayDateString()) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (task.type === 'general') { 
      await deleteTask(taskId); 
      showSnackbar('Aufgabe erledigt!', async () => {
        if (!user && !task.isShared) setPersonalTasks(prev => [...prev, task]);
        await saveTaskToFirestore(task);
      });
      import('canvas-confetti').then(confetti => {
        confetti.default({ particleCount: 80, spread: 60, origin: { y: 0.8 }, zIndex: 9999 });
      });
      return; 
    }
    
    const myName = userDisplayName || user?.email || 'Unbekannt';
    const isCompletedOnDate = (task.completedDates || []).includes(date);
    const newCompletedDates = isCompletedOnDate ? (task.completedDates || []).filter(d => d !== date) : [...(task.completedDates || []), date];
    
    const newCompletedByMap = { ...(task.completedByMap || {}) };
    if (!isCompletedOnDate) {
      newCompletedByMap[date] = myName;
    } else {
      delete newCompletedByMap[date];
    }
    
    const updatedTask = { ...task, completedDates: newCompletedDates, completedByMap: newCompletedByMap };
    
    if (!user && !task.isShared) {
      setPersonalTasks(personalTasks.map(t => t.id === taskId ? updatedTask : t));
    }
    await saveTaskToFirestore(updatedTask);

    if (!isCompletedOnDate) {
      showSnackbar('Aufgabe erledigt!', () => {
        toggleTaskCompletion(taskId, date); // Undo
      });
      import('canvas-confetti').then(confetti => {
        confetti.default({ particleCount: 80, spread: 60, origin: { y: 0.8 }, zIndex: 9999 });
      });
    }
  };

  const addCategory = async (name, color) => {
    const newCat = { id: uuidv4(), name, color, order: categories.length * 1000 };
    if (!user) setCategories([...categories, newCat]);
    if (user) await setDoc(doc(db, 'users', user.uid, 'categories', newCat.id), newCat);
  };

  const updateCategory = async (id, name, color) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    const updated = { ...cat, name, color };
    if (!user) setCategories(categories.map(c => c.id === id ? updated : c));
    if (user) await setDoc(doc(db, 'users', user.uid, 'categories', id), updated);
  };

  const reorderCategories = async (activeId, overId) => {
    const sortedCats = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    const activeIndex = sortedCats.findIndex(c => c.id === activeId);
    const targetIndex = sortedCats.findIndex(c => c.id === overId);
    if (activeIndex === -1 || targetIndex === -1) return;
    const newSorted = [...sortedCats];
    const [moved] = newSorted.splice(activeIndex, 1);
    newSorted.splice(targetIndex, 0, moved);
    const updatedCats = newSorted.map((c, idx) => ({ ...c, order: idx * 1000 }));
    setCategories(current => current.map(c => {
      const update = updatedCats.find(uc => uc.id === c.id);
      return update ? { ...c, order: update.order } : c;
    }));
    if (user) {
      const batch = writeBatch(db);
      updatedCats.forEach(c => batch.set(doc(db, 'users', user.uid, 'categories', c.id), c, { merge: true }));
      await batch.commit();
    }
  };

  const deleteCategory = async (id) => {
    const fallbackCategory = categories.find(c => c.id !== id);
    if (!fallbackCategory) return;
    const tasksToUpdate = tasks.filter(t => t.categoryId === id);
    for (const t of tasksToUpdate) await updateTask(t.id, { categoryId: fallbackCategory.id });
    if (!user) setCategories(categories.filter(c => c.id !== id));
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
  };

  const saveReadingSession = async (timeSpent, amount, date = getTodayDateString()) => {
    const newSession = { id: uuidv4(), date, timeSpent, amount: parseFloat(amount) || 0 };
    if (!user) setReadingSessions([...readingSessions, newSession]);
    if (user) await setDoc(doc(db, 'users', user.uid, 'readingSessions', newSession.id), newSession);
  };

  const deleteReadingSession = async (id) => {
    if (!user) setReadingSessions(readingSessions.filter(s => s.id !== id));
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'readingSessions', id));
  };

  const updateReadingSession = async (id, timeSpent, amount) => {
    const session = readingSessions.find(s => s.id === id);
    if (!session) return;
    const updatedSession = { ...session, timeSpent, amount: parseFloat(amount) || 0 };
    if (!user) setReadingSessions(readingSessions.map(s => s.id === id ? updatedSession : s));
    if (user) await setDoc(doc(db, 'users', user.uid, 'readingSessions', id), updatedSession);
  };

  const saveCalorieLog = async (difference, date = getTodayDateString()) => {
    const newLog = { id: date, date, difference: parseInt(difference, 10) || 0 };
    if (!user) {
      const exists = calorieLogs.find(l => l.date === date);
      if (exists) setCalorieLogs(calorieLogs.map(l => l.date === date ? { ...l, difference: newLog.difference } : l));
      else setCalorieLogs([...calorieLogs, newLog]);
    }
    if (user) await setDoc(doc(db, 'users', user.uid, 'calorieLogs', date), newLog);
  };

  const deleteCalorieLog = async (date) => {
    if (!user) setCalorieLogs(calorieLogs.filter(l => l.date !== date));
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'calorieLogs', date));
  };

  const updateCalorieGoal = async (goal) => {
    setCalorieGoal(goal);
    if (user) await setDoc(doc(db, 'users', user.uid, 'settings', 'general'), { calorieGoal: goal }, { merge: true });
  };

  const saveSettings = async (newTheme, newAccentColor, newShoppingListId, newPinned, newDashboardOrder, newPastReviewOrder) => {
    if (newTheme) setTheme(newTheme);
    if (newAccentColor) setAccentColor(newAccentColor);
    if (newShoppingListId !== undefined) setShoppingListId(newShoppingListId);
    if (newPinned) setPinnedNavItems(newPinned);
    if (newDashboardOrder) setDashboardOrder(newDashboardOrder);
    if (newPastReviewOrder) setPastReviewOrder(newPastReviewOrder);

    const payload = {
      theme: newTheme || theme,
      accentColor: newAccentColor || accentColor,
      shoppingListId: newShoppingListId !== undefined ? newShoppingListId : shoppingListId,
      pinnedNavItems: newPinned || pinnedNavItems,
      dashboardOrder: newDashboardOrder || dashboardOrder,
      pastReviewOrder: newPastReviewOrder || pastReviewOrder,
      calorieGoal
    };

    if (user) await setDoc(doc(db, 'users', user.uid, 'settings', 'general'), payload, { merge: true });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--accent-primary', accentColor);
  }, [theme, accentColor]);

  const forceSync = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      tasks.forEach(t => batch.set(doc(db, 'users', user.uid, 'tasks', t.id), t));
      categories.forEach(c => batch.set(doc(db, 'users', user.uid, 'categories', c.id), c));
      await batch.commit();
      alert("Erfolgreich synchronisiert!");
    } catch (err) {
      alert("Fehler beim Sync: " + err.message);
    }
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      categories,
      readingSessions,
      calorieLogs,
      calorieGoal,
      addTask,
      updateTask,
      deleteTask,
      toggleSubTask,
      toggleTaskCompletion,
      reorderTasks,
      addCategory,
      updateCategory,
      reorderCategories,
      deleteCategory,
      saveReadingSession,
      deleteReadingSession,
      updateReadingSession,
      getTodayDateString,
      saveCalorieLog,
      deleteCalorieLog,
      updateCalorieGoal,
      theme,
      accentColor,
      pinnedNavItems,
      dashboardOrder,
      pastReviewOrder,
      setPastReviewOrder,
      saveSettings,
      shoppingListId,
      forceSync,
      isLoading,
      snackbarInfo,
      closeSnackbar,
      timerRunning,
      setTimerRunning,
      timerSeconds,
      setTimerSeconds
    }}>
      {children}
    </TaskContext.Provider>
  );
};
