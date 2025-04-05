
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface BenefitCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="glass-card p-8 flex flex-col items-start hover:shadow-xl transition-all">
      <div className="bg-secondary p-3 rounded-full mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-medium mb-2 text-left">{title}</h3>
      <p className="text-muted-foreground text-left">{description}</p>
    </div>
  );
};

export default BenefitCard;
