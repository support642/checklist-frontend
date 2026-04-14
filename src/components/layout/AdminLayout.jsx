/* eslint-disable no-unused-vars */
"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Database,
  ChevronDown,
  ChevronRight,
  Zap,
  Settings,
  CirclePlus,
  UserRound,
  CalendarCheck,
  BookmarkCheck,
  CrossIcon,
  X,
  History,
  Video,
  Calendar,
  Banknote,
  LayoutDashboard,
  FileText,
  RefreshCw,
  CreditCard,
  Share2,
  CheckCircle2,
  DollarSign,
  Ban,
  List,
  Landmark,
  FileCheck,
} from "lucide-react";
import { hasPageAccess, hasSystemAccess } from "../../utils/permissionUtils";

export default function AdminLayout({ children, darkMode, toggleDarkMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasDocsAccess, setHasDocsAccess] = useState(false);
  const [hasAssetsAccess, setHasAssetsAccess] = useState(false);
  const [hasRepairAccess, setHasRepairAccess] = useState(false);

  const [isUserPopupOpen, setIsUserPopupOpen] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = localStorage.getItem("user-name");
    const storedRole = localStorage.getItem("role");
    const storedEmail = localStorage.getItem("email_id");

    if (!storedUsername) {
      // Redirect to login if not authenticated
      navigate("/login");
      return;
    }

    setUsername(storedUsername);
    setUserRole(storedRole || "user");
    setUserEmail(storedEmail);
    
    // Use unified permission check for sidebar visibility
    setHasDocsAccess(hasSystemAccess("documentation"));
    setHasAssetsAccess(hasSystemAccess("assets"));
    setHasRepairAccess(hasSystemAccess("repair"));

    // Check if this is the super admin (username = 'admin')
    setIsSuperAdmin(storedUsername === "admin");
  }, [navigate]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user-name");
    localStorage.removeItem("role");
    localStorage.removeItem("email_id");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // Navigation structure
  const sidebarStructure = [
    {
      title: "Systems",
      icon: Database,
      children: [
        {
          title: "Checklist & Delegation",
          key: "checklist",
          children: [
            { name: "Dashboard", route: "/dashboard/admin", page: "dashboard", icon: Database },
            { name: "Quick Task", route: "/dashboard/quick-task", page: "quick_task", icon: Zap },
            { name: "Assign Task", route: "/dashboard/assign-task", page: "assign_task", icon: CheckSquare },
            { name: "Daily Working", route: "/dashboard/working-date", page: "working_date", icon: CalendarCheck },
            { name: "Delegation", route: "/dashboard/delegation", page: "delegation", icon: ClipboardList },
            { name: "Pending Task", route: "/dashboard/data/sales", page: "pending_task", icon: CalendarCheck },
            { name: "Admin Approval", route: "/dashboard/history", page: "admin_approval", icon: History },
            { name: "Calendar", route: "/dashboard/calendar", page: "calendar", icon: Calendar },
            { name: "Holiday List", route: "/dashboard/holidays", page: "holiday_management", icon: CalendarCheck },
          ]
        },
        ...(hasDocsAccess ? [{
          title: "Documentation & Subscription",
          key: "docs",
          children: [
            { name: "Dashboard", route: "/doc-sub/dashboard", page: "documentation", icon: LayoutDashboard },
            {
              title: "Resource Manager",
              key: "resource_manager",
              icon: FileText,
              children: [
                { name: "All Resources", route: "/doc-sub/resource-manager", page: "resource_manager", icon: List },
                {
                  title: "Renewals",
                  key: "renewals",
                  icon: RefreshCw,
                  children: [
                    { name: "Document Renewal", route: "/document/renewal", page: "document_renewal", icon: FileText },
                    { name: "Subscription Renewal", route: "/subscription/renewal", page: "subscription_renewal", icon: CreditCard },
                  ]
                },
                { name: "Document Shared", route: "/document/shared", page: "document_shared", icon: Share2 },
                { name: "Subscription Approval", route: "/subscription/approval", page: "subscription_approval", icon: CheckCircle2 },
                { name: "Subscription Payment", route: "/subscription/payment", page: "subscription_payment", icon: DollarSign },
              ]
            },
            {
              title: "Loan",
              key: "loan_group",
              icon: Landmark,
              children: [
                { name: "All Loan", route: "/loan/all", page: "loan", icon: List },
                { name: "Request Forecloser", route: "/loan/foreclosure", page: "loan_foreclosure", icon: Ban },
                { name: "Collect NOC", route: "/loan/noc", page: "loan_noc", icon: FileCheck },
              ]
            },
            { name: "Master", route: "/master", page: "master", icon: Database },
          ]
        }] : []),
        ...(hasAssetsAccess ? [{
          title: "Asset Management",
          key: "assets",
          children: [
            { name: "Dashboard", route: "/asset/dashboard", page: "asset_dashboard", icon: LayoutDashboard },
            { name: "All Products", route: "/asset/products", page: "all_products", icon: List },
          ]
        }] : []),

        ...(hasRepairAccess ? [{
          title: "Repair",
          key: "repair",
          children: [
            { name: "Dashboard", route: "/repair/dashboard", page: "repair_dashboard", icon: Database },
            { name: "Request Form", route: "/repair/request-form", page: "repair_request_form", icon: CheckSquare },
            { name: "Pending Request", route: "/repair/pending-request", page: "repair_pending_request", icon: ClipboardList },
            { name: "Request Approval", route: "/repair/request-approval", page: "repair_request_approval", icon: History },
          ]
        }] : []),
        { name: "Settings", route: "/dashboard/setting", page: "settings", icon: Settings },
      ]
    }
  ];

  const [openMenus, setOpenMenus] = useState(() => {
    const saved = localStorage.getItem("sidebar-open-menus");
    return saved ? JSON.parse(saved) : {
      systems: true,
      checklist: true,
      docs: false,
      resource_manager: false,
      renewals: false,
      subscription_group: false,
      payment_group: false,
      loan_group: false,
      assets: false,
      repair: false
    };
  });

  // Persist menu state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("sidebar-open-menus", JSON.stringify(openMenus));
  }, [openMenus]);

  const toggleMenu = (key) => {
    setOpenMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Sidebar Scroll Persistence logic
  const desktopNavRef = useRef(null);
  const mobileNavRef = useRef(null);

  const handleScroll = (e, key) => {
    sessionStorage.setItem(key, e.target.scrollTop);
  };

  // Restore scroll positions after mount and permissions are loaded
  useLayoutEffect(() => {
    const restoreScroll = () => {
      const savedDesktop = sessionStorage.getItem("sidebar-scroll-desktop");
      const savedMobile = sessionStorage.getItem("sidebar-scroll-mobile");

      if (savedDesktop && desktopNavRef.current) {
        desktopNavRef.current.scrollTop = parseInt(savedDesktop, 10);
      }
      if (savedMobile && mobileNavRef.current) {
        mobileNavRef.current.scrollTop = parseInt(savedMobile, 10);
      }
    };

    // Run immediately when layout updates
    restoreScroll();
    
    // Fallback for slower renders
    const timer = setTimeout(restoreScroll, 50);
    return () => clearTimeout(timer);
  }, [hasDocsAccess, hasAssetsAccess, hasRepairAccess, isMobileMenuOpen, openMenus]);

  // Helper to check if a group has any accessible children
  const hasAccessibleChildren = (item) => {
    if (item.route) return hasPageAccess(item.page);
    if (item.children) {
      return item.children.some(child => hasAccessibleChildren(child));
    }
    return false;
  };

  // Auto-expand menus based on current location
  useEffect(() => {
    const findAndExpand = (items) => {
      for (const item of items) {
        const isActive = item.route && (
          location.pathname === item.route || 
          (item.route !== "/" && item.route !== "/dashboard/admin" && location.pathname.startsWith(item.route))
        );
        
        if (isActive) return true;
        
        if (item.children) {
          const isChildActive = findAndExpand(item.children);
          if (isChildActive && item.key) {
            setOpenMenus(prev => ({ ...prev, [item.key]: true }));
            return true;
          }
        }
      }
      return false;
    };
    findAndExpand(sidebarStructure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, hasDocsAccess]);

  const renderNavItem = (item, depth = 0) => {
    const isAccessible = hasAccessibleChildren(item);
    if (!isAccessible) return null;

    const isActive = item.route && (location.pathname === item.route || (item.route !== "/dashboard/admin" && location.pathname.startsWith(item.route)));

    if (item.children) {
      const isOpen = item.key ? openMenus[item.key] : true; // Top level titles might not have keys and are always "open" or just headers
      
      return (
        <li key={item.title || item.key} className="space-y-1">
          {item.key ? (
            <button
              onClick={() => toggleMenu(item.key)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {item.icon && <item.icon className="h-4 w-4 text-blue-600" />}
                <span>{item.title}</span>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="px-3 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
              {item.title}
            </div>
          )}
          
          {isOpen && (
            <ul className={`${item.key ? "ml-4 border-l border-blue-100" : ""} space-y-1 mt-1`}>
              {item.children.map(child => renderNavItem(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.name}>
        <Link
          to={item.route}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
            ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700"
            : "text-gray-600 hover:bg-blue-50"
            }`}
        >
          {item.icon && (
            <item.icon
              className={`h-4 w-4 ${isActive ? "text-blue-600" : ""}`}
            />
          )}
          {item.name}
        </Link>
      </li>
    );
  };

  return (
    <div
      className={`flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50`}
    >
      {/* Sidebar for desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-blue-200 bg-white md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-blue-200 px-4 bg-gradient-to-r from-blue-100 to-purple-100">
          <Link
            to="/dashboard/admin"
            className="flex items-center gap-2 font-semibold text-blue-700"
          >
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <span>Checklist & Delegation </span>
          </Link>
        </div>
        <nav 
          ref={desktopNavRef}
          onScroll={(e) => handleScroll(e, "sidebar-scroll-desktop")}
          className="flex-1 overflow-y-auto p-2 scrollbar-thin"
        >
          <ul className="space-y-2">
            {sidebarStructure.map(group => renderNavItem(group))}
          </ul>
        </nav>
        <div className="border-t border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex flex-col">
            {/* User info section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center">
                  <span className="text-sm font-medium text-black">
                    {username ? username.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
                <div className="min-w-0 flex-1 flex flex-col items-start px-1 overflow-hidden">
                  <p className="text-sm font-medium text-blue-700 break-words w-full">
                    {username || "User"}
                  </p>
                  <p className="text-sm font-medium text-blue-700">
                    {userRole === "super_admin"
                      ? "(Super Admin)"
                      : (userRole === "admin" || userRole === "div_admin")
                      ? "(Admin)"
                      : ""}
                  </p>
                  <p className="text-xs text-blue-600 break-all">
                    {userEmail || "user@example.com"}
                  </p>
                </div>
              </div>

              {/* Dark mode toggle (if available) */}
              {toggleDarkMode && (
                <button
                  onClick={toggleDarkMode}
                  className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                >
                  {darkMode ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  )}
                  <span className="sr-only">
                    {darkMode ? "Light mode" : "Dark mode"}
                  </span>
                </button>
              )}
            </div>

            {/* Logout button positioned below user info */}
            <div className="mt-2 flex justify-center">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-100 text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-100 flex justify-center">
              <a
                href="https://www.botivate.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 group"
              >
                <span className="text-[10px] text-gray-500 group-hover:text-blue-600 transition-colors">Powered by</span>
                <span className="text-[11px] font-bold text-blue-600 group-hover:text-blue-700 transition-colors">BOTIVATE</span>
              </a>
            </div>
          </div>
      </aside>

      {/* Mobile menu button and sidebar - similar structure as desktop but with mobile classes */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden absolute left-4 top-3 z-50 text-blue-700 p-2 rounded-md hover:bg-blue-100"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </button>
      )}

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg flex flex-col">
            <div className="flex h-14 items-center border-b border-blue-200 px-4 bg-gradient-to-r from-blue-100 to-purple-100">
              <Link
                to="/dashboard/admin"
                className="flex items-center gap-2 font-semibold text-blue-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <span>Checklist & Delegation</span>
              </Link>
            </div>
            <nav 
              ref={mobileNavRef}
              onScroll={(e) => handleScroll(e, "sidebar-scroll-mobile")}
              className="flex-1 overflow-y-auto p-2 bg-white scrollbar-thin"
            >
              <ul className="space-y-2">
                {sidebarStructure.map(group => renderNavItem(group))}
              </ul>
            </nav>
            <div className="border-t border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center">
                    <span className="text-sm font-medium text-black">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                  <div className="flex flex-col items-start px-1 overflow-hidden">
                    <p className="text-sm font-medium text-blue-700 break-words w-full">
                      {username || "User"}
                    </p>
                    <p className="text-sm font-medium text-blue-700">
                      {userRole === "super_admin"
                        ? "(Super Admin)"
                        : (userRole === "admin" || userRole === "div_admin")
                        ? "(Admin)"
                        : ""}
                    </p>
                    <p className="text-xs text-blue-600 break-all">
                      {userEmail || "user@example.com"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {toggleDarkMode && (
                    <button
                      onClick={toggleDarkMode}
                      className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                    >
                      {darkMode ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646A9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                          />
                        </svg>
                      )}
                      <span className="sr-only">
                        {darkMode ? "Light mode" : "Dark mode"}
                      </span>
                    </button>
                  )}
                  
                </div>
              </div>
               <div className="mt-2 flex justify-center">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-100 text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-100 flex justify-center">
              <a
                href="https://www.botivate.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 group"
              >
                <span className="text-[10px] text-gray-500 group-hover:text-blue-600 transition-colors">Powered by</span>
                <span className="text-[11px] font-bold text-blue-600 group-hover:text-blue-700 transition-colors">BOTIVATE</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 md:h-14 items-center justify-between border-b border-blue-200 bg-white px-3 md:px-6">
          <div className="flex md:hidden w-6"></div>
          <h1 className="text-sm md:text-lg font-semibold text-blue-700">
            Checklist & Delegation
          </h1>
          <div className="flex items-center">
            <img
              src="/Rama_TMT_logo.png"
              alt="Company Logo"
              className="h-7 w-auto md:h-10 lg:h-12 transition-all duration-300"
            />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50">
          {children}

          {/* Clean Minimal Footer Navigation */}
          <div className="fixed md:left-64 left-0 right-0 bottom-0 z-10">
            {/* Mobile Bottom Navigation */}
            <div className="sm:hidden">
              {/* Navigation Bar */}
              <div className="flex justify-around items-center px-4 py-2 bg-white border-t border-gray-200 shadow-lg">
                {/* Home */}
                <Link
                  to="/dashboard/admin"
                  className={`flex flex-col items-center p-1.5 rounded-lg transition-all ${
                    location.pathname === '/dashboard/admin'
                      ? 'text-purple-600'
                      : 'text-gray-500 hover:text-purple-500'
                  }`}
                >
                  <Home size={20} strokeWidth={location.pathname === '/dashboard/admin' ? 2.5 : 2} />
                  <span className="text-[9px] mt-0.5 font-medium">Home</span>
                </Link>

                {/* Checklist */}
                <Link
                  to="/dashboard/data/sales"
                  className={`flex flex-col items-center p-1.5 rounded-lg transition-all ${
                    location.pathname === '/dashboard/data/sales'
                      ? 'text-purple-600'
                      : 'text-gray-500 hover:text-purple-500'
                  }`}
                >
                  <CalendarCheck size={20} strokeWidth={location.pathname === '/dashboard/data/sales' ? 2.5 : 2} />
                  <span className="text-[9px] mt-0.5 font-medium">Checklist</span>
                </Link>

                {/* Add Task - Floating Button */}
                <Link
                  to="/dashboard/assign-task"
                  className="relative -mt-6"
                >
                  <div className={`p-3 rounded-full shadow-lg gradient-bg transition-transform hover:scale-105 ${
                    location.pathname === '/dashboard/assign-task' ? 'scale-110 ring-2 ring-purple-300' : ''
                  }`}>
                    <CirclePlus size={22} className="text-white" strokeWidth={2} />
                  </div>
                </Link>

                {/* Tasks */}
                <Link
                  to="/dashboard/delegation"
                  className={`flex flex-col items-center p-1.5 rounded-lg transition-all ${
                    location.pathname === '/dashboard/delegation'
                      ? 'text-purple-600'
                      : 'text-gray-500 hover:text-purple-500'
                  }`}
                >
                  <BookmarkCheck size={20} strokeWidth={location.pathname === '/dashboard/delegation' ? 2.5 : 2} />
                  <span className="text-[9px] mt-0.5 font-medium">Tasks</span>
                </Link>

                {/* Profile */}
                <div
                  onClick={() => setIsUserPopupOpen(true)}
                  className="flex flex-col items-center p-1.5 rounded-lg cursor-pointer text-gray-500 hover:text-purple-500 transition-all"
                >
                  <UserRound size={20} strokeWidth={2} />
                  <span className="text-[9px] mt-0.5 font-medium">Profile</span>
                </div>
              </div>

              {/* Powered by Botivate - Compact */}
              <a
                href="https://www.botivate.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-[8px] text-gray-500">Powered by</span>
                <span className="text-[9px] font-bold text-purple-600">BOTIVATE</span>
              </a>
            </div>

          </div>
        </main>

        {/* User Popup */}
        {isUserPopupOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setIsUserPopupOpen(false)}
          >
            <div 
              className="bg-white rounded-lg p-6 w-80 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* <div onClick={() => setIsUserPopupOpen(false)}  className="flex justify-end"><X size={25}/></div> */}

              <div className="flex flex-col items-center justify-between">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-20 w-20 rounded-full gradient-bg flex items-center justify-center">
                    <span className="text-3xl font-medium text-white">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center w-full px-4 overflow-hidden">
                    <p className="text-sm font-medium text-blue-700 break-words w-full">
                      {username || "User"}
                    </p>
                    <p className="text-sm font-medium text-blue-700">
                      {userRole === "super_admin"
                        ? "(Super Admin)"
                        : (userRole === "admin" || userRole === "div_admin")
                        ? "(Admin)"
                        : ""}
                    </p>
                    <p className="text-xs text-blue-600 break-all">
                      {userEmail || "user@example.com"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center  justify-around w-full gap-2 mt-4">
                  <button
                    onClick={() => setIsUserPopupOpen(false)}
                    className="outline p-1 rounded-md px-2"
                  >
                    <span className="flex justify-center items-center">
                      Cancel
                    </span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="bg-blue-700 text-white hover:bg-blue-900 p-1 rounded-md px-2"
                  >
                    <span className="flex justify-center items-center">
                      Log out <LogOut className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
