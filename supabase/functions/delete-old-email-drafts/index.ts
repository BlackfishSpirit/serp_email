// Supabase Edge Function to delete email drafts that were exported more than 30 days ago
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`Deleting email drafts exported before: ${cutoffDate}`);

    // Delete email drafts where exported timestamp is older than 30 days
    const { data, error, count } = await supabaseClient
      .from('email_drafts')
      .delete({ count: 'exact' })
      .not('exported', 'is', null) // Only delete drafts that have been exported
      .lt('exported', cutoffDate); // exported timestamp is less than (older than) cutoff date

    if (error) {
      console.error('Error deleting old email drafts:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          details: error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const deletedCount = count ?? 0;
    console.log(`Successfully deleted ${deletedCount} old email drafts`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        cutoffDate,
        message: `Deleted ${deletedCount} email drafts exported before ${cutoffDate}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
