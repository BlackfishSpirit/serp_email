"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, useUser } from '@clerk/nextjs';
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmailSettingsModal } from "@/components/email-settings-modal";

interface SerpLead {
  id?: string;
  title?: string;
  address?: string;
  phone?: string;
  url?: string;
  email?: string;
  facebook_url?: string;
  instagram_url?: string;
  categories?: string;
  [key: string]: any;
}

export default function LeadsPage() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userAccountId, setUserAccountId] = useState<number | null>(null);
  const [leads, setLeads] = useState<SerpLead[]>([]);
  const [showWithoutEmails, setShowWithoutEmails] = useState(false);
  const [showEmailedLeads, setShowEmailedLeads] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Exclusion feature state
  const [showExcludedLeads, setShowExcludedLeads] = useState(false);
  const [excludeDialogOpen, setExcludeDialogOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryError, setCustomCategoryError] = useState("");

  // Email settings modal state
  const [emailSettingsModalOpen, setEmailSettingsModalOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/sign-in";
    } else if (isLoaded && isSignedIn && userId) {
      loadAccountNumber();
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (isSignedIn && userAccountId !== null) {
      setCurrentPage(1);
      setSelectedLeads(new Set()); // Clear selections when switching views
      loadLeads();
    }
  }, [isSignedIn, recordsPerPage, userAccountId, showWithoutEmails, showEmailedLeads, showExcludedLeads]);

  useEffect(() => {
    if (isSignedIn && userAccountId !== null) {
      loadLeads();
    }
  }, [currentPage]);

  const loadAccountNumber = async () => {
    if (!userId) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      console.log('Fetching account for Clerk user ID:', userId);
      const { data: userData, error: userError } = await supabase
        .from('user_accounts')
        .select('id, account_number')
        .eq('clerk_id', userId)
        .single();

      if (userError) {
        console.error('Error loading user account:', userError);
      } else if (userData) {
        console.log('Account data loaded:', userData);
        setUserAccountId(userData.id);
      }
    } catch (error) {
      console.error('Error loading account number:', error);
    }
  };

  const loadLeads = async () => {
    setIsLoading(true);
    setError("");

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token');
        setError('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      if (!userAccountId) {
        setIsLoading(false);
        return;
      }

      // Step 1: Get ALL user_leads that match our filters (no pagination yet)
      let allUserLeadsQuery = supabase
        .from('user_leads')
        .select('id, lead_id, excluded')
        .eq('user_id', userAccountId);

      // Filter by excluded status
      if (showExcludedLeads) {
        // Show only excluded leads, sorted by most recent exclusion
        allUserLeadsQuery = allUserLeadsQuery.not('excluded', 'is', null).order('excluded', { ascending: false });
      } else {
        // Show only non-excluded leads, sorted by user_leads.id descending (newest first)
        allUserLeadsQuery = allUserLeadsQuery.is('excluded', null).order('id', { ascending: false });
      }

      const { data: allUserLeadsData, error: allUserLeadsError } = await allUserLeadsQuery;

      if (allUserLeadsError) {
        console.error('Error loading user_leads:', allUserLeadsError);
        setError(`Failed to load leads: ${allUserLeadsError.message}`);
        return;
      }

      if (!allUserLeadsData || allUserLeadsData.length === 0) {
        setTotalRecords(0);
        setTotalPages(0);
        setLeads([]);
        return;
      }

      // Step 2: Get lead IDs and fetch corresponding serp_leads_v2 data to check email status
      const allLeadIds = allUserLeadsData.map(ul => ul.lead_id);

      // Fetch serp_leads_v2 data for email filtering
      const { data: allLeadsData, error: allLeadsError } = await supabase
        .from('serp_leads_v2')
        .select('id, email')
        .in('id', allLeadIds);

      if (allLeadsError) {
        console.error('Error loading leads for filtering:', allLeadsError);
        setError(`Failed to load leads: ${allLeadsError.message}`);
        return;
      }

      // Create a Set of lead IDs that have valid emails
      const leadsWithEmailSet = new Set(
        (allLeadsData || [])
          .filter(lead => lead.email && lead.email !== 'EmailNotFound')
          .map(lead => lead.id)
      );

      // Step 3: Get emailed lead IDs if filtering them out
      let emailedLeadIds: string[] = [];
      if (!showEmailedLeads && !showExcludedLeads && userAccountId) {
        const { data: draftIds } = await supabase
          .from('email_drafts')
          .select('lead_id')
          .eq('user_id', userAccountId);

        emailedLeadIds = (draftIds || []).map(d => d.lead_id).filter(id => id);
      }

      // Step 4: Apply all filters to get final filtered list
      let filteredUserLeads = allUserLeadsData.filter(ul => {
        // Filter out emailed leads if needed
        if (!showExcludedLeads && !showEmailedLeads && emailedLeadIds.includes(ul.lead_id)) {
          return false;
        }

        // Filter out leads without emails if needed
        if (!showExcludedLeads && !showWithoutEmails && !leadsWithEmailSet.has(ul.lead_id)) {
          return false;
        }

        return true;
      });

      // Step 5: Apply pagination to filtered results
      const from = (currentPage - 1) * recordsPerPage;
      const to = from + recordsPerPage;
      const paginatedUserLeads = filteredUserLeads.slice(from, to);

      const totalCount = filteredUserLeads.length;
      setTotalRecords(totalCount);
      setTotalPages(Math.ceil(totalCount / recordsPerPage));

      if (paginatedUserLeads.length === 0) {
        setLeads([]);
        return;
      }

      // Step 6: Fetch full lead data for paginated results
      const paginatedLeadIds = paginatedUserLeads.map(ul => ul.lead_id);
      const excludedMap = new Map(paginatedUserLeads.map(ul => [ul.lead_id, ul.excluded]));

      const { data: leadsData, error: leadsError } = await supabase
        .from('serp_leads_v2')
        .select('id, title, address, phone, url, email, facebook_url, instagram_url, categories')
        .in('id', paginatedLeadIds);

      if (leadsError) {
        console.error('Error loading leads:', leadsError);
        setError(`Failed to load leads: ${leadsError.message}`);
        return;
      }

      // Merge the data and add excluded timestamp
      const mergedLeads = (leadsData || []).map(lead => ({
        ...lead,
        excluded: excludedMap.get(lead.id!)
      }));

      setLeads(mergedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      setError('Failed to load leads. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id!).filter(id => id)));
    }
  };

  const handleRemoveLeads = () => {
    if (selectedLeads.size === 0) {
      return;
    }

    // Extract unique categories from selected leads
    const allCategories = new Set<string>();
    leads
      .filter(lead => selectedLeads.has(lead.id!))
      .forEach(lead => {
        if (lead.categories) {
          lead.categories
            .split(' ')
            .filter(cat => cat.trim())
            .forEach(cat => allCategories.add(cat.trim()));
        }
      });

    setAvailableCategories(Array.from(allCategories).sort());
    setSelectedCategories(new Set());
    setCustomCategory('');
    setCustomCategoryError('');
    setExcludeDialogOpen(true);
  };

  const handleRestoreLeads = async () => {
    if (selectedLeads.size === 0 || !userAccountId) {
      return;
    }

    setIsLoading(true);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        alert('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      const leadIds = Array.from(selectedLeads);

      // Update user_leads to set excluded = NULL
      const { error: updateError } = await supabase
        .from('user_leads')
        .update({ excluded: null })
        .eq('user_id', userAccountId)
        .in('lead_id', leadIds);

      if (updateError) {
        console.error('Error restoring leads:', updateError);
        alert('Failed to restore leads. Please try again.');
        return;
      }

      const count = selectedLeads.size;
      setSuccessMessage(`Successfully restored ${count} lead${count === 1 ? '' : 's'}!`);
      setSelectedLeads(new Set());

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reload leads
      await loadLeads();
    } catch (error) {
      console.error('Error restoring leads:', error);
      alert('Failed to restore leads. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmExcludeLeads = async () => {
    if (!userAccountId) {
      return;
    }

    // Validate custom category if provided
    if (customCategory.trim()) {
      if (!/^[a-z_]+(,[a-z_]+)*$/.test(customCategory)) {
        return; // Don't proceed if validation failed
      }
    }

    setIsLoading(true);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        alert('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      const leadIds = Array.from(selectedLeads);

      // Update user_leads to set excluded = NOW()
      const { error: updateError } = await supabase
        .from('user_leads')
        .update({ excluded: new Date().toISOString() })
        .eq('user_id', userAccountId)
        .in('lead_id', leadIds);

      if (updateError) {
        console.error('Error excluding leads:', updateError);
        alert('Failed to exclude leads. Please try again.');
        setIsLoading(false);
        return;
      }

      // If any categories were selected or entered, update serp_exc_cat
      const categoriesToAdd: string[] = [];

      // Add selected checkbox categories
      categoriesToAdd.push(...Array.from(selectedCategories));

      // Add custom categories
      if (customCategory.trim()) {
        const customCats = customCategory.split(',').filter(c => c.trim());
        categoriesToAdd.push(...customCats);
      }

      if (categoriesToAdd.length > 0) {
        // Fetch current serp_exc_cat
        const { data: userData, error: fetchError } = await supabase
          .from('user_accounts')
          .select('serp_exc_cat')
          .eq('id', userAccountId)
          .single();

        if (fetchError) {
          console.error('Error fetching user account:', fetchError);
        } else {
          // Parse existing categories
          const existingCategories = (userData?.serp_exc_cat || '')
            .split(',')
            .filter(c => c.trim());

          // Create a Set from existing categories to check for duplicates
          const existingSet = new Set(existingCategories);

          // Add only new categories to the end
          const newCategories = categoriesToAdd.filter(cat => !existingSet.has(cat));

          // Append new categories to the end of existing ones
          const allCategories = existingCategories.length > 0
            ? [...existingCategories, ...newCategories]
            : newCategories;

          const newSerpExcCat = allCategories.join(',');

          // Update user_accounts
          const { error: updateCatError } = await supabase
            .from('user_accounts')
            .update({ serp_exc_cat: newSerpExcCat })
            .eq('id', userAccountId);

          if (updateCatError) {
            console.error('Error updating excluded categories:', updateCatError);
          }
        }
      }

      const count = selectedLeads.size;
      setSuccessMessage(`Successfully excluded ${count} lead${count === 1 ? '' : 's'}!`);
      setSelectedLeads(new Set());
      setExcludeDialogOpen(false);
      setSelectedCategories(new Set());
      setCustomCategory('');
      setCustomCategoryError('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reload leads
      await loadLeads();
    } catch (error) {
      console.error('Error excluding leads:', error);
      alert('Failed to exclude leads. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateCustomCategory = (value: string) => {
    setCustomCategory(value);

    if (!value.trim()) {
      setCustomCategoryError('');
    } else if (/^[a-z_]+(,[a-z_]+)*$/.test(value)) {
      setCustomCategoryError('');
    } else {
      setCustomCategoryError('Categories must be lowercase letters and underscores only, separated by commas with no spaces (example: plumber,electrician,contractor)');
    }
  };

  const toggleCategorySelection = (category: string) => {
    const newSelection = new Set(selectedCategories);
    if (newSelection.has(category)) {
      newSelection.delete(category);
    } else {
      newSelection.add(category);
    }
    setSelectedCategories(newSelection);
  };

  const handleGenerateEmails = () => {
    if (selectedLeads.size === 0) {
      alert('Please select leads first');
      return;
    }

    if (!userAccountId) {
      alert('User account not loaded');
      return;
    }

    // Open the email settings modal
    setEmailSettingsModalOpen(true);
  };

  const triggerEmailGeneration = async () => {
    if (!userAccountId) {
      alert('User account not loaded');
      return;
    }

    setIsLoading(true);

    try {
      // Get Supabase token for database queries
      const supabaseToken = await getToken({ template: 'supabase' });
      if (!supabaseToken) {
        alert('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(supabaseToken);

      // Get account_number for webhook
      const { data: userData } = await supabase
        .from('user_accounts')
        .select('account_number')
        .eq('id', userAccountId)
        .single();

      if (!userData?.account_number) {
        alert('Could not load account number');
        return;
      }

      // Get Clerk bearer token for webhook authentication
      const clerkToken = await getToken();
      if (!clerkToken) {
        alert('Failed to get authentication token');
        return;
      }

      // Convert selected lead IDs to array
      const leadAccountsArray = Array.from(selectedLeads);

      const webhookUrl = 'https://blackfish.app.n8n.cloud/webhook/6c29bbd1-5fce-4106-be67-33a810a506da';
      const params = new URLSearchParams();
      params.append('account_number', userData.account_number.toString());
      params.append('lead_accounts', JSON.stringify(leadAccountsArray));

      const response = await fetch(`${webhookUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clerkToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('Webhook response status:', response.status);
      console.log('Webhook response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Try to parse JSON response, but don't fail if it's not JSON
      let result;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        result = await response.json();
        console.log('Webhook JSON response:', result);
      } else {
        result = await response.text();
        console.log('Webhook text response:', result);
      }

      const count = selectedLeads.size;
      setSuccessMessage(`Successfully generated ${count} email draft${count === 1 ? '' : 's'}!`);
      setSelectedLeads(new Set());

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

      // Wait a moment for the webhook to save drafts to the database
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload to exclude newly drafted leads
      await loadLeads();
    } catch (error) {
      console.error('Error generating emails:', error);
      alert('Failed to generate emails. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Success Message - Fixed Position */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            {successMessage}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="mt-2 text-gray-600">
            Manage and view your leads
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Excluded Leads Banner */}
        {showExcludedLeads && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ Showing only excluded leads (most recent first)
            </p>
          </div>
        )}

        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            {!showExcludedLeads && (
              <>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={showWithoutEmails}
                    onCheckedChange={(checked) => setShowWithoutEmails(checked as boolean)}
                  />
                  <span className="text-sm text-gray-600">Show leads without emails</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={showEmailedLeads}
                    onCheckedChange={(checked) => setShowEmailedLeads(checked as boolean)}
                  />
                  <span className="text-sm text-gray-600">Show already emailed leads</span>
                </label>
              </>
            )}
            <label className="flex items-center gap-2">
              <Checkbox
                checked={showExcludedLeads}
                onCheckedChange={(checked) => setShowExcludedLeads(checked as boolean)}
              />
              <span className="text-sm text-gray-600">Show excluded leads</span>
            </label>
            {selectedLeads.size > 0 && (
              <span className="text-sm font-medium text-gray-700">
                {selectedLeads.size} selected
              </span>
            )}
          </div>
          {showExcludedLeads ? (
            <Button
              onClick={handleRestoreLeads}
              disabled={selectedLeads.size === 0 || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Restore Leads
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRemoveLeads}
                  disabled={selectedLeads.size === 0 || isLoading}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Remove Leads
                </Button>
                <Button
                  onClick={handleGenerateEmails}
                  disabled={selectedLeads.size === 0 || isLoading}
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  Verify Emails
                </Button>
              </div>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-600">Loading leads...</div>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-600">No leads found</div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} leads
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Per page:</label>
                <select
                  value={recordsPerPage}
                  onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                  className="rounded border border-gray-300 px-2 py-1"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedLeads.size === leads.length && leads.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Social Media</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Categories</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedLeads.has(lead.id!)}
                          onCheckedChange={() => toggleLeadSelection(lead.id!)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">{lead.title}</td>
                      <td className="px-4 py-3 text-sm">{lead.address}</td>
                      <td className="px-4 py-3 text-sm">{lead.phone}</td>
                      <td className="px-4 py-3 text-sm">
                        {lead.email && lead.email !== 'EmailNotFound' ? lead.email : ''}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex space-x-2">
                          {lead.facebook_url && lead.facebook_url !== 'FBNotFound' && (
                            <a
                              href={lead.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                              title="Facebook"
                            >
                              FB
                            </a>
                          )}
                          {lead.instagram_url && lead.instagram_url !== 'IGNotFound' && (
                            <a
                              href={lead.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-600 hover:text-pink-700"
                              title="Instagram"
                            >
                              IG
                            </a>
                          )}
                          {(!lead.facebook_url || lead.facebook_url === 'FBNotFound') &&
                           (!lead.instagram_url || lead.instagram_url === 'IGNotFound') &&
                           ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{lead.categories}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                Previous
              </Button>
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </>
        )}

        {/* Exclusion Dialog */}
        <Dialog open={excludeDialogOpen} onOpenChange={setExcludeDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Remove Selected Leads</DialogTitle>
              <DialogDescription>
                Optionally add categories to your excluded list
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Category Checkboxes */}
              {availableCategories.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Categories from selected leads:
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {availableCategories.map((category) => (
                      <label key={category} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <Checkbox
                          checked={selectedCategories.has(category)}
                          onCheckedChange={() => toggleCategorySelection(category)}
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Category Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Custom Categories (comma-separated, no spaces):
                </label>
                <Input
                  value={customCategory}
                  onChange={(e) => validateCustomCategory(e.target.value)}
                  placeholder="plumber,electrician,contractor"
                  className={customCategoryError ? 'border-red-300 bg-red-50' : ''}
                />
                {customCategoryError && (
                  <p className="mt-1 text-sm text-red-600">{customCategoryError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter custom categories as comma-separated values. Must be lowercase letters and underscores only.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExcludeDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmExcludeLeads}
                disabled={isLoading || !!customCategoryError}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isLoading ? 'Removing...' : 'Confirm Removal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Settings Modal */}
        <EmailSettingsModal
          open={emailSettingsModalOpen}
          onOpenChange={setEmailSettingsModalOpen}
          onContinue={triggerEmailGeneration}
          userAccountId={userAccountId}
        />
      </div>
    </div>
  );
}
