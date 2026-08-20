import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { listen } from '@tauri-apps/api/event';
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
  Sun,
  Moon,
  Home,
  ScrollText,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { acknowledgeAccessRequest } from '../services/api';
import { APP_VERSION } from '../version';
import ToastContainer from '../components/ToastContainer';
import type { Page } from '../types';

interface NavItem {
  page: Page;
  label: string;
  icon: ReactNode;
}

const pageRoles: Partial<Record<Page, string[]>> = {
  dashboard: ['Shift Supervisor', 'Shift In-Charge', 'Administrator'],
  'new-dip': ['Shift Supervisor', 'Shift In-Charge', 'Administrator'],
  'dip-verification': ['Shift In-Charge', 'Administrator'],
  'shift-closing': ['Shift In-Charge', 'Administrator'],
  'tank-status': ['Shift Supervisor', 'Shift In-Charge', 'Administrator'],
  exceptions: ['Shift In-Charge', 'Administrator'],
  'dip-history': ['Shift Supervisor', 'Shift In-Charge', 'Administrator'],
  'tank-trends': ['Shift In-Charge', 'Administrator'],
  reports: ['Shift In-Charge', 'Administrator'],
  'tank-master': ['Administrator'],
  'product-master': ['Administrator'],
  'operator-master': ['Administrator'],
  'tank-status-master': ['Administrator'],
  users: ['Administrator'],
  settings: ['Administrator'],
  'backup-restore': ['Administrator'],
  'audit-log': ['Administrator'],
};

interface NavSection {
  heading: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    heading: 'OVERVIEW',
    items: [
      { page: 'welcome', label: 'Welcome', icon: <Home size={20} strokeWidth={1.5} /> },
    ],
  },
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
      { page: 'changelog', label: 'Changelog', icon: <ScrollText size={20} strokeWidth={1.5} /> },
    ],
  },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentPage = useAppStore((s) => s.currentPage);
  const setPage = useAppStore((s) => s.setPage);
  const isCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });
  const [accessRequest, setAccessRequest] = useState<string | null>(null);
  const accessToastShown = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Another PC trying to open the app sends an "access-request" event. Show it once as
  // a toast and keep a dismissible banner until the user acknowledges it.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ identity: string }>('access-request', (event) => {
      const identity = event.payload?.identity || 'Another user';
      if (!accessToastShown.current) {
        useToastStore.getState().addToast(`${identity} is trying to open the application`, 'info');
        accessToastShown.current = true;
      }
      setAccessRequest(identity);
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

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

  const sidebarWidth = isCollapsed ? 'w-[68px]' : 'w-[248px]';

  return (
    <div className="flex h-screen w-screen bg-dragon-bg overflow-hidden">
      <aside
        ref={sidebarRef}
        className={`prl-sidebar relative flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarWidth} bg-dragon-card border-r border-dragon-border overflow-hidden`}
      >
        <div
          className="sidebar-active-indicator"
          style={{ top: `${indicatorStyle.top}px`, height: `${indicatorStyle.height}px` }}
        />

        <div className="flex items-center h-[76px] px-2.5 border-b border-dragon-border">
          {!isCollapsed && (
            <button onClick={() => setPage('dashboard')} className="prl-brand-panel h-[58px] flex-1 px-2.5 flex items-center justify-center" title="Pakistan Refinery Limited">
              <img src="/prl-logo.png" alt="Pakistan Refinery Limited" className="w-full h-[50px] object-contain" />
            </button>
          )}
          <button
            onClick={toggleSidebar}
            className={`window-btn ${isCollapsed ? 'mx-auto' : 'ml-2 flex-shrink-0'}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 py-3 overflow-y-auto content-scroll nav-3d">
          {navSections.map((section) => (
            <div key={section.heading} className="mb-1" style={{ transformStyle: 'preserve-3d' }}>
              {!isCollapsed && (
                <div className="prl-nav-heading px-3 py-1 text-[10px] font-bold tracking-[0.14em] uppercase">
                  {section.heading}
                </div>
              )}
              {section.items.filter((item) => !user || pageRoles[item.page]?.includes(user.role)).map((item) =>
                isCollapsed ? (
                  <button
                    key={item.page}
                    onClick={() => setPage(item.page)}
                    data-active={currentPage === item.page ? 'true' : 'false'}
                    title={item.label}
                    className={`nav-btn-3d flex items-center justify-center h-10 rounded-lg mx-1 w-[calc(100%-8px)] ${
                      currentPage === item.page
                        ? 'active prl-nav-active'
                        : 'prl-nav-item text-dragon-text-secondary hover:bg-dragon-accent/60 hover:text-dragon-text'
                    }`}
                  >
                    {item.icon}
                  </button>
                ) : (
                  <button
                    key={item.page}
                    onClick={() => setPage(item.page)}
                    data-active={currentPage === item.page ? 'true' : 'false'}
                    className={`nav-btn-3d flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-lg mx-1.5 w-[calc(100%-12px)] ${
                      currentPage === item.page
                        ? 'active prl-nav-active'
                        : 'prl-nav-item text-dragon-text-secondary hover:bg-dragon-accent/60 hover:text-dragon-text'
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
            <span className="text-[10px] font-semibold text-dragon-text-muted block text-center">{APP_VERSION}</span>
          ) : (
            <span className="text-[10px] font-semibold text-dragon-text-muted">v{APP_VERSION}</span>
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="titlebar">
          <div className="flex items-center gap-3">
            <div className="w-1 h-9 rounded-full bg-gradient-to-b from-dragon-primary to-dragon-secondary" />
            <div>
              <h1 className="text-sm font-semibold text-dragon-text">
                Tank Farm & Terminal Dip Recording Control Center
              </h1>
              <p className="text-[10px] text-dragon-text-muted">
                Pakistan Refinery Limited · Oil Movement
              </p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3 text-xs text-dragon-text-secondary" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-dragon-border bg-dragon-accent/30 hover:bg-dragon-accent/50 transition-all text-dragon-text-secondary hover:text-dragon-text"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <><Sun size={13} /><span className="text-[10px] font-medium">Light</span></>
                ) : (
                  <><Moon size={13} /><span className="text-[10px] font-medium">Dark</span></>
                )}
              </button>
              <span>{user.full_name}</span>
              <span className="text-dragon-text-muted">|</span>
              <span className="capitalize">{user.role}</span>
            </div>
          )}
        </header>

        {accessRequest && (
          <div className="notice-banner warning mx-4 mt-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AlertTriangle size={15} className="flex-none" />
              <span>
                <strong>{accessRequest}</strong> is trying to open the application. Only one user can use it at a time.
              </span>
            </span>
            <button
              type="button"
              onClick={() => { setAccessRequest(null); void acknowledgeAccessRequest(); }}
              className="btn btn-secondary btn-sm flex-none"
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto content-scroll">
          <div className="p-6 max-w-[1800px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
