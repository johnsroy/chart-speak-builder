
import React from "react";
import {
  Home as HomeIcon,
  LayoutDashboard as LayoutDashboardIcon,
  List as ListIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  Beaker as BeakerIcon,
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
      name: "Test Tools",
      path: "/test",
      icon: <BeakerIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboardIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Datasets",
      path: "/upload",
      icon: <ListIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Account",
      path: "/account",
      icon: <UserIcon className="h-5 w-5" />,
      adminOnly: false,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <SettingsIcon className="h-5 w-5" />,
      adminOnly: false,
    },
  ];

  return (
    <nav className="bg-gray-900 text-white py-4 px-6 flex items-center justify-between">
      {/* Logo and Navigation Links */}
      <div className="flex items-center">
        <span className="text-xl font-bold mr-6">
          Data Analyzer
        </span>
        <ul className="flex space-x-4">
          {navigationItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-1 disabled:pointer-events-none data-[state=active]:bg-gray-800 data-[state=active]:text-white ${isActive ? 'active' : ''}`
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
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || "User Avatar"} />
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mr-2">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/account")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
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
