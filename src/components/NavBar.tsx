
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className={`fixed top-0 left-0 w-full px-4 py-4 z-50 transition-all duration-300 ${
      scrolled ? 'backdrop-blur-lg bg-black/20 border-b border-white/10' : ''
    }`}>
      <div className="mx-auto container flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-8 items-center">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#benefits">Benefits</NavLink>
          <NavLink href="#how-it-works">How It Works</NavLink>
          <NavLink href="#testimonials">Testimonials</NavLink>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="p-2 rounded-md bg-white/10 backdrop-blur-md"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/upload">
                <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20">
                  Upload Data
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20">
                    {user?.name || user?.email || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20">
                  Login
                </Button>
              </Link>
              <Link to="/login">
                <Button className="purple-gradient">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 backdrop-blur-xl bg-black/50 border-b border-white/10 animate-fade-in">
          <div className="flex flex-col space-y-4 p-4">
            <MobileNavLink href="#features" onClick={() => setIsMenuOpen(false)}>Features</MobileNavLink>
            <MobileNavLink href="#benefits" onClick={() => setIsMenuOpen(false)}>Benefits</MobileNavLink>
            <MobileNavLink href="#how-it-works" onClick={() => setIsMenuOpen(false)}>How It Works</MobileNavLink>
            <MobileNavLink href="#testimonials" onClick={() => setIsMenuOpen(false)}>Testimonials</MobileNavLink>
            <div className="flex flex-col space-y-2 pt-2">
              {isAuthenticated ? (
                <>
                  <Link to="/upload" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full bg-white/10 border-white/20">
                      Upload Data
                    </Button>
                  </Link>
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full bg-white/10 border-white/20">
                      Login
                    </Button>
                  </Link>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full purple-gradient">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <a 
    href={href} 
    className="text-gray-200 hover:text-white transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-primary/80 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
  >
    {children}
  </a>
);

const MobileNavLink = ({ href, children, onClick }: { href: string, children: React.ReactNode, onClick: () => void }) => (
  <a 
    href={href} 
    className="text-gray-200 hover:text-white py-2 border-b border-white/10 block"
    onClick={onClick}
  >
    {children}
  </a>
);

export default NavBar;
