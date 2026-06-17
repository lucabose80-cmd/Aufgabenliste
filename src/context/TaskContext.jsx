import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const TaskContext = createContext();

export const useTaskContext = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('tasks');
    return saved ? JSON.parse(saved) : [];
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
      isDaily: taskData.isDaily || false,
      hasTimer: taskData.hasTimer !== undefined ? taskData.hasTimer : true,
      subTasks: taskData.subTasks || [], // { id, title, completed }
      completedDates: [],
      timeSpent: 0, // in seconds
      note: '',
      averageSpeed: null, // e.g. "20.5 Seiten/h"
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
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        // Can only complete if all subtasks are completed
        const allSubTasksCompleted = task.subTasks.every(st => st.completed);
        if (!allSubTasksCompleted && task.subTasks.length > 0) {
          return task; // Do not toggle if subtasks exist and are not completed
        }

        const isCompletedOnDate = task.completedDates.includes(date);
        let newCompletedDates;
        
        if (isCompletedOnDate) {
          newCompletedDates = task.completedDates.filter(d => d !== date);
        } else {
          newCompletedDates = [...task.completedDates, date];
        }
        
        return { ...task, completedDates: newCompletedDates };
      }
      return task;
    }));
  };

  const addCategory = (name, color) => {
    setCategories([...categories, { id: uuidv4(), name, color }]);
  };

  const deleteCategory = (id) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const saveTaskNoteAndTime = (taskId, note, timeSpent, amount = null) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        let averageSpeed = task.averageSpeed;
        const totalSeconds = task.timeSpent + timeSpent;
        
        if (amount && !isNaN(amount) && totalSeconds > 0) {
          const hours = totalSeconds / 3600;
          const speed = (parseFloat(amount) / hours).toFixed(1);
          averageSpeed = `${speed}/h`;
        }
        
        return { ...task, note, timeSpent: totalSeconds, averageSpeed };
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
      saveTaskNoteAndTime,
      getTodayDateString
    }}>
      {children}
    </TaskContext.Provider>
  );
};
