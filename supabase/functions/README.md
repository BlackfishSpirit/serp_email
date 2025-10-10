# Supabase Edge Functions

This directory contains Supabase Edge Functions for automated tasks and background jobs.

## Available Functions

### delete-old-email-drafts

Automatically deletes email drafts that were exported (archived) more than 30 days ago.

- **Purpose**: Data hygiene and storage management
- **Schedule**: Recommended to run daily via cron job or n8n workflow
- **Documentation**: See [delete-old-email-drafts/README.md](./delete-old-email-drafts/README.md)

## Quick Start

### Prerequisites

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (run from project root)
supabase link --project-ref your-project-ref
```

### Deploy All Functions

```bash
# From project root
cd supabase/functions

# Deploy individual function
supabase functions deploy delete-old-email-drafts

# Or deploy all functions
supabase functions deploy
```

### Local Testing

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve delete-old-email-drafts

# Test the function
curl -X POST http://localhost:54321/functions/v1/delete-old-email-drafts \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY"
```

## Development Guidelines

### Creating a New Function

1. Create a new directory: `supabase/functions/your-function-name`
2. Create `index.ts` with your function code
3. Create `README.md` with documentation
4. Test locally before deploying
5. Deploy to production

### Function Structure

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Your function code here
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

## Monitoring

- View function logs in Supabase Dashboard → Edge Functions
- Set up alerts for errors or unexpected behavior
- Monitor execution time and resource usage

## Security

- Edge functions run in isolated Deno runtime
- Use environment variables for sensitive data
- Service role key provides admin access - use carefully
- Enable CORS headers for web access
- Validate all inputs before processing

## Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Standard Library](https://deno.land/std)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
