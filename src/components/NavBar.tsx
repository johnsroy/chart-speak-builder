
import React from "react";
import {
  Home as HomeIcon,
  LayoutDashboard as LayoutDashboardIcon,
  List as ListIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  Beaker as BeakerIcon,
  BarChart3 as BarChartIcon,
  Database as DatabaseIcon,
  BrainCircuit as BrainCircuitIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NavBar = () => {
  const { user, logout: signOut } = useAuth();
  const navigate = useNavigate();

  const navigationItems = [
    {
      name: "Home",
      path: "/",
      icon: <HomeIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboardIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Data Explorer",
      path: "/upload",
      icon: <DatabaseIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Visualizations",
      path: "/visualize",
      icon: <BarChartIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "AI Query",
      path: "/analyze",
      icon: <BrainCircuitIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <SettingsIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Test Tools",
      path: "/test",
      icon: <BeakerIcon className="h-5 w-5" />,
      adminOnly: false,
    },
  ];

  return (
    <nav className="backdrop-blur-lg bg-black/50 text-white py-4 px-6 flex items-center justify-between sticky top-0 z-50 border-b border-purple-500/20">
      {/* Logo and Navigation Links */}
      <div className="flex items-center">
        <span className="text-xl font-bold mr-6 text-gradient">
          GenBI
        </span>
        <ul className="hidden md:flex space-x-2">
          {navigationItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 disabled:pointer-events-none ${isActive ? 'bg-purple-800/50 text-white' : 'text-gray-300'}`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* User Avatar and Dropdown */}
      {user && (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  {/* Fix the user_metadata access by using optional chaining */}
                  <AvatarImage 
                    src={user.email?.charAt(0).toUpperCase() || "U"} 
                    alt={user.email || "User Avatar"} 
                  />
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mr-2 bg-gray-900/90 backdrop-blur-md border border-purple-500/30">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/account")} className="hover:bg-purple-500/20">
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="hover:bg-purple-500/20">
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="hover:bg-purple-500/20">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
