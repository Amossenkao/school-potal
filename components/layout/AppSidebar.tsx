"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  MessageCircle,
  Users,
  GraduationCap,
  BookOpen,
  Shield,
  LayoutDashboard,
  UserCircle,
  CalendarDays,
  FilePen,
  ClipboardList,
  FileText,
  CheckSquare,
  Library,
  LogOut
} from "lucide-react";

// Define NavItem type
interface NavItem {
  name: string;
  icon: React.ComponentType<any>;
  href?: string;
  roles?: string[];
  excludeRoles?: string[];
  subItems?: NavItem[];
  disabled?: boolean;
}

const role = "vpi";

const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    name: "Users",
    icon: Users,
    roles: ["vpi"],
    subItems: [
      { name: "Students", href: "/students", icon: GraduationCap },
      { name: "Teachers", href: "/teachers", icon: BookOpen },
      { name: "Administrators", href: "/administrators", icon: Shield },
    ],
  },
  {
    name: "Grading",
    icon: CheckSquare,
    roles: ['vpi', 'teacher', 'student', 'parent'],
    subItems: [
      { name: "Add Grades", href: "/grades/add", icon: FilePen, roles: ['teacher'] },
      { name: "Submit Grades", href: "/grades/submit", icon: FilePen, roles: ['teacher'] },
      { name: "View Grades", href: "/grades/view", icon: FileText },
      { name: "Approve or Reject Grades", href: "/grades/approve", icon: FileText, roles: ['vpi'] },
    ],
  },
  {
    name: "Lesson Plans",
    icon: FileText,
    roles: ['teacher', 'vpi'],
    subItems: [
      { name: "Submit Lesson Plan", href: "/lesson-plans/submit", icon: FilePen, roles: ['teacher'] },
      { name: "Submit Scheme of Work", href: "/lesson-plans/scheme", icon: ClipboardList, roles: ['teacher'] },
      { name: "Manage Lesson Plans", href: "/lesson-plans/manage", icon: FileText, roles: ['teacher'] },
      { name: "View Lesson Plans", href: "/lesson-plans/view", icon: FileText, roles: ['vpi'] },
      { name: "View Scheme of Work", href: "/lesson-plans/scheme-view", icon: FileText, roles: ['vpi'] },
    ],
  },
  {
    name: "Classes",
    icon: ClipboardList,
    roles: ["vpi"],
    subItems: [
      { name: "Overview", href: "/classes/overview", icon: ClipboardList },
      { name: "Manage Classes", href: "/classes/manage", icon: FilePen },
      { name: "Master Grade Sheets", href: "/classes/master-sheets", icon: FileText },
    ],
  },
  {
    name: "Academic Reports",
    icon: FileText,
    roles: ["vpi"],
    subItems: [
      { name: "Periodic Reports", href: "/reports/periodic", icon: FileText },
      { name: "Yearly Reports", href: "/reports/yearly", icon: FileText },
      { name: "Other Reports", href: "/reports/other", icon: FileText },
    ],
  },
  {
    name: "Salary",
    icon: CalendarDays,
    excludeRoles: ["student", "parent", "supervisor", "proprietor"],
    subItems: [
      { name: "Request Salary Advance", href: "/salary/advance", icon: FilePen },
      { name: "Sign for Salary", href: "/salary/sign", icon: FilePen },
    ],
  },
  {
    name: "Calendar & Schedules",
    icon: CalendarDays,
    subItems: [
      { name: "Add Event to Calendar", href: "/calendar/add", icon: CalendarDays, roles: ['vpi'] },
      { name: "Academic Calendar", href: "/calendar/academic", icon: CalendarDays },
      { name: "Class Schedule", href: "/calendar/classes", icon: CalendarDays },
      { name: "Exam Schedule", href: "/calendar/exams", icon: CalendarDays },
    ],
  },
  {
    name: "Academic Resources",
    icon: Library,
    excludeRoles: ['parent'],
    subItems: [
      { name: "View Resources", href: "/resources/view", icon: FileText },
      { name: "Add a Resource", href: "/resources/add", icon: FilePen, roles: ["vpi", "vpa", "teacher"] },
      { name: "Manage Resources", href: "/resources/manage", icon: FileText, roles: ["vpi", "vpa", "teacher"] },
    ],
  },
  {
    name: "Messages",
    icon: MessageCircle,
    href: "/messages",
  },
  {
    name: "User Profile",
    icon: UserCircle,
    href: "/profile",
  },
  {
    name: "Logout",
    icon: LogOut,
    href: "/logout",
  },
];

