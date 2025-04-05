
import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Button } from '@/components/ui/button';

const NavBar = () => {
  return (
    <nav className="w-full px-4 py-4">
      <div className="mx-auto container flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        
        <div className="hidden md:flex space-x-6 items-center">
          <NavLink href="/features">Features</NavLink>
          <NavLink href="/benefits">Benefits</NavLink>
          <NavLink href="/how-it-works">How It Works</NavLink>
          <NavLink href="/testimonials">Testimonials</NavLink>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to="/upload">
            <Button variant="outline" className="bg-white/80">Upload Data</Button>
          </Link>
          <Link to="/signup">
            <Button className="purple-gradient">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <Link to={href} className="text-gray-600 hover:text-primary transition-colors">
    {children}
  </Link>
);

export default NavBar;
