import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const TaskContext = createContext();

export const useTaskContext = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('tasks');
    let loaded = saved ? JSON.parse(saved) : [];
    loaded = loaded.map(t => {
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
    return loaded;
  });

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Allgemein', color: '#6366f1' },
      { id: '2', name: 'Gesundheit', color: '#10b981' },
      { id: '3', name: 'Lernen', color: '#ec4899' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  const getTodayDateString = () => format(new Date(), 'yyyy-MM-dd');

  const addTask = (taskData) => {
    const newTask = {
      id: uuidv4(),
      title: taskData.title,
      categoryId: taskData.categoryId || '1',
      type: taskData.type || 'general',
      targetCount: taskData.targetCount || 1,
      specificDays: taskData.specificDays || [],
      hasTimer: taskData.hasTimer !== undefined ? taskData.hasTimer : true,
      subTasks: taskData.subTasks || [], // { id, title, completed }
      completedDates: [],
      timeSpent: 0, // total seconds historically
      timerLogs: [], // Array of { date, timeSpent, amount }
      averageSpeed: null, // e.g. "20.5 S/h"
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id, updates) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const toggleSubTask = (taskId, subTaskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const updatedSubTasks = task.subTasks.map(st => 
          st.id === subTaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...task, subTasks: updatedSubTasks };
      }
      return task;
    }));
  };

  const toggleTaskCompletion = (taskId, date = getTodayDateString()) => {
    let shouldDelete = false;

    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;
      
      const task = prev[taskIndex];
      const allSubTasksCompleted = task.subTasks.every(st => st.completed);
      if (!allSubTasksCompleted && task.subTasks.length > 0) {
        return prev; 
      }

      // If general task, delete it permanently
      if (task.type === 'general') {
        return prev.filter(t => t.id !== taskId);
      }

      const isCompletedOnDate = task.completedDates.includes(date);
      let newCompletedDates;
      
      if (isCompletedOnDate) {
        newCompletedDates = task.completedDates.filter(d => d !== date);
        
        // Remove timerLogs for this date and recalculate stats
        const newLogs = (task.timerLogs || []).filter(l => l.date !== date);
        const totalSeconds = newLogs.reduce((acc, log) => acc + log.timeSpent, 0);
        const totalAmount = newLogs.reduce((acc, log) => acc + log.amount, 0);
        let averageSpeed = null;
        if (totalAmount > 0 && totalSeconds > 0) {
          const hours = totalSeconds / 3600;
          const speed = (totalAmount / hours).toFixed(1);
          averageSpeed = `${speed} S/h`;
        }

        const nextTasks = [...prev];
        nextTasks[taskIndex] = { ...task, completedDates: newCompletedDates, timerLogs: newLogs, timeSpent: totalSeconds, averageSpeed };
        return nextTasks;

      } else {
        newCompletedDates = [...task.completedDates, date];
        const nextTasks = [...prev];
        nextTasks[taskIndex] = { ...task, completedDates: newCompletedDates };
        return nextTasks;
      }
    });
  };

  const addCategory = (name, color) => {
    setCategories([...categories, { id: uuidv4(), name, color }]);
  };

  const deleteCategory = (id) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const saveTimerSession = (taskId, timeSpent, amount = null, date = getTodayDateString()) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newLog = { date, timeSpent, amount: amount ? parseFloat(amount) : 0 };
        const updatedLogs = [...(task.timerLogs || []), newLog];
        
        const totalSeconds = updatedLogs.reduce((acc, log) => acc + log.timeSpent, 0);
        const totalAmount = updatedLogs.reduce((acc, log) => acc + log.amount, 0);
        
        let averageSpeed = task.averageSpeed;
        if (totalAmount > 0 && totalSeconds > 0) {
          const hours = totalSeconds / 3600;
          const speed = (totalAmount / hours).toFixed(1);
          averageSpeed = `${speed} S/h`;
        }
        
        return { ...task, timeSpent: totalSeconds, timerLogs: updatedLogs, averageSpeed };
      }
      return task;
    }));
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      categories,
      addTask,
      updateTask,
      deleteTask,
      toggleSubTask,
      toggleTaskCompletion,
      addCategory,
      deleteCategory,
      saveTimerSession,
      getTodayDateString
    }}>
      {children}
    </TaskContext.Provider>
  );
};
