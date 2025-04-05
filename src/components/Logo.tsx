
import React from 'react';
import { BarChart3 } from 'lucide-react';

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-md purple-gradient">
        <BarChart3 className="h-5 w-5 text-white" />
      </div>
      <span className="font-bold text-xl text-gradient">GenBI</span>
    </div>
  );
};

export default Logo;
