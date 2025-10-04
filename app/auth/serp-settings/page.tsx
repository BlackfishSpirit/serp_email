"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, useUser } from '@clerk/nextjs';
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { SearchPreviewModal } from "@/components/search-preview-modal";

export default function SerpSettingsPage() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accountNumber, setAccountNumber] = useState<number | null>(null);

  // SERP settings state
  const [serpKeywords, setSerpKeywords] = useState("");
  const [serpCategory, setSerpCategory] = useState("");
  const [serpExcludedCategory, setSerpExcludedCategory] = useState("");
  const [serpLocations, setSerpLocations] = useState("");
  const [serpStates, setSerpStates] = useState("");
  const [serpDataLoaded, setSerpDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invalidLocationCodes, setInvalidLocationCodes] = useState<string[]>([]);
  const [isValidatingCodes, setIsValidatingCodes] = useState(false);
  const [invalidCategoryItems, setInvalidCategoryItems] = useState<string[]>([]);
  const [invalidExcludedCategoryItems, setInvalidExcludedCategoryItems] = useState<string[]>([]);
  const [searchPreviewModalOpen, setSearchPreviewModalOpen] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/sign-in";
    } else if (isLoaded && isSignedIn && userId) {
      loadAccountNumber();
    }
  }, [isLoaded, isSignedIn, userId]);

  // Auto-save SERP settings when they change AND after validation completes
  useEffect(() => {
    if (!isSignedIn || !serpDataLoaded) return;

    // Don't save while validation is in progress
    if (isValidatingCodes) return;

    // Don't save if there are validation errors
    if (invalidCategoryItems.length > 0 || invalidExcludedCategoryItems.length > 0 || invalidLocationCodes.length > 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      autoSaveSerpSettings();
    }, 2000); // 2 second debounce after validations pass

    return () => clearTimeout(timeoutId);
  }, [serpKeywords, serpCategory, serpExcludedCategory, serpLocations, serpStates, isSignedIn, serpDataLoaded, invalidCategoryItems, invalidExcludedCategoryItems, invalidLocationCodes, isValidatingCodes]);

  // Validate location codes when they change
  useEffect(() => {
    if (!serpLocations || !isSignedIn) {
      setInvalidLocationCodes([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      validateLocationCodes();
    }, 1500); // 1.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [serpLocations, isSignedIn]);

  // Validate category fields when they change
  useEffect(() => {
    if (!serpCategory) {
      setInvalidCategoryItems([]);
      return;
    }
    validateCategoryField(serpCategory, setInvalidCategoryItems);
  }, [serpCategory]);

  useEffect(() => {
    if (!serpExcludedCategory) {
      setInvalidExcludedCategoryItems([]);
      return;
    }
    validateCategoryField(serpExcludedCategory, setInvalidExcludedCategoryItems);
  }, [serpExcludedCategory]);

  const loadAccountNumber = async () => {
    if (!userId) return;

    try {
      // Get authenticated Supabase client with Clerk token
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token');
        setError('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      // Get user's account number using Clerk userId
      console.log('Fetching account for Clerk user ID:', userId);

      // First try to query without .single() to see if there are any records
      console.log('About to query user_accounts table with userId:', userId);
      const { data: allData, error: checkError } = await supabase
        .from('user_accounts')
        .select('account_number, clerk_id')
        .eq('clerk_id', userId);

      console.log('All matching records:', allData);
      console.log('Check error:', checkError);

      if (checkError) {
        console.error('Error checking user accounts:', checkError);
        setError(`Database error: ${checkError.message}`);
        return;
      }

      if (!allData || allData.length === 0) {
        setError('User account not found. Please contact support to set up your account.');
        return;
      }

      // Use the first record found
      const userData = allData[0];
      console.log('Account data loaded:', userData);
      setAccountNumber(userData.account_number);
      await loadSerpSettings(userId);

    } catch (error) {
      console.error('Error loading account number:', error);
      setError('Failed to connect to database. Please check your connection.');
    }
  };

  const validateCategoryField = (value: string, setInvalid: (items: string[]) => void) => {
    if (!value.trim()) {
      setInvalid([]);
      return;
    }

    // Parse category items
    const items = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    // Check each item for invalid characters (only letters and underscores allowed)
    const invalidItems = items.filter(item => !/^[a-zA-Z_]+$/.test(item));

    setInvalid(invalidItems);
  };

  const validateLocationCodes = async () => {
    if (!serpLocations.trim()) {
      setInvalidLocationCodes([]);
      return;
    }

    setIsValidatingCodes(true);
    try {
      // Get authenticated Supabase client with Clerk token
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token for validation');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      // Parse location codes
      const codes = serpLocations
        .split(',')
        .map(code => code.trim())
        .filter(code => code.length > 0);

      if (codes.length === 0) {
        setInvalidLocationCodes([]);
        return;
      }

      // Query google_locations table to check which codes exist
      const { data, error } = await supabase
        .from('google_locations')
        .select('location_code')
        .in('location_code', codes);

      if (error) {
        console.error('Error validating location codes:', error);
        return;
      }

      // Find codes that don't exist in the database
      const validCodes = new Set(data?.map(row => row.location_code.toString()) || []);
      const invalid = codes.filter(code => !validCodes.has(code));

      setInvalidLocationCodes(invalid);
    } catch (error) {
      console.error('Error validating location codes:', error);
    } finally {
      setIsValidatingCodes(false);
    }
  };

  const loadSerpSettings = async (userId: string) => {
    try {
      // Get authenticated Supabase client with Clerk token
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      const { data, error } = await supabase
        .from('user_accounts')
        .select('serp_keywords, serp_cat, serp_exc_cat, serp_locations, serp_states')
        .eq('clerk_id', userId)
        .single();

      if (error) {
        console.error('Error loading SERP settings:', error);
        return;
      }

      if (data) {
        setSerpKeywords(data.serp_keywords || "");
        setSerpCategory(data.serp_cat || "");
        setSerpExcludedCategory(data.serp_exc_cat || "");
        setSerpLocations(data.serp_locations || "");
        setSerpStates(data.serp_states || "");

        // Mark that the data has been loaded to enable auto-save
        setSerpDataLoaded(true);
      }
    } catch (error) {
      console.error('Error loading SERP settings:', error);
    }
  };

  const autoSaveSerpSettings = async () => {
    if (!userId) return;

    // Wait for validation to complete if it's in progress (silently)
    if (isValidatingCodes) {
      console.log('Cannot save: validation in progress');
      return;
    }

    // Check for validation errors before saving (silently skip auto-save)
    if (invalidCategoryItems.length > 0 || invalidExcludedCategoryItems.length > 0 || invalidLocationCodes.length > 0) {
      console.log('Cannot save: validation errors exist');
      // Don't show error popup for auto-save, just silently skip
      return;
    }

    setIsSaving(true);
    try {
      // Get authenticated Supabase client with Clerk token
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token');
        setError('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      const cleanedKeywords = cleanCommaSeparatedValues(serpKeywords, true);
      const cleanedCategory = cleanCommaSeparatedValues(serpCategory);
      const cleanedExcludedCategory = cleanCommaSeparatedValues(serpExcludedCategory);
      const cleanedLocations = cleanCommaSeparatedValues(serpLocations);
      const cleanedStates = cleanCommaSeparatedValues(serpStates, true);

      console.log('Auto-saving SERP settings for user:', userId);
      const { error } = await supabase
        .from('user_accounts')
        .update({
          serp_keywords: cleanedKeywords || null,
          serp_cat: cleanedCategory || null,
          serp_exc_cat: cleanedExcludedCategory || null,
          serp_locations: cleanedLocations || null,
          serp_states: cleanedStates || null
        })
        .eq('clerk_id', userId);

      if (error) {
        console.error('Error auto-saving SERP settings:', error);
        setError('Failed to save settings. Changes may be lost.');
      } else {
        console.log('SERP settings auto-saved successfully');
        // Clear any previous errors if save was successful
        setError('');
        setMessage('Settings saved automatically');
        // Clear the success message after 2 seconds
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (error) {
      console.error('Error auto-saving SERP settings:', error);
      setError('Failed to save settings. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartSearchClick = () => {
    setError("");
    setMessage("");

    if (!isSignedIn || !userId) {
      setError("Please log in first");
      return;
    }

    // Check for validation errors before starting search
    if (invalidCategoryItems.length > 0 || invalidExcludedCategoryItems.length > 0 || invalidLocationCodes.length > 0) {
      setError('Please fix validation errors before starting search.');
      return;
    }

    // Check if keywords and locations are provided
    if (!serpKeywords.trim() || !serpLocations.trim()) {
      setError('Please provide both keywords and location codes.');
      return;
    }

    // Open the search preview modal
    setSearchPreviewModalOpen(true);
  };

  const executeSearch = async (repeatSearches: boolean) => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      if (!isSignedIn || !userId) {
        setError("Please log in first");
        return;
      }

      // Get authenticated Supabase client with Clerk token
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      // First, update the SERP settings in the database
      const cleanedKeywords = cleanCommaSeparatedValues(serpKeywords, true);
      const cleanedCategory = cleanCommaSeparatedValues(serpCategory, false);
      const cleanedExcludedCategory = cleanCommaSeparatedValues(serpExcludedCategory, false);
      const cleanedLocations = cleanCommaSeparatedValues(serpLocations, false);
      const cleanedStates = cleanCommaSeparatedValues(serpStates, true);

      const { error: updateError } = await supabase
        .from('user_accounts')
        .update({
          serp_keywords: cleanedKeywords || null,
          serp_cat: cleanedCategory || null,
          serp_exc_cat: cleanedExcludedCategory || null,
          serp_locations: cleanedLocations || null,
          serp_states: cleanedStates || null
        })
        .eq('clerk_id', userId);

      if (updateError) {
        console.error('Error updating SERP settings before search:', updateError);
        setError('Failed to update SERP settings before starting search.');
        return;
      }

      if (!accountNumber) {
        setError('Unable to get account number for search.');
        return;
      }

      // Get Clerk bearer token for webhook authentication
      const clerkToken = await getToken();
      if (!clerkToken) {
        setError('Failed to get authentication token.');
        return;
      }

      // Call the search webhook
      const webhookUrl = 'https://blackfish.app.n8n.cloud/webhook/fc85b949-e81a-4a7c-849d-b7e1d775c4d0';
      const params = new URLSearchParams({
        account_number: accountNumber.toString(),
        repeat_searches: repeatSearches.toString()
      });

      const response = await fetch(`${webhookUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${clerkToken}`
        }
      });

      // Handle non-OK responses
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Search failed (${response.status})`;

        try {
          if (contentType?.includes('application/json')) {
            const errorJson = await response.json();
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          // If parsing fails, use default message
        }

        throw new Error(errorMessage);
      }

      // Parse the webhook response
      const contentType = response.headers.get('content-type');
      let responseMessage = 'Search started successfully!';

      try {
        if (contentType?.includes('application/json')) {
          const responseJson = await response.json();
          responseMessage = responseJson.message || responseJson.result || responseMessage;
        } else {
          const responseText = await response.text();
          responseMessage = responseText || responseMessage;
        }
      } catch (e) {
        // If parsing fails, use default success message
        console.warn('Could not parse webhook response:', e);
      }

      // Display the response from the webhook
      setMessage(responseMessage);

    } catch (error: any) {
      console.error('Error starting search:', error);
      setError('Failed to start search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to clean comma-separated values
  const cleanCommaSeparatedValues = (value: string, allowSpaces = false) => {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Split by comma, trim each value, filter out empty values
    const values = value.split(',').map(val => val.trim()).filter(val => val.length > 0);

    if (!allowSpaces) {
      // For fields that don't allow spaces, remove all spaces from each value
      return values.map(val => val.replace(/\s/g, '')).join(',');
    } else {
      // For fields that allow spaces (keywords and states), just join back
      return values.join(',');
    }
  };

  // Tooltip component
  const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block">
      <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
      <div className="invisible group-hover:visible absolute z-50 w-64 p-2 mt-1 text-xs text-white bg-gray-900 rounded-lg shadow-lg -left-28 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {text}
        <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -top-1 left-1/2 -translate-x-1/2"></div>
      </div>
    </div>
  );

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Checking authentication status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold text-gray-900">SERP Settings</h2>
          {isSaving && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Saving...
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/auth/leads"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View Leads
          </Link>
        </div>
      </div>

      {/* Fixed position notifications to prevent layout shift */}
      {message && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          {message}
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          {error}
        </div>
      )}

      <p className="text-gray-600">
        Logged in as: <span className="font-medium text-gray-900">{user?.primaryEmailAddress?.emailAddress}</span>
      </p>

      {/* SERP Settings */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">
          SERP (Search Engine Results Page) Settings
        </h3>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-6 mb-8">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> All fields can handle multiple values separated by commas with no spaces (e.g., value1,value2,value3)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Keywords: <span className="text-red-500">*</span>
                </label>
                <InfoTooltip text="Required field. Enter search keywords to find potential leads. Multiple keywords separated by commas (e.g., plumber,electrician,contractor)." />
              </div>
              <textarea
                value={serpKeywords}
                onChange={(e) => setSerpKeywords(e.target.value)}
                rows={4}
                placeholder="keyword1,keyword2,keyword3"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Location Codes: <span className="text-red-500">*</span>
                  </label>
                  <InfoTooltip text="Required field. Enter Google location codes to target specific geographic areas. Use the Browse button to find codes for your desired locations." />
                </div>
                <div className="flex items-center gap-2">
                  {isValidatingCodes && (
                    <span className="text-xs text-gray-500 flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                      Validating...
                    </span>
                  )}
                  <Link
                    href="/auth/location-lookup"
                    className="rounded-lg bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600 transition-colors"
                  >
                    Browse
                  </Link>
                </div>
              </div>
              <textarea
                value={serpLocations}
                onChange={(e) => {
                  // Only allow numbers and commas
                  const filteredValue = e.target.value.replace(/[^0-9,]/g, '');
                  setSerpLocations(filteredValue);
                }}
                rows={4}
                placeholder="200819,1027744"
                className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:ring-blue-500 ${
                  invalidLocationCodes.length > 0
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {invalidLocationCodes.length > 0 && (
                <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Invalid location codes found:
                  </p>
                  <p className="text-sm text-red-700">
                    {invalidLocationCodes.join(', ')}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    These codes do not exist in the Google Locations database. Please verify or remove them.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional Refinement Settings Section */}
        <div className="mt-8 pt-8 border-t border-gray-300">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900">
              Optional Refinement Settings
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              These fields should only be used to limit search results. Do not try to choose every category your business might fall into. Carefully chosen keywords will be more effective.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Categories:
                    </label>
                    <InfoTooltip text="Optional. Filter results by business category. Can be whole or partial category names (e.g., restaurant,auto_repair). Only necessary if the keyword is not specific enough." />
                  </div>
                  <Link
                    href="/auth/category-lookup?type=included"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Browse
                  </Link>
                </div>
                <input
                  type="text"
                  value={serpCategory}
                  onChange={(e) => setSerpCategory(e.target.value)}
                  placeholder="category1,category2,category3"
                  className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:ring-blue-500 ${
                    invalidCategoryItems.length > 0
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {invalidCategoryItems.length > 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Invalid category items found:
                    </p>
                    <p className="text-sm text-red-700">
                      {invalidCategoryItems.join(', ')}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Categories can only contain letters and underscores (no spaces or special characters).
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Excluded Categories:
                    </label>
                    <InfoTooltip text="Optional. Exclude specific business categories from results. Can be whole or partial category names (e.g., medical will exclude any business with a category including medical, such as medical_supply_store)." />
                  </div>
                  <Link
                    href="/auth/category-lookup?type=excluded"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Browse
                  </Link>
                </div>
                <input
                  type="text"
                  value={serpExcludedCategory}
                  onChange={(e) => setSerpExcludedCategory(e.target.value)}
                  placeholder="excluded1,excluded2,excluded3"
                  className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:ring-blue-500 ${
                    invalidExcludedCategoryItems.length > 0
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {invalidExcludedCategoryItems.length > 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Invalid category items found:
                    </p>
                    <p className="text-sm text-red-700">
                      {invalidExcludedCategoryItems.join(', ')}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Categories can only contain letters and underscores (no spaces or special characters).
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Limit to States/Regions:
                  </label>
                  <InfoTooltip text="Optional. Only necessary if locations are close to borders with areas you do not want to or can't sell to. Must match what appears in Google Maps addresses (e.g., WA,OR,Canada)." />
                </div>
                <textarea
                  value={serpStates}
                  onChange={(e) => setSerpStates(e.target.value)}
                  rows={2}
                  placeholder="WA,OR,Canada"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={handleStartSearchClick}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-8 py-3 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Starting..." : "Start Search"}
          </button>
        </div>

        <SearchPreviewModal
          open={searchPreviewModalOpen}
          onOpenChange={setSearchPreviewModalOpen}
          onContinue={executeSearch}
          keywords={serpKeywords}
          locationCodes={serpLocations}
          userAccountId={accountNumber || 0}
        />
      </div>
    </div>
  );
}