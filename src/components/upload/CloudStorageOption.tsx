
import React from 'react';

interface CloudStorageOptionProps {
  name: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}

const CloudStorageOption: React.FC<CloudStorageOptionProps> = ({ name, icon, onClick, isActive = false }) => (
  <button 
    className={`p-4 border rounded-lg flex flex-col items-center transition-colors ${isActive ? 'bg-primary/10 border-primary' : 'border-gray-200 hover:bg-white/50'}`} 
    onClick={onClick}
  >
    {icon}
    <span className="mt-2 text-sm">{name}</span>
  </button>
);

export default CloudStorageOption;
