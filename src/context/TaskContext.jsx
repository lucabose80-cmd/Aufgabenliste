import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';

const TaskContext = createContext();

export const useTaskContext = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
  const { user } = useAuth();
  
  // States
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [readingSessions, setReadingSessions] = useState([]);
  const [calorieLogs, setCalorieLogs] = useState([]);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  
  // Settings
  const [theme, setTheme] = useState('dark');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [shoppingListId, setShoppingListId] = useState(null);
  const [pinnedNavItems, setPinnedNavItems] = useState(['home', 'reading-speed', 'review', 'shopping']);
  const [dashboardOrder, setDashboardOrder] = useState(['highlights', 'tracker', 'chart', 'stats']);
  
  const [isLoading, setIsLoading] = useState(true);

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
      setTasks(loadedTasks);

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

      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user && !isLoading) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
      localStorage.setItem('categories', JSON.stringify(categories));
      localStorage.setItem('readingSessions', JSON.stringify(readingSessions));
      localStorage.setItem('calorieLogs', JSON.stringify(calorieLogs));
      localStorage.setItem('calorieGoal', calorieGoal);
      localStorage.setItem('theme', theme);
      localStorage.setItem('accentColor', accentColor);
      localStorage.setItem('shoppingListId', shoppingListId || '');
      localStorage.setItem('pinnedNavItems', JSON.stringify(pinnedNavItems));
      localStorage.setItem('dashboardOrder', JSON.stringify(dashboardOrder));
    }
  }, [tasks, categories, readingSessions, calorieLogs, calorieGoal, theme, accentColor, shoppingListId, pinnedNavItems, dashboardOrder, user, isLoading]);

  // Firestore Realtime Listeners
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const unsubscribeTasks = onSnapshot(tasksRef, (snapshot) => {
      const fbTasks = snapshot.docs.map(doc => doc.data());
      setTasks(fbTasks);
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
      unsubscribeTasks();
      unsubscribeCategories();
      unsubscribeReading();
      unsubscribeCalories();
      unsubscribeSettings();
    };
  }, [user]);

  const getTodayDateString = () => format(new Date(), 'yyyy-MM-dd');

  // Auto-reset subtasks for a new day
  useEffect(() => {
    if (tasks.length === 0 || isLoading) return;
    const today = getTodayDateString();
    let hasChanges = false;
    const updatedTasks = tasks.map(task => {
      if (task.type !== 'general' && task.subTasks && task.subTasks.length > 0) {
        if (!task.completedDates.includes(today) && task.lastResetDate !== today) {
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
        setTasks(updatedTasks);
      } else {
        const batch = writeBatch(db);
        updatedTasks.forEach(t => {
          const original = tasks.find(orig => orig.id === t.id);
          if (original && (original.lastResetDate !== t.lastResetDate || JSON.stringify(original.subTasks) !== JSON.stringify(t.subTasks))) {
            const ref = doc(db, 'users', user.uid, 'tasks', t.id);
            batch.update(ref, { subTasks: t.subTasks, lastResetDate: t.lastResetDate });
          }
        });
        batch.commit().catch(err => console.error("Auto-reset error:", err));
      }
    }
  }, [tasks, isLoading, user]);

  const saveTaskToFirestore = async (taskData) => {
    if (user) await setDoc(doc(db, 'users', user.uid, 'tasks', taskData.id), taskData);
  };

  const deleteTaskFromFirestore = async (taskId) => {
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
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
    };
    
    if (!user) setTasks([...tasks, newTask]);
    await saveTaskToFirestore(newTask);
  };

  const updateTask = async (id, updates) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updatedTask = { ...task, ...updates };
    if (!user) setTasks(tasks.map(t => t.id === id ? updatedTask : t));
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
    setTasks(current => current.map(t => {
      const update = updatedTasks.find(ut => ut.id === t.id);
      return update ? { ...t, order: update.order } : t;
    }));
    if (user) {
      const batch = writeBatch(db);
      updatedTasks.forEach(t => batch.update(doc(db, 'users', user.uid, 'tasks', t.id), { order: t.order }));
      await batch.commit();
    }
  };

  const deleteTask = async (id) => {
    if (!user) setTasks(tasks.filter(t => t.id !== id));
    await deleteTaskFromFirestore(id);
  };

  const toggleSubTask = async (taskId, subTaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedSubTasks = task.subTasks.map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st);
    const allCompleted = updatedSubTasks.every(st => st.completed);
    const today = getTodayDateString();
    let updatedCompletedDates = [...task.completedDates];
    if (task.type === 'general') {
      if (allCompleted) { await deleteTask(taskId); return; }
    } else {
      const isMainCompletedToday = task.completedDates.includes(today);
      if (allCompleted && !isMainCompletedToday) updatedCompletedDates.push(today);
      else if (!allCompleted && isMainCompletedToday) updatedCompletedDates = updatedCompletedDates.filter(d => d !== today);
    }
    const updatedTask = { ...task, subTasks: updatedSubTasks, completedDates: updatedCompletedDates };
    if (!user) setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    await saveTaskToFirestore(updatedTask);
  };

  const toggleTaskCompletion = async (taskId, date = getTodayDateString()) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.type === 'general') { await deleteTask(taskId); return; }
    const isCompletedOnDate = task.completedDates.includes(date);
    const newCompletedDates = isCompletedOnDate ? task.completedDates.filter(d => d !== date) : [...task.completedDates, date];
    const updatedTask = { ...task, completedDates: newCompletedDates };
    if (!user) setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    await saveTaskToFirestore(updatedTask);
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

  const saveSettings = async (newTheme, newAccentColor, newShoppingListId, newPinned, newDashboardOrder) => {
    if (newTheme) setTheme(newTheme);
    if (newAccentColor) setAccentColor(newAccentColor);
    if (newShoppingListId !== undefined) setShoppingListId(newShoppingListId);
    if (newPinned) setPinnedNavItems(newPinned);
    if (newDashboardOrder) setDashboardOrder(newDashboardOrder);

    const payload = {
      theme: newTheme || theme,
      accentColor: newAccentColor || accentColor,
      shoppingListId: newShoppingListId !== undefined ? newShoppingListId : shoppingListId,
      pinnedNavItems: newPinned || pinnedNavItems,
      dashboardOrder: newDashboardOrder || dashboardOrder,
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
      saveSettings,
      shoppingListId,
      forceSync,
      isLoading
    }}>
      {children}
    </TaskContext.Provider>
  );
};
