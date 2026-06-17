import React from 'react';
import { Home, CheckSquare, Calendar, Folder, BarChart2, PlusSquare } from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView, isOpen, toggleSidebar }) => {
  const menuItems = [
    { id: 'home', label: 'Startseite', icon: <Home size={20} /> },
    { id: 'create', label: 'Aufgabe erstellen', icon: <PlusSquare size={20} /> },
    { id: 'tracker', label: 'Jahres-Tracker', icon: <BarChart2 size={20} /> },
    { id: 'longterm', label: 'Allgemeine To-Dos', icon: <CheckSquare size={20} /> },
    { id: 'categories', label: 'Kategorien', icon: <Folder size={20} /> },
  ];

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <CheckSquare size={24} color="var(--accent-primary)" />
          <span>TaskMaster</span>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentView(item.id);
                if (window.innerWidth <= 768) toggleSidebar();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="mobile-overlay" 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
