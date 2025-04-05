
import React from 'react';
import TestimonialCard from './TestimonialCard';

const Testimonials = () => {
  const testimonials = [
    {
      quote: "GenBI has transformed how we analyze our sales data. What used to take days now takes minutes, and the insights are incredible.",
      name: "Sarah Johnson",
      title: "VP of Sales, TechCorp"
    },
    {
      quote: "The natural language interface is a game-changer. Our entire team can now access data insights without needing to learn SQL or complex tools.",
      name: "Michael Chen",
      title: "Data Analyst, FinanceIQ"
    },
    {
      quote: "We've tried many BI tools, but GenBI stands out with its ease of use and powerful AI capabilities. It's become essential to our operations.",
      name: "Jessica Williams",
      title: "CTO, RetailNow"
    }
  ];

  return (
    <section className="py-20 px-4" id="testimonials">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-primary mb-4">
            ⭐ Testimonials
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gradient">What Our Customers Say</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Don't just take our word for it. See what data professionals and business leaders have to say about GenBI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={index}
              quote={testimonial.quote}
              name={testimonial.name}
              title={testimonial.title}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
