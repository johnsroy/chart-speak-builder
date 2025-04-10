
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AuthNoticeProps {
  isAuthenticated: boolean;
  user: any;
  adminLogin: () => Promise<void>;
}

const AuthNotice: React.FC<AuthNoticeProps> = ({
  isAuthenticated,
  user,
  adminLogin
}) => {
  const navigate = useNavigate();
  
  if (isAuthenticated || user) return null;
  
  return (
    <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-lg mb-8 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-yellow-500" />
      <div>
        <p>You need to be logged in to upload and visualize data.</p>
        <div className="mt-2 flex gap-2">
          <Button variant="link" className="p-0 text-primary" onClick={() => navigate('/login')}>Log in</Button>
          <span>or</span>
          <Button variant="link" className="p-0 text-primary" onClick={adminLogin}>Use Admin Account</Button>
        </div>
      </div>
    </div>
  );
};

export default AuthNotice;
