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
  Users,
  ListChecks,
  Shield,
  Settings,
  DatabaseBackup,
  FileSearch,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
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
      { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { page: 'new-dip', label: 'New Dip', icon: <PenLine size={18} /> },
      { page: 'dip-verification', label: 'Dip Verification', icon: <ClipboardCheck size={18} /> },
      { page: 'shift-closing', label: 'Shift Closing', icon: <CalendarCheck size={18} /> },
      { page: 'tank-status', label: 'Tank Status', icon: <Activity size={18} /> },
      { page: 'exceptions', label: 'Exceptions', icon: <AlertTriangle size={18} /> },
    ],
  },
  {
    heading: 'RECORDS',
    items: [
      { page: 'dip-history', label: 'Dip History', icon: <History size={18} /> },
      { page: 'tank-trends', label: 'Tank Trends', icon: <TrendingUp size={18} /> },
      { page: 'reports', label: 'Reports', icon: <FileText size={18} /> },
    ],
  },
  {
    heading: 'MASTER DATA',
    items: [
      { page: 'tank-master', label: 'Tank Master', icon: <Cylinder size={18} /> },
      { page: 'product-master', label: 'Product Master', icon: <Droplets size={18} /> },
      { page: 'operator-master', label: 'Operator Master', icon: <Users size={18} /> },
      { page: 'tank-status-master', label: 'Tank Status Master', icon: <ListChecks size={18} /> },
    ],
  },
  {
    heading: 'SYSTEM',
    items: [
      { page: 'users', label: 'Users', icon: <Shield size={18} /> },
      { page: 'settings', label: 'Settings', icon: <Settings size={18} /> },
      { page: 'backup-restore', label: 'Backup & Restore', icon: <DatabaseBackup size={18} /> },
      { page: 'audit-log', label: 'Audit Log', icon: <FileSearch size={18} /> },
    ],
  },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const currentPage = useAppStore((s) => s.currentPage);
  const setPage = useAppStore((s) => s.setPage);

  return (
    <div className="flex h-screen w-screen bg-slate-100">
      <aside
        className={`flex flex-col bg-slate-900 text-slate-300 transition-all duration-200 flex-shrink-0 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex items-center h-12 px-3 border-b border-slate-700">
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold text-white tracking-wide truncate">
              TANK FARM CONTROL
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className={`text-slate-400 hover:text-white transition-colors ${
              sidebarCollapsed ? 'mx-auto' : 'ml-auto'
            }`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navSections.map((section) => (
            <div key={section.heading} className="mb-2">
              {!sidebarCollapsed && (
                <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  {section.heading}
                </div>
              )}
              {section.items.map((item) => (
                <button
                  key={item.page}
                  onClick={() => setPage(item.page)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    currentPage === item.page
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {!sidebarCollapsed && user && (
          <div className="border-t border-slate-700 p-3">
            <div className="text-xs text-slate-500">Signed in as</div>
            <div className="text-sm font-medium text-white truncate">{user.full_name}</div>
            <div className="text-xs text-slate-400">{user.role}</div>
            <button
              onClick={logout}
              className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0">
          <h1 className="text-sm font-semibold text-slate-700 truncate">
            Tank Farm & Terminal Dip Recording Control Center
          </h1>
        </header>

        <main className="flex-1 overflow-auto p-4">{children}</main>

        <footer className="h-8 bg-slate-900 text-slate-400 flex items-center px-4 text-[11px] flex-shrink-0 gap-4">
          {user && (
            <>
              <span>User: {user.full_name}</span>
              <span>|</span>
              <span>Role: {user.role}</span>
            </>
          )}
          <span>|</span>
          <span>v0.1.4</span>
        </footer>
      </div>
    </div>
  );
}
