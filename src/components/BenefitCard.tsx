
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface BenefitCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl p-8 flex flex-col items-start hover:bg-white/20 transition-all hover:shadow-xl group">
      <div className="p-3 bg-white/10 backdrop-blur-md rounded-full mb-5 group-hover:bg-primary/20 transition-all">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-medium mb-3 text-left">{title}</h3>
      <p className="text-muted-foreground text-left">{description}</p>
    </div>
  );
};

export default BenefitCard;
