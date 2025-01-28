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
import { motion } from 'framer-motion';

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
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-700 px-6">
        <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Freelance
          </span>
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30
                  }}
                />
              )}
              <item.icon
                className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 relative z-10
                  ${isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                  }
                `}
                aria-hidden="true"
              />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              }
            }}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Account</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Manage your profile</span>
          </div>
        </div>
      </div>
    </div>
  );
} 