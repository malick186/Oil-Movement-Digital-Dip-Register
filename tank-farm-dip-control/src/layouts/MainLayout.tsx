import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  PenLine,
  ClipboardCheck,
  CalendarCheck,
  Activity,
  AlertTriangle,
  History,
  TrendingUp,
  FileText,
  Cylinder,
  Droplets,
  Shield,
  Settings,
  DatabaseBackup,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Fuel,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import ToastContainer from '../components/ToastContainer';
import type { Page } from '../types';

interface NavItem {
  page: Page;
  label: string;
  icon: ReactNode;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    heading: 'OPERATIONS',
    items: [
      { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
      { page: 'new-dip', label: 'New Dip', icon: <PenLine size={20} strokeWidth={1.5} /> },
      { page: 'dip-verification', label: 'Dip Verification', icon: <ClipboardCheck size={20} strokeWidth={1.5} /> },
      { page: 'shift-closing', label: 'Shift Closing', icon: <CalendarCheck size={20} strokeWidth={1.5} /> },
      { page: 'tank-status', label: 'Tank Status', icon: <Activity size={20} strokeWidth={1.5} /> },
      { page: 'exceptions', label: 'Exceptions', icon: <AlertTriangle size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    heading: 'RECORDS',
    items: [
      { page: 'dip-history', label: 'Dip History', icon: <History size={20} strokeWidth={1.5} /> },
      { page: 'tank-trends', label: 'Tank Trends', icon: <TrendingUp size={20} strokeWidth={1.5} /> },
      { page: 'reports', label: 'Reports', icon: <FileText size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    heading: 'MASTER DATA',
    items: [
      { page: 'tank-master', label: 'Tank Master', icon: <Cylinder size={20} strokeWidth={1.5} /> },
      { page: 'product-master', label: 'Product Master', icon: <Droplets size={20} strokeWidth={1.5} /> },
      { page: 'operator-master', label: 'Operator Master', icon: <Shield size={20} strokeWidth={1.5} /> },
      { page: 'tank-status-master', label: 'Tank Status Master', icon: <Activity size={20} strokeWidth={1.5} /> },
    ],
  },
  {
    heading: 'SYSTEM',
    items: [
      { page: 'users', label: 'Users', icon: <Shield size={20} strokeWidth={1.5} /> },
      { page: 'settings', label: 'Settings', icon: <Settings size={20} strokeWidth={1.5} /> },
      { page: 'backup-restore', label: 'Backup & Restore', icon: <DatabaseBackup size={20} strokeWidth={1.5} /> },
      { page: 'audit-log', label: 'Audit Log', icon: <FileSearch size={20} strokeWidth={1.5} /> },
    ],
  },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const currentPage = useAppStore((s) => s.currentPage);
  const setPage = useAppStore((s) => s.setPage);

  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });
  const sidebarRef = useRef<HTMLElement>(null);

  const updateIndicator = useCallback(() => {
    if (isCollapsed) {
      setIndicatorStyle({ top: 0, height: 0 });
      return;
    }
    if (!sidebarRef.current) return;
    const activeBtn = sidebarRef.current.querySelector('[data-active="true"]');
    if (!activeBtn) {
      setIndicatorStyle({ top: 0, height: 0 });
      return;
    }
    const sidebarRect = sidebarRef.current.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setIndicatorStyle({
      top: btnRect.top - sidebarRect.top,
      height: btnRect.height,
    });
  }, [isCollapsed]);

  useEffect(() => {
    const raf = requestAnimationFrame(updateIndicator);
    return () => cancelAnimationFrame(raf);
  }, [currentPage, isCollapsed, updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  const sidebarWidth = isCollapsed ? 'w-[56px]' : 'w-[220px]';

  return (
    <div className="flex h-screen w-screen bg-dragon-bg overflow-hidden">
      <aside
        ref={sidebarRef}
        className={`relative flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarWidth} bg-dragon-card border-r border-dragon-border overflow-hidden`}
      >
        <div
          className="sidebar-active-indicator"
          style={{ top: `${indicatorStyle.top}px`, height: `${indicatorStyle.height}px` }}
        />

        <div className="flex items-center h-[50px] px-3 border-b border-dragon-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Fuel size={18} className="text-dragon-primary" />
              <span className="text-sm font-semibold text-dragon-text tracking-wide">
                TANK FARM
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`window-btn ${isCollapsed ? 'mx-auto' : 'ml-auto'}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 py-3 overflow-y-auto content-scroll">
          {navSections.map((section) => (
            <div key={section.heading} className="mb-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-dragon-text-muted uppercase">
                  {section.heading}
                </div>
              )}
              {section.items.map((item) =>
                isCollapsed ? (
                  <button
                    key={item.page}
                    onClick={() => setPage(item.page)}
                    data-active={currentPage === item.page ? 'true' : 'false'}
                    title={item.label}
                    className={`flex items-center justify-center h-10 rounded-lg mx-1 transition-colors duration-150 w-[calc(100%-8px)] ${
                      currentPage === item.page
                        ? 'bg-dragon-primary/10 text-dragon-primary'
                        : 'text-dragon-text-secondary hover:bg-dragon-accent/60 hover:text-dragon-text'
                    }`}
                  >
                    {item.icon}
                  </button>
                ) : (
                  <button
                    key={item.page}
                    onClick={() => setPage(item.page)}
                    data-active={currentPage === item.page ? 'true' : 'false'}
                    className={`flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-lg mx-1.5 transition-colors duration-150 w-[calc(100%-12px)] ${
                      currentPage === item.page
                        ? 'bg-dragon-primary/10 text-dragon-primary'
                        : 'text-dragon-text-secondary hover:bg-dragon-accent/60 hover:text-dragon-text'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              )}
            </div>
          ))}
        </nav>

        {user && (
          <div className={`flex-shrink-0 border-t border-dragon-border ${isCollapsed ? 'px-1 py-3' : 'px-4 py-3'}`}>
            {isCollapsed ? (
              <button
                onClick={logout}
                className="flex items-center justify-center w-full h-8 rounded-lg text-dragon-text-muted hover:text-dragon-danger hover:bg-dragon-accent/40 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <div>
                <div className="text-[10px] font-medium text-dragon-text-muted truncate">
                  {user.full_name}
                </div>
                <div className="text-[10px] text-dragon-text-muted/70 capitalize">
                  {user.role}
                </div>
                <button
                  onClick={logout}
                  className="mt-2 text-[11px] text-dragon-text-muted hover:text-dragon-danger transition-colors flex items-center gap-1"
                >
                  <LogOut size={12} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        <div className={`flex-shrink-0 border-t border-dragon-border ${isCollapsed ? 'px-1 py-2' : 'px-4 py-2'}`}>
          {isCollapsed ? (
            <span className="text-[10px] font-semibold text-dragon-text-muted block text-center">0.1.4</span>
          ) : (
            <span className="text-[10px] font-semibold text-dragon-text-muted">v0.1.4</span>
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="titlebar">
          <div className="flex items-center gap-3">
            <Fuel size={18} className="text-dragon-primary" />
            <div>
              <h1 className="text-sm font-semibold text-dragon-text">
                Tank Farm & Terminal Dip Recording Control Center
              </h1>
              <p className="text-[10px] text-dragon-text-muted">
                Oil Movement Digital Dip Register
              </p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3 text-xs text-dragon-text-secondary" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <span>{user.full_name}</span>
              <span className="text-dragon-text-muted">|</span>
              <span className="capitalize">{user.role}</span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto content-scroll">
          <div className="p-6 max-w-[1800px] mx-auto">
            <div className="anim-fade-up">
              {children}
            </div>
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
