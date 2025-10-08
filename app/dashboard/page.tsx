"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, useUser } from '@clerk/nextjs';
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalLeads: number;
  unreviewedLeads: number;
  emailDrafts: number;
  exportedEmails: number;
  leadsThisWeek: number;
  accountSettingsComplete: boolean;
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    unreviewedLeads: 0,
    emailDrafts: 0,
    exportedEmails: 0,
    leadsThisWeek: 0,
    accountSettingsComplete: false,
  });
  const [userAccountId, setUserAccountId] = useState<number | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/sign-in";
    } else if (isLoaded && isSignedIn && userId) {
      loadDashboardData();
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadDashboardData = async () => {
    setIsLoading(true);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      // Get user account
      const { data: userData, error: userError } = await supabase
        .from('user_accounts')
        .select('id, user_firstname, user_lastname, business_name, business_url, email_current_goal, email_sig')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.error('Error loading user account:', userError);
        return;
      }

      if (!userData) {
        return;
      }

      setUserAccountId(userData.id);

      // Check if account settings are complete
      const accountSettingsComplete = !!(
        userData.user_firstname &&
        userData.user_lastname &&
        userData.business_name &&
        userData.business_url
      );

      // Get total leads count
      const { count: totalLeadsCount } = await supabase
        .from('user_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .is('excluded', null);

      // Get unreviewed leads (not emailed, not excluded, has email)
      const { data: allUserLeads } = await supabase
        .from('user_leads')
        .select('lead_id, emailed')
        .eq('user_id', userData.id)
        .is('excluded', null)
        .is('emailed', null);

      const leadIds = (allUserLeads || []).map(ul => ul.lead_id);

      let unreviewedCount = 0;
      if (leadIds.length > 0) {
        const { data: leadsWithEmail } = await supabase
          .from('serp_leads_v2')
          .select('id')
          .in('id', leadIds)
          .not('email', 'is', null)
          .neq('email', 'EmailNotFound');

        unreviewedCount = leadsWithEmail?.length || 0;
      }

      // Get email drafts count (not exported)
      const { count: emailDraftsCount } = await supabase
        .from('email_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .is('exported', null);

      // Get exported emails count
      const { count: exportedEmailsCount } = await supabase
        .from('email_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .not('exported', 'is', null);

      // Get leads added this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { count: leadsThisWeekCount } = await supabase
        .from('user_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .gte('created_at', oneWeekAgo.toISOString());

      setStats({
        totalLeads: totalLeadsCount || 0,
        unreviewedLeads: unreviewedCount,
        emailDrafts: emailDraftsCount || 0,
        exportedEmails: exportedEmailsCount || 0,
        leadsThisWeek: leadsThisWeekCount || 0,
        accountSettingsComplete,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Manage your lead generation workflow
            </p>
          </div>
          <Link href="/auth/account-settings">
            <Button variant="outline">Account Settings</Button>
          </Link>
        </div>

        {/* Workflow Stepper */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center justify-center gap-2 min-w-max px-4 py-6 bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Step 1: Lead Generation */}
            <div className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  stats.totalLeads > 0 ? 'bg-green-500 border-green-500 text-white' : 'bg-brand-500 border-brand-500 text-white'
                }`}>
                  <span className="text-sm font-semibold">1</span>
                </div>
                <span className="mt-2 text-xs font-medium text-gray-700 text-center whitespace-nowrap">Lead Generation</span>
                <span className="text-xs text-gray-500">{stats.totalLeads} leads</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center pb-8">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Step 2: Lead Management */}
            <div className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  stats.unreviewedLeads > 0 ? 'bg-brand-500 border-brand-500 text-white' : stats.totalLeads > 0 ? 'bg-gray-300 border-gray-300 text-gray-600' : 'bg-gray-200 border-gray-300 text-gray-500'
                }`}>
                  <span className="text-sm font-semibold">2</span>
                </div>
                <span className="mt-2 text-xs font-medium text-gray-700 text-center whitespace-nowrap">Lead Management</span>
                <span className="text-xs text-gray-500">{stats.unreviewedLeads} to review</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center pb-8">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Step 3: Email Drafts */}
            <div className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  stats.emailDrafts > 0 ? 'bg-brand-500 border-brand-500 text-white' : 'bg-gray-200 border-gray-300 text-gray-500'
                }`}>
                  <span className="text-sm font-semibold">3</span>
                </div>
                <span className="mt-2 text-xs font-medium text-gray-700 text-center whitespace-nowrap">Email Drafts</span>
                <span className="text-xs text-gray-500">{stats.emailDrafts} ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings Alert (Conditional) */}
        {!isLoading && !stats.accountSettingsComplete && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800">Complete Your Account Settings</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Please complete your account settings to start using the lead generation workflow.
                </p>
                <Link href="/auth/account-settings">
                  <Button className="mt-3" size="sm">
                    Complete Setup
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Lead Generation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-100">
                <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Lead Generation</h3>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Leads</span>
                <span className="font-semibold text-gray-900">{stats.totalLeads}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">This Week</span>
                <span className="font-semibold text-gray-900">{stats.leadsThisWeek}</span>
              </div>
            </div>
            <Link href="/auth/serp-settings">
              <Button className="w-full" disabled={!stats.accountSettingsComplete}>
                Start New Search
              </Button>
            </Link>
          </div>

          {/* Card 2: Lead Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Lead Management</h3>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ready to Review</span>
                <span className="font-semibold text-gray-900">{stats.unreviewedLeads}</span>
              </div>
              <div className="flex justify-between text-sm invisible">
                <span className="text-gray-600">Placeholder</span>
                <span className="font-semibold text-gray-900">0</span>
              </div>
            </div>
            <Link href="/auth/leads">
              <Button className="w-full" disabled={stats.unreviewedLeads === 0}>
                Review Leads
              </Button>
            </Link>
          </div>

          {/* Card 3: Email Drafts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Email Drafts</h3>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ready to Export</span>
                <span className="font-semibold text-gray-900">{stats.emailDrafts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Exported</span>
                <span className="font-semibold text-gray-900">{stats.exportedEmails}</span>
              </div>
            </div>
            <Link href="/auth/email-drafts">
              <Button className="w-full" disabled={stats.emailDrafts === 0}>
                Review Drafts
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600">{stats.leadsThisWeek}</div>
              <div className="text-sm text-gray-600">Leads This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.unreviewedLeads}</div>
              <div className="text-sm text-gray-600">To Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.emailDrafts}</div>
              <div className="text-sm text-gray-600">Draft Emails</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.exportedEmails}</div>
              <div className="text-sm text-gray-600">Emails Sent</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
