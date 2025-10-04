"use client";

import { useState, useEffect } from "react";
import { useAuth } from '@clerk/nextjs';
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EmailSettings {
  email_current_goal: string;
  email_sig: string;
  email_include_sig: boolean;
  email_include_unsub: boolean;
}

interface EmailSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  userAccountId: number | null;
}

export function EmailSettingsModal({ open, onOpenChange, onContinue, userAccountId }: EmailSettingsModalProps) {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Email settings state
  const [emailCurrentGoal, setEmailCurrentGoal] = useState("");
  const [emailSig, setEmailSig] = useState("");
  const [emailIncludeSig, setEmailIncludeSig] = useState(false);
  const [emailIncludeUnsub, setEmailIncludeUnsub] = useState(false);

  // Check if signature is empty/null/whitespace
  const isSignatureEmpty = !emailSig || !emailSig.trim();

  // Auto-uncheck signature checkbox when signature becomes empty
  useEffect(() => {
    if (isSignatureEmpty && emailIncludeSig) {
      setEmailIncludeSig(false);
    }
  }, [isSignatureEmpty, emailIncludeSig]);

  // Load email settings when modal opens
  useEffect(() => {
    if (open && userAccountId) {
      loadEmailSettings();
    }
  }, [open, userAccountId]);

  const loadEmailSettings = async () => {
    if (!userAccountId) return;

    setIsLoading(true);
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
        .select('email_current_goal, email_sig, email_include_sig, email_include_unsub')
        .eq('id', userAccountId)
        .single();

      if (error) {
        console.error('Error loading email settings:', error);
        setError('Failed to load email settings.');
        return;
      }

      if (data) {
        setEmailCurrentGoal(data.email_current_goal || "");
        setEmailSig(data.email_sig || "");
        setEmailIncludeSig(data.email_include_sig || false);
        setEmailIncludeUnsub(data.email_include_unsub || false);
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
      setError('Failed to load email settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmailSettings = async () => {
    if (!userAccountId) {
      setError('User account not loaded');
      return false;
    }

    setIsSaving(true);
    setError("");

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setError('Authentication failed. Please sign in again.');
        return false;
      }
      const supabase = getAuthenticatedClient(token);

      const { error } = await supabase
        .from('user_accounts')
        .update({
          email_current_goal: emailCurrentGoal.trim() || null,
          email_sig: emailSig.trim() || null,
          email_include_sig: emailIncludeSig,
          email_include_unsub: emailIncludeUnsub
        })
        .eq('id', userAccountId);

      if (error) {
        console.error('Error saving email settings:', error);
        setError('Failed to save settings. Please try again.');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      setError(error.message || 'Failed to save settings. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    const saved = await saveEmailSettings();
    if (saved) {
      onContinue();
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset to original values on cancel
    if (userAccountId) {
      loadEmailSettings();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Settings</DialogTitle>
          <DialogDescription>
            Review and update your email settings before generating emails
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="text-gray-600">Loading settings...</div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Email Goal Section */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                Email Goal
              </h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Current Email Marketing Goal
                </label>
                <Textarea
                  placeholder="Describe your current email marketing objectives..."
                  value={emailCurrentGoal}
                  onChange={(e) => setEmailCurrentGoal(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Email Signature Section */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                Email Signature
              </h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email Signature Content
                </label>
                <Textarea
                  placeholder="Enter your email signature content..."
                  value={emailSig}
                  onChange={(e) => setEmailSig(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Email Preferences Section */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                Email Preferences
              </h3>
              <div className="space-y-4">
                {/* Include Signature Checkbox */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="modal-include-signature"
                    checked={emailIncludeSig}
                    onCheckedChange={(checked) => setEmailIncludeSig(checked as boolean)}
                    disabled={isSignatureEmpty}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <label
                      htmlFor="modal-include-signature"
                      className={`text-sm font-medium cursor-pointer ${
                        isSignatureEmpty ? 'text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      Include email signature in generated emails
                    </label>
                    {isSignatureEmpty && (
                      <p className="text-xs text-gray-500 mt-1">
                        You must enter a signature above before enabling this option
                      </p>
                    )}
                  </div>
                </div>

                {/* Include Unsubscribe Checkbox */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="modal-include-unsubscribe"
                    checked={emailIncludeUnsub}
                    onCheckedChange={(checked) => setEmailIncludeUnsub(checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <label
                      htmlFor="modal-include-unsubscribe"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Include offer to remove recipient from sender's list
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Adds a courteous unsubscribe offer to email communications
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isSaving || isLoading || !emailCurrentGoal.trim()}
            className="bg-brand-500 hover:bg-brand-600 text-white"
          >
            {isSaving ? 'Saving...' : 'Generate Emails'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
