"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-[112px] z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-1">
            <Link
              href="/auth/lead-generation"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/auth/lead-generation'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Lead Generation
            </Link>
            <Link
              href="/auth/leads"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/auth/leads'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Leads
            </Link>
            <Link
              href="/auth/email-drafts"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/auth/email-drafts'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Email Drafts
            </Link>
          </div>
          <Link
            href="/auth/account-settings"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
