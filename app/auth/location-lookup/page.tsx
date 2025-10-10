"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from '@clerk/nextjs';
import { supabase, getAuthenticatedClient } from "@/lib/supabase/client";

interface LocationResult {
  code: string;
  name: string;
}

export default function LocationLookupPage() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Interface for Google_Locations table structure
  interface GoogleLocation {
    location_code: string;
    location_name: string;
    location_type: string;
  }

  // Check authentication on mount
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/sign-in";
    }
  }, [isLoaded, isSignedIn]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError("Please enter a search term");
      return;
    }

    setIsLoading(true);
    setError("");
    setShowResults(false);

    try {
      // Get authenticated Supabase client
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('Authentication failed. Please sign in again.');
        setIsLoading(false);
        return;
      }
      const authenticatedSupabase = getAuthenticatedClient(token);

      // Query the google_locations table from Supabase - only show cities
      const { data, error } = await authenticatedSupabase
        .from('google_locations')
        .select('location_code, location_name, location_type')
        .eq('location_type', 'City')
        .ilike('location_name', `%${searchTerm}%`)
        .limit(50);

      if (error) {
        console.error('Error searching locations:', error);
        throw new Error(`Failed to search locations: ${error.message}`);
      }

      // Convert to our interface format
      const locationResults: LocationResult[] = (data || []).map((item: GoogleLocation) => ({
        code: item.location_code,
        name: item.location_name
      }));

      setResults(locationResults);
      setShowResults(true);
      setSelectedLocations(new Set());

      if (locationResults.length === 0) {
        setError("No locations found. Try a different search term.");
      }
    } catch (error: any) {
      console.error('Error performing search:', error);
      setError(error.message || 'An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedLocations.size === results.length) {
      setSelectedLocations(new Set());
    } else {
      setSelectedLocations(new Set(results.map(r => r.code)));
    }
  };

  const handleLocationToggle = (code: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedLocations(newSelected);
  };

  const handleSaveAndSearchAgain = async () => {
    const success = await saveSelectedLocations();
    if (success) {
      // Clear selections and search results
      setSearchTerm("");
      setResults([]);
      setSelectedLocations(new Set());
      setShowResults(false);
      setMessage('Locations saved successfully! You can search for more locations.');
    }
  };

  const handleSaveAndReturn = async () => {
    const success = await saveSelectedLocations();
    if (success) {
      setMessage('Locations saved successfully! Returning to Lead Generation...');
      setTimeout(() => {
        window.location.href = "/auth/lead-generation";
      }, 1500);
    }
  };

  const saveSelectedLocations = async () => {
    if (selectedLocations.size === 0) {
      setError("Please select at least one location to save.");
      return false;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      if (!userId) {
        setError('Please log in first');
        return false;
      }

      // Get authenticated Supabase client with Clerk token
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('Authentication failed. Please sign in again.');
        return false;
      }
      const supabase = getAuthenticatedClient(token);

      // Get current serp_locations value
      const { data: currentData, error: fetchError } = await supabase
        .from('user_accounts')
        .select('serp_locations')
        .eq('clerk_id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching current locations:', fetchError);
        setError('Failed to fetch current location data.');
        return false;
      }

      // Prepare new location codes string
      const selectedCodes = Array.from(selectedLocations);
      let newLocationsString = '';
      const currentLocations = currentData?.serp_locations;

      if (!currentLocations || currentLocations.trim() === '') {
        // No existing locations, just use new codes
        newLocationsString = selectedCodes.join(',');
      } else {
        // Combine existing and new codes
        const existingCodes = currentLocations.split(',').map(code => code.trim()).filter(code => code);

        // Convert selected codes to strings and trim them
        const normalizedSelectedCodes = selectedCodes.map(code => String(code).trim());

        const allCodes = [...existingCodes, ...normalizedSelectedCodes];

        // Remove duplicates while preserving order of first occurrence
        const uniqueCodes = Array.from(new Set(allCodes));

        newLocationsString = uniqueCodes.join(',');
      }

      // Update the database
      const { error: updateError } = await supabase
        .from('user_accounts')
        .update({ serp_locations: newLocationsString })
        .eq('clerk_id', userId);

      if (updateError) {
        console.error('Error updating locations:', updateError);
        setError('Failed to save location codes.');
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error saving locations:', error);
      setError('An error occurred while saving locations.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    window.location.href = "/auth";
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Location Lookup</h2>
        <div className="flex items-center space-x-4">
          <Link
            href="/auth"
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            ← Back to Main Page
          </Link>
          <button
            onClick={handleClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Close
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

      {/* Search Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Search Locations</h3>
        <p className="text-sm text-gray-600">
          Search for location codes to add to your SERP settings. Select the locations you want and choose your save option.
        </p>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Enter location name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="rounded-lg bg-brand-600 px-6 py-3 text-white font-medium hover:bg-brand-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      {showResults && results.length > 0 && (
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <button
            onClick={handleSaveAndSearchAgain}
            disabled={selectedLocations.size === 0 || isLoading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-white font-medium hover:bg-brand-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Saving..." : "Save & Search Again"}
          </button>
          <button
            onClick={handleSaveAndReturn}
            disabled={selectedLocations.size === 0 || isLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Saving..." : "Save & Return"}
          </button>
          <span className="text-sm text-gray-600">
            Select locations below, then choose a save option
          </span>
        </div>
      )}

      {/* Results Section */}
      <div>
        {isLoading && (
          <div className="text-center py-8 text-gray-600">
            Searching locations...
          </div>
        )}

        {showResults && results.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-600">
            No locations found. Try a different search term.
          </div>
        )}

        {showResults && results.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-16 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedLocations.size === results.length && results.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Location Code
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Location Name
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((location) => (
                  <tr
                    key={location.code}
                    className={`hover:bg-gray-50 ${
                      selectedLocations.has(location.code) ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedLocations.has(location.code)}
                        onChange={() => handleLocationToggle(location.code)}
                        className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">
                      {location.code}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {location.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}