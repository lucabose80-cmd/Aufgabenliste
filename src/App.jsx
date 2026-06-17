import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { TaskProvider } from './context/TaskContext';
import Sidebar from './components/Sidebar';
import TaskGrid from './components/TaskGrid';
import YearTracker from './components/YearTracker';
import CategoriesManager from './components/CategoriesManager';
import TaskCreator from './components/TaskCreator';
import Statistics from './components/Statistics';
import Review from './components/Review';
import ReadingSpeed from './components/ReadingSpeed';
import Calories from './components/Calories';
import AuthModal from './components/AuthModal';
import NotificationManager from './components/NotificationManager';
import Settings from './components/Settings';
import ShoppingList from './components/ShoppingList';
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
      case 'review':
        return <Review />;
      case 'create':
        return <TaskCreator />;
      case 'tracker':
        return <YearTracker />;
      case 'statistics':
        return <Statistics />;
      case 'reading-speed':
        return <ReadingSpeed />;
      case 'calories':
        return <Calories />;
      case 'categories':
        return <CategoriesManager />;
      case 'settings':
        return <Settings />;
      case 'shopping':
        return <ShoppingList />;
      default:
        return <TaskGrid view="all" />;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'home': return 'Startseite';
      case 'review': return 'Monats- & Jahresrückblick';
      case 'create': return 'Neue Aufgabe erstellen';
      case 'tracker': return 'Jahres-Tracker';
      case 'statistics': return 'Statistiken';
      case 'reading-speed': return 'Lesegeschwindigkeit';
      case 'calories': return 'Kalorienziel';
      case 'categories': return 'Kategorien verwalten';
      case 'settings': return 'Einstellungen';
      case 'shopping': return 'Einkaufsliste';
      default: return 'TaskMaster';
    }
  };

  return (
    <div className="app-container">
      <NotificationManager />
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
