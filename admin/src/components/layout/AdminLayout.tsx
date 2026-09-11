import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/Toast';
import { useAdmin } from '../../context/AdminContext';

export const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { sidebarCollapsed } = useAdmin();

  return (
    <div className="min-h-screen bg-[#FFFDF9] font-sans text-[#202124] flex flex-col antialiased">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>

      {/* Global Toast notifications */}
      <ToastContainer />
    </div>
  );
};
