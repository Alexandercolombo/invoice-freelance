'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardDocumentListIcon },
  { name: 'Clients', href: '/dashboard/clients', icon: UserGroupIcon },
  { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentTextIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-y-2">
      <div className="flex h-14 shrink-0 items-center border-b border-gray-200 dark:border-gray-700 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Freelance
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors duration-200
                ${isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <item.icon
                className={`h-5 w-5 flex-shrink-0 transition-colors duration-200
                  ${isActive
                    ? 'text-white dark:text-gray-900'
                    : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                  }
                `}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-2">
          <UserButton afterSignOutUrl="/" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Account</span>
        </div>
      </div>
    </div>
  );
} 