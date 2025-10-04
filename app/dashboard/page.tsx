import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  CogIcon,
  BoltIcon,
  BuildingOfficeIcon,
  ScaleIcon,
  CalculatorIcon,
  WrenchScrewdriverIcon,
  PresentationChartLineIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

export default async function DashboardPage() {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();

  const toolCategories = [
    {
      title: "Lead Management",
      description: "Capture, nurture, and convert potential clients",
      tools: [
        {
          name: "Lead Dashboard",
          description: "View and manage all your leads in one place",
          href: "/auth/leads",
          icon: UserGroupIcon,
          color: "bg-cyan-500"
        },
        {
          name: "SERP Settings",
          description: "Configure search keywords and parameters for lead generation",
          href: "/auth/serp-settings",
          icon: CogIcon,
          color: "bg-orange-500"
        }
      ]
    },
    {
      title: "Email Management",
      description: "Create and manage your email communications",
      tools: [
        {
          name: "Email Drafts",
          description: "Create, edit, and manage email drafts",
          href: "/auth/email-drafts",
          icon: DocumentTextIcon,
          color: "bg-indigo-500"
        }
      ]
    },
    {
      title: "Account & Profile",
      description: "Manage your account settings and profile",
      tools: [
        {
          name: "Account Settings",
          description: "Manage profile, billing, and notification preferences",
          href: "/auth/account-settings",
          icon: CogIcon,
          color: "bg-gray-500"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ShipsMind Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Welcome back, {user?.firstName || 'User'}!
              </span>
              <UserButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              AI Automation Tools for Your Business
            </h2>
            <p className="text-gray-600">
              Access all your business automation tools and insights in one place. Save 10+ hours per week with smart AI solutions.
            </p>
          </div>

          <div className="space-y-8">
            {toolCategories.map((category) => (
              <div key={category.title} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.tools.map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <Link
                          key={tool.name}
                          href={tool.href}
                          className="group relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 transition-all duration-200"
                        >
                          <div className={`flex-shrink-0 rounded-lg p-3 ${tool.color}`}>
                            <IconComponent className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="focus:outline-none">
                              <span className="absolute inset-0" aria-hidden="true" />
                              <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                {tool.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {tool.description}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <div className="flex items-center">
              <BoltIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-blue-900">Quick Actions</h3>
                <p className="text-blue-700">Get started with these commonly used features</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/auth/leads"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-200 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Leads
              </Link>
              <Link
                href="/auth/serp-settings"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-200 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                SERP Settings
              </Link>
              <Link
                href="/auth/email-drafts"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-200 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Email
              </Link>
              <Link
                href="/auth/account-settings"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-200 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Account Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}