"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { useAuth } from "@clerk/nextjs";

interface SearchPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (repeatSearches: boolean) => void;
  keywords: string;
  locationCodes: string;
  userAccountId: number;
}

interface SearchStatus {
  locationCode: string;
  locationName: string;
  newKeywords: string[];
  repeatedKeywords: string[];
}

export function SearchPreviewModal({
  open,
  onOpenChange,
  onContinue,
  keywords,
  locationCodes,
  userAccountId
}: SearchPreviewModalProps) {
  const { getToken } = useAuth();
  const [searchStatuses, setSearchStatuses] = useState<SearchStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [repeatSearches, setRepeatSearches] = useState(false);

  useEffect(() => {
    if (open) {
      analyzeSearches();
    }
  }, [open, keywords, locationCodes, userAccountId]);

  const analyzeSearches = async () => {
    setIsLoading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const supabase = getAuthenticatedClient(token);

      // Parse keywords and location codes
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
      const locationCodeList = locationCodes.split(',').map(l => l.trim()).filter(l => l);

      const statuses: SearchStatus[] = [];

      // Query user_searches for each location code
      for (const locationCode of locationCodeList) {
        // Get location name from google_locations table
        const { data: locationData } = await supabase
          .from('google_locations')
          .select('location_name')
          .eq('location_code', locationCode)
          .single();

        const locationName = locationData?.location_name || 'Unknown Location';

        const { data: searchRecord } = await supabase
          .from('user_searches')
          .select('used_keywords')
          .eq('user_id', userAccountId)
          .eq('search_location_code', locationCode)
          .single();

        const newKeywords: string[] = [];
        const repeatedKeywords: string[] = [];

        if (searchRecord?.used_keywords) {
          // Parse used_keywords column (formatted as ",keyword1,keyword2,")
          const usedKeywordsStr = searchRecord.used_keywords;

          for (const keyword of keywordList) {
            // Check if keyword exists in the comma-delimited string
            if (usedKeywordsStr.includes(`,${keyword},`)) {
              repeatedKeywords.push(keyword);
            } else {
              newKeywords.push(keyword);
            }
          }
        } else {
          // No record exists, all keywords are new
          newKeywords.push(...keywordList);
        }

        statuses.push({
          locationCode,
          locationName,
          newKeywords,
          repeatedKeywords
        });
      }

      setSearchStatuses(statuses);
    } catch (error) {
      console.error('Error analyzing searches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    onContinue(repeatSearches);
    onOpenChange(false);
  };

  const totalNew = searchStatuses.reduce((sum, s) => sum + s.newKeywords.length, 0);
  const totalRepeated = searchStatuses.reduce((sum, s) => sum + s.repeatedKeywords.length, 0);
  const totalSearches = totalNew + totalRepeated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Preview</DialogTitle>
          <DialogDescription>
            Review which searches are new and which have been performed before
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900">Total Searches: {totalSearches}</span>
                <div className="flex gap-4">
                  <span className="text-green-700">New: {totalNew}</span>
                  <span className="text-orange-700">Repeated: {totalRepeated}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {searchStatuses.map((status) => (
                <div key={status.locationCode} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-2 flex items-center justify-between">
                    <span>{status.locationCode}</span>
                    <span className="text-sm font-normal text-gray-600">{status.locationName}</span>
                  </div>

                  {status.newKeywords.length > 0 && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-green-700">New: </span>
                      <span className="text-sm text-gray-700">{status.newKeywords.join(', ')}</span>
                    </div>
                  )}

                  {status.repeatedKeywords.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-orange-700">Repeated: </span>
                      <span className="text-sm text-gray-700">{status.repeatedKeywords.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalRepeated > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="repeat-searches-modal"
                    checked={repeatSearches}
                    onChange={(e) => setRepeatSearches(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="repeat-searches-modal" className="text-sm text-gray-700">
                    <span className="font-medium">Repeat Searches</span>
                    <br />
                    <span className="text-gray-600">
                      Check this box to re-run the {totalRepeated} repeated search{totalRepeated !== 1 ? 'es' : ''}. Repeating a search may not yield new results.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isLoading}
          >
            {totalSearches === 1 ? 'Start Search' : 'Start Searches'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
