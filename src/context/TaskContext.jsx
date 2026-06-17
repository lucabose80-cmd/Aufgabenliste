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
  const [calorieGoal, setCalorieGoal] = useState('');
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
      setCalorieGoal(savedGoal || '');

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
    }
  }, [tasks, categories, readingSessions, calorieLogs, calorieGoal, user, isLoading]);

  // Firestore Realtime Listeners
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const unsubscribeTasks = onSnapshot(tasksRef, (snapshot) => {
      const fbTasks = snapshot.docs.map(doc => doc.data());
      setTasks(fbTasks);
    }, (error) => {
      console.error("Firestore Tasks Sync Error:", error);
      if (error.code === 'permission-denied') {
        alert("Datenbank-Fehler: Keine Berechtigung! Bitte prüfe deine Firestore Security Rules.");
      }
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

    const settingsRef = collection(db, 'users', user.uid, 'settings');
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      const mainDoc = snapshot.docs.find(d => d.id === 'main');
      if (mainDoc && mainDoc.data().calorieGoal !== undefined) {
        setCalorieGoal(mainDoc.data().calorieGoal);
      }
      setIsLoading(false);
    });

    // Check if we need to migrate local tasks to Firestore
    const migrateLocalData = async () => {
      const hasMigrated = localStorage.getItem('migrated_' + user.uid);
      if (hasMigrated) return;

      try {
        // Check if cloud already has data (meaning another device already migrated)
        const snap = await getDocs(categoriesRef);
        
        if (!snap.empty) {
          // Cloud already has data! Do not migrate local data to avoid overwriting.
          localStorage.setItem('migrated_' + user.uid, 'true');
          return;
        }

        const localTasksStr = localStorage.getItem('tasks');
        const localTasks = localTasksStr ? JSON.parse(localTasksStr) : [];
        const localCatsStr = localStorage.getItem('categories');
        let localCats = localCatsStr ? JSON.parse(localCatsStr) : [];

        // If local is completely empty too, just set some defaults
        if (localCats.length === 0) {
          localCats = [
            { id: '1', name: 'Allgemein', color: '#6366f1' },
            { id: '2', name: 'Gesundheit', color: '#10b981' },
            { id: '3', name: 'Lernen', color: '#ec4899' }
          ];
        }

        const batch = writeBatch(db);
        localTasks.forEach(t => {
          const tRef = doc(db, 'users', user.uid, 'tasks', t.id);
          batch.set(tRef, t);
        });
        
        localCats.forEach(c => {
          const cRef = doc(db, 'users', user.uid, 'categories', c.id);
          batch.set(cRef, c);
        });

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

  // Firestore Sync Helper
  const saveTaskToFirestore = async (taskData) => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'tasks', taskData.id), taskData);
    }
  };

  const deleteTaskFromFirestore = async (taskId) => {
    if (user) {
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
    const oldIndex = tasks.findIndex(t => t.id === activeId);
    const newIndex = tasks.findIndex(t => t.id === overId);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // Wir erstellen ein sortiertes Array aller Tasks
    // Zuerst sortieren wir sie logisch nach order
    const sortedTasks = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const activeTask = tasks.find(t => t.id === activeId);
    const overTask = tasks.find(t => t.id === overId);

    const activeSortedIndex = sortedTasks.findIndex(t => t.id === activeId);
    const overSortedIndex = sortedTasks.findIndex(t => t.id === overId);

    // Array reordering
    const newSorted = [...sortedTasks];
    const [moved] = newSorted.splice(activeSortedIndex, 1);
    newSorted.splice(overSortedIndex, 0, moved);

    // Update order values sequentially to preserve order
    const updatedTasks = newSorted.map((t, index) => ({
      ...t,
      order: index * 1000 // Multiplizieren um Lücken zu lassen (optional, aber gut)
    }));

    // Update local state immediately for smooth UI
    setTasks(currentTasks => {
      return currentTasks.map(t => {
        const update = updatedTasks.find(ut => ut.id === t.id);
        return update ? { ...t, order: update.order } : t;
      });
    });

    // Sync to Firestore using writeBatch for performance
    if (user) {
      const batch = writeBatch(db);
      updatedTasks.forEach(t => {
        const ref = doc(db, 'users', user.uid, 'tasks', t.id);
        batch.update(ref, { order: t.order });
      });
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
    
    const updatedSubTasks = task.subTasks.map(st => 
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    const updatedTask = { ...task, subTasks: updatedSubTasks };

    if (!user) {
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    }
    await saveTaskToFirestore(updatedTask);
  };

  const toggleTaskCompletion = async (taskId, date = getTodayDateString()) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const allSubTasksCompleted = task.subTasks.every(st => st.completed);
    if (!allSubTasksCompleted && task.subTasks.length > 0) return;

    if (task.type === 'general') {
      if (!user) setTasks(tasks.filter(t => t.id !== taskId));
      await deleteTaskFromFirestore(taskId);
      return;
    }

    const isCompletedOnDate = task.completedDates.includes(date);
    let newCompletedDates;
    let updatedTask;

    if (isCompletedOnDate) {
      newCompletedDates = task.completedDates.filter(d => d !== date);
      updatedTask = { ...task, completedDates: newCompletedDates };
    } else {
      newCompletedDates = [...task.completedDates, date];
      updatedTask = { ...task, completedDates: newCompletedDates };
    }

    if (!user) {
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    }
    await saveTaskToFirestore(updatedTask);
  };

  const addCategory = async (name, color) => {
    const newCat = { id: uuidv4(), name, color };
    if (!user) setCategories([...categories, newCat]);
    
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'categories', newCat.id), newCat);
    }
  };

  const deleteCategory = async (id) => {
    // Reassign tasks to the first available category before deleting
    const fallbackCategory = categories.find(c => c.id !== id);
    if (!fallbackCategory) return;
    const fallbackId = fallbackCategory.id;

    const tasksToUpdate = tasks.filter(t => t.categoryId === id);
    for (const t of tasksToUpdate) {
      await updateTask(t.id, { categoryId: fallbackId });
    }

    if (!user) setCategories(categories.filter(c => c.id !== id));
    
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
    }
  };

  const updateCategory = async (id, name, color) => {
    const updatedCat = { id, name, color };
    if (!user) {
      setCategories(categories.map(c => c.id === id ? updatedCat : c));
    }
    
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'categories', id), updatedCat);
    }
  };

  const saveReadingSession = async (timeSpent, amount, date = getTodayDateString()) => {
    const newSession = { id: uuidv4(), date, timeSpent, amount: parseFloat(amount) || 0 };
    if (!user) setReadingSessions([...readingSessions, newSession]);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'readingSessions', newSession.id), newSession);
    }
  };

  const deleteReadingSession = async (id) => {
    if (!user) {
      setReadingSessions(readingSessions.filter(s => s.id !== id));
    }
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'readingSessions', id));
    }
  };

  const updateReadingSession = async (id, timeSpent, amount) => {
    const session = readingSessions.find(s => s.id === id);
    if (!session) return;
    const updatedSession = { ...session, timeSpent, amount: parseFloat(amount) || 0 };

    if (!user) {
      setReadingSessions(readingSessions.map(s => s.id === id ? updatedSession : s));
    }
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'readingSessions', id), updatedSession);
    }
  };

  const saveCalorieLog = async (difference, date = getTodayDateString()) => {
    const newLog = { id: uuidv4(), date, difference: parseInt(difference, 10) || 0 };
    if (!user) {
      // Overwrite if same date exists, else append
      const exists = calorieLogs.find(l => l.date === date);
      if (exists) {
        setCalorieLogs(calorieLogs.map(l => l.date === date ? { ...l, difference: newLog.difference } : l));
      } else {
        setCalorieLogs([...calorieLogs, newLog]);
      }
    }
    if (user) {
      // Use date as doc ID so it overwrites existing for the same day
      await setDoc(doc(db, 'users', user.uid, 'calorieLogs', date), { ...newLog, id: date });
    }
  };

  const updateCalorieGoal = async (goal) => {
    setCalorieGoal(goal);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'main'), { calorieGoal: goal }, { merge: true });
    }
  };

  const forceSync = async () => {
    if (!user) {
      alert("Bitte erst einloggen!");
      return;
    }
    try {
      const localTasksStr = localStorage.getItem('tasks');
      const localTasks = localTasksStr ? JSON.parse(localTasksStr) : [];
      const localCatsStr = localStorage.getItem('categories');
      const localCats = localCatsStr ? JSON.parse(localCatsStr) : [];

      if (localTasks.length === 0 && localCats.length === 0) {
        alert("Keine lokalen Daten zum Synchronisieren gefunden.");
        return;
      }

      const batch = writeBatch(db);
      localTasks.forEach(t => {
        const tRef = doc(db, 'users', user.uid, 'tasks', t.id);
        batch.set(tRef, t);
      });
      localCats.forEach(c => {
        const cRef = doc(db, 'users', user.uid, 'categories', c.id);
        batch.set(cRef, c);
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Zeitüberschreitung: Keine Verbindung zur Datenbank (Internet/Firewall-Problem).")), 10000);
      });

      await Promise.race([batch.commit(), timeoutPromise]);
      alert(`Erfolgreich ${localTasks.length} Aufgaben in die Cloud geladen!`);
    } catch (err) {
      console.error(err);
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
      deleteCategory,
      saveReadingSession,
      deleteReadingSession,
      updateReadingSession,
      getTodayDateString,
      saveCalorieLog,
      updateCalorieGoal,
      forceSync,
      isLoading
    }}>
      {children}
    </TaskContext.Provider>
  );
};
