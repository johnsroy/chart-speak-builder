
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Logo = () => {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="p-2 rounded-lg purple-gradient shadow-md">
        <BarChart3 className="h-5 w-5 text-white" />
      </div>
      <span className="font-bold text-2xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">GenBI</span>
    </Link>
  );
};

export default Logo;