function getNavItems(role: string): NavItem[] {
  return NAV_ITEMS
    .filter((item) => {
      if (item.excludeRoles?.includes(role)) return false;
      if (item.roles && !item.roles.includes(role)) return false;
      return true;
    })
    .map((item) => {
      if (item.subItems) {
        const visibleSubItems = item.subItems.filter((sub) => {
          if (sub.excludeRoles?.includes(role)) return false;
          if (sub.roles && !sub.roles.includes(role)) return false;
          return true;
        });

        if (visibleSubItems.length === 0) {
          return null;
        }

        return {
          ...item,
          subItems: visibleSubItems,
        };
      }

      return item;
    })
    .filter(Boolean) as NavItem[];
}

const navItems = getNavItems(role);

const AppSidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<{ type: "main"; index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pathname = window.location.pathname;

  const isActive = useCallback((href: string) => href === pathname, [patImghname]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) => (prev?.index === index ? null : { type: "main", index }));
  };

  useEffect(() => {
    navItems.forEach((nav, index) => {
      nav.subItems?.forEach((subItem) => {
        if (subItem.href && isActive(subItem.href)) {
          setOpenSubmenu({ type: "main", index });
        }
      });
    });
  }, [pathname, isActive]);

  useEffect(() => {
    if (openSubmenu) {
      const key = `main-${openSubmenu.index}`;
      const ref = subMenuRefs.current[key];
      if (ref) {
        setSubMenuHeight((prev) => ({ ...prev, [key]: ref.scrollHeight }));
      }
    }
  }, [openSubmenu]);

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items
        .filter((item) => {
          if (item.excludeRoles?.includes(role)) return false;
          if (item.roles && !item.roles.includes(role)) return false;
          return true;
        })
        .map((item, index) => {
          const subItems = item.subItems?.filter((sub) => {
            if (sub.excludeRoles?.includes(role)) return false;
            if (sub.roles && !sub.roles.includes(role)) return false;
            return true;
          });

          if (item.subItems && (!subItems || subItems.length === 0)) {
            return null;
          }

          return (
            <li key={item.name} className={item.disabled ? "hidden" : undefined}>
              {subItems ? (
                <button
                  onClick={() => handleSubmenuToggle(index)}
                  className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors ${
                    openSubmenu?.index === index
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span
                    className={`p-1 rounded-md ${
                      openSubmenu?.index === index
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="ml-3 text-sm font-medium">{item.name}</span>
                  )}
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <ChevronDown
                      className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                        openSubmenu?.index === index ? "rotate-180 text-blue-500" : ""
                      }`}
                    />
                  )}
                </button>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  <span
                    className={`p-1 rounded-md ${
                      isActive(item.href)
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="ml-3 text-sm font-medium">{item.name}</span>
                  )}
                </Link>
              ) : null}

              {subItems && (isExpanded || isHovered || isMobileOpen) && (
                <div
                  ref={(el) => {
                    subMenuRefs.current[`main-${index}`] = el;
                  }}
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    height:
                      openSubmenu?.index === index
                        ? `${subMenuHeight[`main-${index}`]}px`
                        : "0px",
                  }}
                >
                  <ul className="mt-2 space-y-1 ml-9">
                    {subItems
                      .filter((sub) => !!sub.href)
                      .map((sub) => (
                        <li key={sub.name}>
                          <Link
                            href={sub.href as string}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                              isActive(sub.href as string)
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                          >
                            {sub.icon && <sub.icon className="w-4 h-4" />}
                            <span>{sub.name}</span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 transition-all duration-300 ease-in-out ${
        isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`p-5 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="text-xl font-semibold text-gray-800 dark:text-white">SchoolERP</span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              S
            </div>
          )}
        </Link>
      </div>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:flex hidden absolute -right-3 top-10 w-6 h-6 bg-white rounded-full border border-gray-200 items-center justify-center text-gray-500 dark:bg-gray-800 dark:border-gray-700"
      >
        {isExpanded ? '←' : '→'}
      </button>
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-5 right-5 z-50 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500"
      >
        {isMobileOpen ? '✕' : '☰'}
      </button>
      <div className="h-[calc(100vh-80px)] overflow-y-auto py-5 px-3">
        <nav>
          {renderMenuItems(navItems)}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;