
import React from 'react';

interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ quote, name, title }) => {
  return (
    <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl p-6 flex flex-col items-start text-left h-full hover:bg-white/20 transition-all hover:shadow-xl">
      <div className="mb-6 text-3xl text-white/60">
        "
      </div>
      <p className="mb-6 text-gray-200 flex-grow italic">{quote}</p>
      <div className="mt-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">{name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
