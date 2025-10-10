#!/bin/bash

# Deployment script for delete-old-email-drafts edge function

echo "🚀 Deploying delete-old-email-drafts edge function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged into Supabase. Run:"
    echo "   supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy delete-old-email-drafts

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set up a cron job to run this function automatically (see README.md)"
    echo "2. Test the function manually:"
    echo "   curl -X POST https://your-project-ref.supabase.co/functions/v1/delete-old-email-drafts \\"
    echo "     -H \"Authorization: Bearer YOUR_ANON_KEY\""
    echo ""
    echo "3. Monitor the function logs in the Supabase Dashboard"
else
    echo "❌ Deployment failed. Check the error message above."
    exit 1
fi
