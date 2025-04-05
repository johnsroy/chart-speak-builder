
import React from 'react';
import Logo from './Logo';
import { Twitter, Linkedin, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white/50 pt-16 pb-8 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-4 text-muted-foreground text-left">
              Transform your data experience with AI-powered visualizations.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-primary">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="font-semibold mb-4 text-left">Product</h3>
            <ul className="space-y-2 text-left">
              <FooterLink href="/features">Features</FooterLink>
              <FooterLink href="/benefits">Benefits</FooterLink>
              <FooterLink href="/upload">Upload Data</FooterLink>
              <FooterLink href="/how-it-works">How It Works</FooterLink>
            </ul>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="font-semibold mb-4 text-left">Resources</h3>
            <ul className="space-y-2 text-left">
              <FooterLink href="/documentation">Documentation</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
              <FooterLink href="/tutorials">Tutorials</FooterLink>
              <FooterLink href="/support">Support</FooterLink>
            </ul>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="font-semibold mb-4 text-left">Company</h3>
            <ul className="space-y-2 text-left">
              <FooterLink href="/about">About Us</FooterLink>
              <FooterLink href="/careers">Careers</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
              <FooterLink href="/testimonials">Testimonials</FooterLink>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <p>© 2025 GenBI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <li>
    <a href={href} className="text-gray-600 hover:text-primary transition-colors">
      {children}
    </a>
  </li>
);

export default Footer;
