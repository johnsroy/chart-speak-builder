
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
    <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl p-6 hover:shadow-xl transition-all hover:bg-white/20 hover:scale-105 group">
      <div className="p-3 bg-white/10 backdrop-blur-sm inline-flex rounded-lg mb-4 group-hover:bg-primary/20 transition-all">
        <Icon className={`h-6 w-6 ${iconClassName}`} />
      </div>
      <h3 className="text-xl font-medium mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default FeatureCard;
