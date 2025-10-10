# Delete Old Email Drafts - Supabase Edge Function

This edge function automatically deletes email drafts from the `email_drafts` table that were exported (archived) more than 30 days ago.

## Purpose

- **Data Hygiene**: Remove old archived emails to keep the database clean
- **Storage Management**: Reduce database storage costs
- **Performance**: Improve query performance by reducing table size

## How It Works

1. Calculates the date 30 days ago from the current date
2. Queries the `email_drafts` table for records where:
   - The `exported` column is NOT NULL (has been exported/archived)
   - The `exported` timestamp is older than 30 days
3. Deletes all matching records
4. Returns a summary of how many records were deleted

## Deployment

### Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Logged into Supabase (`supabase login`)
- Linked to your Supabase project (`supabase link --project-ref your-project-ref`)

### Deploy the Function

```bash
# From the project root
supabase functions deploy delete-old-email-drafts
```

### Set Environment Variables

The function requires these environment variables (automatically available in Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (for admin access)

These are automatically set by Supabase when you deploy the function.

## Usage

### Manual Invocation

You can manually trigger the function via HTTP request:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/delete-old-email-drafts \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Scheduled Execution (Recommended)

Set up a cron job in Supabase to run this function automatically:

1. Go to your Supabase Dashboard
2. Navigate to Database → Cron Jobs (pg_cron extension)
3. Create a new cron job:

```sql
-- Run every day at 2 AM UTC
SELECT cron.schedule(
  'delete-old-email-drafts-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/delete-old-email-drafts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

**Alternative: Use n8n Workflow**

You can also schedule this function via n8n:
1. Create a new workflow in n8n
2. Add a Schedule Trigger (e.g., daily at 2 AM)
3. Add an HTTP Request node to call the edge function
4. Add error handling and notifications

## Response Format

### Success Response

```json
{
  "success": true,
  "deletedCount": 42,
  "cutoffDate": "2024-12-10T18:00:00.000Z",
  "message": "Deleted 42 email drafts exported before 2024-12-10T18:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "details": {...}
}
```

## Testing Locally

You can test the function locally using Supabase CLI:

```bash
# Start Supabase locally
supabase start

# Serve the function locally
supabase functions serve delete-old-email-drafts

# In another terminal, invoke the function
curl -X POST http://localhost:54321/functions/v1/delete-old-email-drafts \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY"
```

## Monitoring

- Check function logs in Supabase Dashboard → Edge Functions → delete-old-email-drafts → Logs
- Monitor deletion counts in the response
- Set up alerts if deletion count is unusually high or errors occur

## Configuration

### Adjusting Retention Period

To change the 30-day retention period, modify line 31 in `index.ts`:

```typescript
// Change from 30 to your desired number of days
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
```

### Safety Features

- Only deletes records where `exported` is NOT NULL (prevents accidental deletion of active drafts)
- Uses exact count to track how many records are deleted
- Comprehensive error handling and logging
- CORS headers for secure API access

## Security Considerations

- The function uses the service role key for admin-level database access
- Only deploy this function if you trust the cleanup logic
- Consider adding additional filters (e.g., by user_id or account status) if needed
- Review deletion logs regularly to ensure expected behavior

## Troubleshooting

### No Records Deleted

- Verify that exported drafts exist in the database
- Check if any drafts have `exported` timestamp older than 30 days
- Review function logs for errors

### Permission Errors

- Ensure the service role key is properly set in environment variables
- Verify RLS policies on `email_drafts` table (service role bypasses RLS)

### Function Timeout

- If processing many records, consider batching the deletes
- Increase function timeout in Supabase settings if needed
