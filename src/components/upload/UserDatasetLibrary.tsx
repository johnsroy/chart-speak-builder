
import React from 'react';
import { Database } from 'lucide-react';

const UserDatasetLibrary: React.FC = () => {
  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-medium mb-4">Your Dataset Library</h2>
      <div className="text-center py-12">
        <div className="p-4 bg-secondary rounded-full inline-block mb-4">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-medium mb-2">Dataset Library</h3>
        <p className="text-gray-400 mb-4">Manage and explore your uploaded datasets</p>
        <p className="text-sm text-gray-500">Coming soon with expanded functionality</p>
      </div>
    </div>
  );
};

export default UserDatasetLibrary;
