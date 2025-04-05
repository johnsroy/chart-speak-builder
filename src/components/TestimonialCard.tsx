
import React from 'react';

interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ quote, name, title }) => {
  return (
    <div className="glass-card p-6 flex flex-col items-start text-left">
      <div className="mb-4">
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-2xl font-semibold text-primary">{name.charAt(0)}</span>
        </div>
      </div>
      <p className="mb-6 text-gray-700">{quote}</p>
      <div className="mt-auto">
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
};

export default TestimonialCard;
