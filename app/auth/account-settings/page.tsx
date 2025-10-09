"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NavBar } from "../_components/nav-bar";
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getAuthenticatedClient } from "@/lib/supabase/client";

export default function AccountSettingsPage() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // User profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Business profile state
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessStreet, setBusinessStreet] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessZip, setBusinessZip] = useState("");
  const [businessUrl, setBusinessUrl] = useState("");
  const [businessProfileText, setBusinessProfileText] = useState("");

  // Email settings state
  const [emailCurrentGoal, setEmailCurrentGoal] = useState("");
  const [emailSignature, setEmailSignature] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/sign-in";
    } else if (isLoaded && isSignedIn && userId) {
      loadUserProfile();
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setEmail(user.primaryEmailAddress.emailAddress);
    }
  }, [user]);

  // Address parsing function - matches email_site functionality exactly
  const parseBusinessAddress = (address: string) => {
    // Parse "420 37th St NW Ste. A. Auburn, WA 98001" format
    if (!address) return { street: "", city: "", state: "", zip: "" };

    const parts = address.split('. ');
    if (parts.length < 2) return { street: address, city: "", state: "", zip: "" };

    const street = parts[0];
    const cityStateZip = parts[1];

    const cityStateZipParts = cityStateZip.split(', ');
    if (cityStateZipParts.length < 2) return { street, city: "", state: "", zip: "" };

    const city = cityStateZipParts[0];
    const stateZip = cityStateZipParts[1].split(' ');
    const state = stateZip[0] || '';
    const zip = stateZip.slice(1).join(' ') || '';

    return { street, city, state, zip };
  };

  const loadUserProfile = async () => {
    if (!userId) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token');
        setError('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('clerk_id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      if (data) {
        // Populate user profile fields - using email_site column names
        setFirstName(data.user_firstname || "");
        setLastName(data.user_lastname || "");
        setPhoneNumber(data.user_phone || "");

        // Populate business profile fields
        setBusinessName(data.business_name || "");
        setBusinessUrl(data.business_url || "");
        setBusinessProfileText(data.business_profile || "");

        // Populate email settings
        setEmailCurrentGoal(data.email_current_goal || "");
        setEmailSignature(data.email_sig || "");

        // Handle business address - parse if stored as concatenated string
        if (data.business_address) {
          setBusinessAddress(data.business_address);
          const parsed = parseBusinessAddress(data.business_address);
          setBusinessStreet(parsed.street);
          setBusinessCity(parsed.city);
          setBusinessState(parsed.state);
          setBusinessZip(parsed.zip);
        } else {
          // If no concatenated address, leave fields empty since email_site only uses business_address
          setBusinessStreet("");
          setBusinessCity("");
          setBusinessState("");
          setBusinessZip("");
          setBusinessAddress("");
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };


  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      if (!userId) {
        setError('Please log in first');
        return;
      }

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('Authentication failed. Please sign in again.');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      // Create concatenated business address in email_site format: "Street. City, State Zip"
      let concatenatedAddress = '';
      if (businessStreet && businessCity && businessState && businessZip) {
        concatenatedAddress = `${businessStreet.trim()}. ${businessCity.trim()}, ${businessState.trim()} ${businessZip.trim()}`;
      }

      const { error } = await supabase
        .from('user_accounts')
        .update({
          user_firstname: firstName.trim() || null,
          user_lastname: lastName.trim() || null,
          user_phone: phoneNumber.trim() || null,
          business_name: businessName.trim() || null,
          business_address: concatenatedAddress || null,
          business_url: businessUrl.trim() || null,
          business_profile: businessProfileText.trim() || null,
          email_current_goal: emailCurrentGoal.trim() || null,
          email_sig: emailSignature.trim() || null
        })
        .eq('clerk_id', userId);

      if (error) {
        console.error('Error saving profile:', error);
        setError('Failed to save profile. Please try again.');
        return;
      }

      // Update the business address state to reflect saved value
      setBusinessAddress(concatenatedAddress);
      setMessage("Profile updated successfully!");
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleGenerateProfile = async () => {
    setMessage("");
    setError("");
    setIsLoading(true);

    // Enhanced validation matching email_site
    if (!businessUrl || !businessUrl.trim()) {
      setError("Please enter a business website URL first");
      setIsLoading(false);
      return;
    }

    // URL format validation
    let urlToUse = businessUrl.trim();
    if (!urlToUse.startsWith('http://') && !urlToUse.startsWith('https://')) {
      urlToUse = 'https://' + urlToUse;
    }

    try {
      if (!userId) {
        setError('Please log in first');
        setIsLoading(false);
        return;
      }

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('Authentication failed. Please sign in again.');
        setIsLoading(false);
        return;
      }
      const supabase = getAuthenticatedClient(token);

      // STEP 1: Save all field changes before generating profile
      // Create concatenated business address in email_site format: "Street. City, State Zip"
      let concatenatedAddress = '';
      if (businessStreet && businessCity && businessState && businessZip) {
        concatenatedAddress = `${businessStreet.trim()}. ${businessCity.trim()}, ${businessState.trim()} ${businessZip.trim()}`;
      }

      const { error: saveError } = await supabase
        .from('user_accounts')
        .update({
          user_firstname: firstName.trim() || null,
          user_lastname: lastName.trim() || null,
          user_phone: phoneNumber.trim() || null,
          business_name: businessName.trim() || null,
          business_address: concatenatedAddress || null,
          business_url: businessUrl.trim() || null,
          business_profile: businessProfileText.trim() || null
        })
        .eq('clerk_id', userId);

      if (saveError) {
        console.error('Error saving profile before generation:', saveError);
        setError('Failed to save changes. Please try again.');
        setIsLoading(false);
        return;
      }

      // Update the business address state to reflect saved value
      setBusinessAddress(concatenatedAddress);

      // STEP 2: Get account number for webhook call
      const { data: accountData, error: accountError } = await supabase
        .from('user_accounts')
        .select('account_number')
        .eq('clerk_id', userId)
        .single();

      if (accountError || !accountData?.account_number) {
        console.error('Error getting account number:', accountError);
        setError('Unable to get account number for profile generation. Please contact support.');
        setIsLoading(false);
        return;
      }

      // Get Clerk bearer token for webhook authentication
      const clerkToken = await getToken();
      if (!clerkToken) {
        setError('Failed to get authentication token.');
        setIsLoading(false);
        return;
      }

      // STEP 3: Call the profile generation webhook
      const webhookUrl = 'https://blackfish.app.n8n.cloud/webhook/81a5d1ac-c5c5-4cda-8baf-9da9d7729ee6';
      const params = new URLSearchParams({
        account_number: accountData.account_number,
        alt_url: "" // Send empty string - webhook uses business_url from user_accounts
      });

      const response = await fetch(`${webhookUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${clerkToken}`
        }
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error('Webhook response error:', responseText);
        throw new Error(`Profile generation failed (${response.status}). Please try again or contact support.`);
      }

      setMessage('Changes saved! Profile generation started! Please wait while we analyze your website and generate your business profile...');

      // Refresh the business profile after webhook
      setTimeout(async () => {
        await refreshBusinessProfile();
      }, 3000);

    } catch (error: any) {
      console.error('Error generating profile:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(error.message || 'Failed to generate profile. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBusinessProfile = async () => {
    if (!userId) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('Failed to get Clerk token');
        return;
      }
      const supabase = getAuthenticatedClient(token);

      const { data, error } = await supabase
        .from('user_accounts')
        .select('business_profile')
        .eq('clerk_id', userId)
        .single();

      if (error) {
        console.error('Error refreshing business profile:', error);
        setError('Profile generated, but unable to refresh display. Please reload the page to see updates.');
        return;
      }

      if (data && data.business_profile) {
        setBusinessProfileText(data.business_profile);
        setMessage('Business profile generated and updated successfully!');
      } else {
        setMessage('Profile generation completed, but the generated content may still be processing. Please refresh the page in a moment to see updates.');
      }

    } catch (error) {
      console.error('Network error refreshing business profile:', error);
      setError('Profile generated, but unable to refresh display due to connection issues. Please reload the page to see updates.');
    }
  };

  const handleSaveProfile2 = async () => {
    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      if (!userId) {
        setError('Please log in first');
        setIsLoading(false);
        return;
      }

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('Authentication failed. Please sign in again.');
        setIsLoading(false);
        return;
      }
      const supabase = getAuthenticatedClient(token);

      const { error } = await supabase
        .from('user_accounts')
        .update({
          business_profile: businessProfileText
        })
        .eq('clerk_id', userId);

      if (error) {
        console.error('Error updating business profile:', error);
        setError('Failed to save profile. Please try again.');
        return;
      }

      setMessage("Business profile saved successfully!");
    } catch (error: any) {
      console.error('Error saving business profile:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    window.location.href = "/sign-out";
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {!isLoaded ? "Loading..." : "Checking authentication..."}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
        <div className="flex items-center space-x-4">
          <Link
            href="/auth/email-settings"
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            Email Settings
          </Link>
          <Link
            href="/auth"
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
          {message}
        </div>
      )}

      {/* User Profile Settings */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            User
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              readOnly
              className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-gray-50 text-gray-500"
            />
          </div>

          <div className="mt-4">
            <input
              type="tel"
              placeholder="Phone Number (optional)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Email
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="emailCurrentGoal" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                Current Goal
                <span
                  className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 border border-gray-400 rounded-full cursor-help hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="This defines the current goal of the emails you will generate with this tool. Include products or services you want potential customers to know about."
                >
                  i
                </span>
              </label>
              <textarea
                id="emailCurrentGoal"
                value={emailCurrentGoal}
                onChange={(e) => setEmailCurrentGoal(e.target.value)}
                rows={4}
                placeholder="Define the current goal of the emails you will generate with this tool. Include products or services you want potential customers to know about."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="emailSignature" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                Signature
                <span
                  className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 border border-gray-400 rounded-full cursor-help hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="This signature will be used when generating emails for leads. Only required if you want to include a signature in your generated emails."
                >
                  i
                </span>
              </label>
              <textarea
                id="emailSignature"
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
                rows={6}
                placeholder={"Best regards,\nJohn Smith\nABC Marketing Solutions\n(555) 123-4567\njohn@abcmarketing.com"}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Business
          </h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Complete Business Address</label>
              <input
                type="text"
                placeholder="Complete business address (auto-generated from fields below)"
                value={businessAddress}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-gray-50 text-gray-700"
              />
              <p className="text-xs text-gray-500">This field is automatically generated from the address components below</p>
            </div>
            <input
              type="text"
              placeholder="Street Address (e.g., 420 37th St NW Ste. A)"
              value={businessStreet}
              onChange={(e) => {
                setBusinessStreet(e.target.value);
                // Update concatenated address in email_site format
                if (e.target.value && businessCity && businessState && businessZip) {
                  setBusinessAddress(`${e.target.value.trim()}. ${businessCity.trim()}, ${businessState.trim()} ${businessZip.trim()}`);
                } else {
                  setBusinessAddress('');
                }
              }}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
            />
            <input
              type="text"
              placeholder="City"
              value={businessCity}
              onChange={(e) => {
                setBusinessCity(e.target.value);
                // Update concatenated address in email_site format
                if (businessStreet && e.target.value && businessState && businessZip) {
                  setBusinessAddress(`${businessStreet.trim()}. ${e.target.value.trim()}, ${businessState.trim()} ${businessZip.trim()}`);
                } else {
                  setBusinessAddress('');
                }
              }}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="State/Province/Region"
                value={businessState}
                onChange={(e) => {
                  setBusinessState(e.target.value);
                  // Update concatenated address in email_site format
                  if (businessStreet && businessCity && e.target.value && businessZip) {
                    setBusinessAddress(`${businessStreet.trim()}. ${businessCity.trim()}, ${e.target.value.trim()} ${businessZip.trim()}`);
                  } else {
                    setBusinessAddress('');
                  }
                }}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
              />
              <input
                type="text"
                placeholder="Postal Code"
                value={businessZip}
                onChange={(e) => {
                  setBusinessZip(e.target.value);
                  // Update concatenated address in email_site format
                  if (businessStreet && businessCity && businessState && e.target.value) {
                    setBusinessAddress(`${businessStreet.trim()}. ${businessCity.trim()}, ${businessState.trim()} ${e.target.value.trim()}`);
                  } else {
                    setBusinessAddress('');
                  }
                }}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <input
              type="url"
              placeholder="Business Website"
              value={businessUrl}
              onChange={(e) => setBusinessUrl(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-white font-medium hover:bg-brand-700 disabled:bg-gray-400 transition-colors"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Business Profile Generator */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Profile Generator
        </h3>
        <div className="space-y-4">
          <textarea
            value={businessProfileText}
            onChange={(e) => setBusinessProfileText(e.target.value)}
            rows={9}
            placeholder="Your generated business profile will appear here..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
          />
          <p className="text-sm text-gray-500">
            Generate a new profile based on information from the URL above, or enter your own business profile text. Edit and save changes as needed.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleGenerateProfile}
              disabled={isLoading}
              className="rounded-lg bg-green-600 px-6 py-2 text-white font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? "Generating..." : "Generate from URL"}
            </button>
            <button
              onClick={handleSaveProfile2}
              disabled={isLoading}
              className="rounded-lg bg-brand-600 px-6 py-2 text-white font-medium hover:bg-brand-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}