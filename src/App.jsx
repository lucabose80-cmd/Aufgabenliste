import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { TaskProvider } from './context/TaskContext';
import Sidebar from './components/Sidebar';
import TaskGrid from './components/TaskGrid';
import YearTracker from './components/YearTracker';
import CategoriesManager from './components/CategoriesManager';
import TaskCreator from './components/TaskCreator';
import Statistics from './components/Statistics';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { User } from 'lucide-react';

function MainApp() {
  const [currentView, setCurrentView] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, logout } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <TaskGrid view="all" />;
      case 'create':
        return <TaskCreator />;
      case 'tracker':
        return <YearTracker />;
      case 'statistics':
        return <Statistics />;
      case 'categories':
        return <CategoriesManager />;
      default:
        return <TaskGrid view="all" />;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'home': return 'Startseite';
      case 'create': return 'Neue Aufgabe erstellen';
      case 'tracker': return 'Jahres-Tracker';
      case 'statistics': return 'Statistiken';
      case 'categories': return 'Kategorien verwalten';
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <User size={20} />
                  <span style={{ fontSize: '0.9rem', display: 'none', '@media (min-width: 600px)': { display: 'inline' } }}>
                    {user.email}
                  </span>
                </div>
                <button className="btn btn-secondary" onClick={logout} style={{ padding: '0.5rem 1rem' }}>Logout</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setIsAuthModalOpen(true)} style={{ padding: '0.5rem 1rem' }}>Einloggen</button>
            )}
          </div>
        </header>
        {renderContent()}
      </main>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <MainApp />
      </TaskProvider>
    </AuthProvider>
  );
}

export default App;
