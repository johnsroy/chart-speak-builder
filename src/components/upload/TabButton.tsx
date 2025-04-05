
import React from 'react';

interface TabButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ active, icon, label, onClick }) => (
  <button 
    className={`px-5 py-2 rounded-lg flex items-center ${active ? 'bg-primary text-white' : 'hover:bg-white/50'}`} 
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
);

export default TabButton;
