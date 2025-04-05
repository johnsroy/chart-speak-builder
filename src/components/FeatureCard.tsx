
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon: Icon, 
  title, 
  description,
  iconClassName = "text-primary" 
}) => {
  return (
    <div className="glass-card p-6 hover:shadow-xl transition-all">
      <div className="p-3 bg-secondary inline-flex rounded-lg mb-4">
        <Icon className={`h-6 w-6 ${iconClassName}`} />
      </div>
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default FeatureCard;
