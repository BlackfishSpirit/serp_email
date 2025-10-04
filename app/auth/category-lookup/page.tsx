"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from '@clerk/nextjs';
import { supabase, getAuthenticatedClient } from "@/lib/supabase/client";

interface CategoryResult {
  code: string;
  name: string;
}

export default function CategoryLookupPage() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<CategoryResult[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [categoryType, setCategoryType] = useState<'included' | 'excluded'>('included');

  // Interface for google_categories table structure
  interface GoogleCategory {
    category_code: string;
    category_name: string;
  }

  // Check authentication and URL parameters on mount
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/sign-in";
    }

    // Read URL parameter to determine category type
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type === 'excluded') {
      setCategoryType('excluded');
    } else {
      setCategoryType('included');
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
      console.log('Searching for categories:', searchTerm);

      // Get authenticated Supabase client
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('Authentication failed. Please sign in again.');
        setIsLoading(false);
        return;
      }
      const authenticatedSupabase = getAuthenticatedClient(token);

      // Query the google_categories table from Supabase
      const { data, error } = await authenticatedSupabase
        .from('google_categories')
        .select('*')
        .ilike('category', `%${searchTerm}%`)
        .limit(50);

      if (error) {
        console.error('Error searching categories:', error);
        throw new Error(`Failed to search categories: ${error.message}`);
      }

      console.log('Search results:', data);
      console.log('First result structure:', data?.[0]);

      // Convert to our interface format - we'll determine the actual column names from the data
      const categoryResults: CategoryResult[] = (data || []).map((item: any) => {
        // Try different possible column name combinations
        const code = item.code || item.category_code || item.id || Object.values(item)[0];
        const name = item.category || item.name || item.category_name || Object.values(item)[1];

        return {
          code: String(code),
          name: String(name)
        };
      });

      setResults(categoryResults);
      setShowResults(true);
      setSelectedCategories(new Set());

      if (categoryResults.length === 0) {
        setError("No categories found. Try a different search term.");
      }
    } catch (error: any) {
      console.error('Error performing search:', error);
      setError(error.message || 'An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedCategories.size === results.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(results.map(r => r.name)));
    }
  };

  const handleCategoryToggle = (name: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedCategories(newSelected);
  };

  const handleSaveAndSearchAgain = async () => {
    const success = await saveSelectedCategories();
    if (success) {
      // Clear selections and search results
      setSearchTerm("");
      setResults([]);
      setSelectedCategories(new Set());
      setShowResults(false);
      setMessage('Categories saved successfully! You can search for more categories.');
    }
  };

  const handleSaveAndReturn = async () => {
    const success = await saveSelectedCategories();
    if (success) {
      setMessage('Categories saved successfully! Returning to Lead Generation...');
      setTimeout(() => {
        window.location.href = "/auth/lead-generation";
      }, 1500);
    }
  };

  const saveSelectedCategories = async () => {
    if (selectedCategories.size === 0) {
      setError("Please select at least one category to save.");
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

      // Determine which column to update based on category type
      const columnName = categoryType === 'excluded' ? 'serp_exc_cat' : 'serp_cat';

      // Get current category value
      const { data: currentData, error: fetchError } = await supabase
        .from('user_accounts')
        .select(columnName)
        .eq('clerk_id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching current categories:', fetchError);
        setError('Failed to fetch current category data.');
        return false;
      }

      // Prepare new category names string
      const selectedNames = Array.from(selectedCategories);
      let newCategoriesString = '';
      const currentCategories = currentData?.[columnName];

      if (!currentCategories || currentCategories.trim() === '') {
        // No existing categories, just use new names
        newCategoriesString = selectedNames.join(',');
      } else {
        // Combine existing and new categories
        const existingCategories = currentCategories.split(',').map(cat => cat.trim()).filter(cat => cat);

        // Normalize selected names to strings and trim them
        const normalizedSelectedNames = selectedNames.map(name => String(name).trim());

        const allCategories = [...existingCategories, ...normalizedSelectedNames];

        // Remove duplicates while preserving order of first occurrence
        const uniqueCategories = Array.from(new Set(allCategories));

        newCategoriesString = uniqueCategories.join(',');
      }

      // Update the database
      const updateData = { [columnName]: newCategoriesString };
      const { error: updateError } = await supabase
        .from('user_accounts')
        .update(updateData)
        .eq('clerk_id', userId);

      if (updateError) {
        console.error('Error updating categories:', updateError);
        setError('Failed to save category codes.');
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error saving categories:', error);
      setError('An error occurred while saving categories.');
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
        <h2 className="text-2xl font-bold text-gray-900">
          {categoryType === 'excluded' ? 'Excluded Categories Lookup' : 'Categories Lookup'}
        </h2>
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
        <h3 className="text-lg font-semibold text-gray-900">Search Categories</h3>
        <p className="text-sm text-gray-600">
          Search for category codes to add to your SERP settings. Select the categories you want and choose your save option.
        </p>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Enter category name or code..."
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
            disabled={selectedCategories.size === 0 || isLoading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-white font-medium hover:bg-brand-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Saving..." : "Save & Search Again"}
          </button>
          <button
            onClick={handleSaveAndReturn}
            disabled={selectedCategories.size === 0 || isLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Saving..." : "Save & Return"}
          </button>
          <span className="text-sm text-gray-600">
            Select {categoryType === 'excluded' ? 'excluded ' : ''}categories below, then choose a save option
          </span>
        </div>
      )}

      {/* Results Section */}
      <div>
        {isLoading && (
          <div className="text-center py-8 text-gray-600">
            Searching categories...
          </div>
        )}

        {showResults && results.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-600">
            No categories found. Try a different search term.
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
                      checked={selectedCategories.size === results.length && results.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Category Name
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((category) => (
                  <tr
                    key={category.name}
                    className={`hover:bg-gray-50 ${
                      selectedCategories.has(category.name) ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(category.name)}
                        onChange={() => handleCategoryToggle(category.name)}
                        className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {category.name}
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