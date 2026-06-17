import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { TaskProvider } from './context/TaskContext';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import Dashboard from './components/Dashboard';

function MainApp() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'daily':
        return <TaskList view="daily" />;
      case 'longterm':
        return <TaskList view="longterm" />;
      case 'categories':
        return <div className="card"><h2>Kategorien-Verwaltung kommt noch...</h2></div>;
      default:
        return <Dashboard />;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'daily': return 'Tägliche Routinen';
      case 'longterm': return 'Alle To-Dos';
      case 'categories': return 'Kategorien';
      default: return 'TaskMaster';
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn-icon mobile-menu-btn" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
            <h1 className="header-title">{getViewTitle()}</h1>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <TaskProvider>
      <MainApp />
    </TaskProvider>
  );
}

export default App;
