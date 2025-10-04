# Lead Exclusion Feature Implementation Plan

## Overview
Add ability to exclude/restore leads with category-based exclusion tracking on the leads page. The `excluded` column already exists in the `user_leads` table on Supabase (TIMESTAMPTZ type).

## Implementation Tasks

### 1. Update Leads Page (`app/auth/leads/page.tsx`)

#### A. Add New State Variables
- `showExcludedLeads: boolean` - Toggle for showing excluded vs active leads
- `excludeDialogOpen: boolean` - Control exclusion confirmation dialog
- `selectedCategories: Set<string>` - Categories selected for exclusion
- `customCategory: string` - Manually entered category field (can contain multiple comma-separated categories)
- `customCategoryError: string` - Validation error for custom category

#### B. Modify `loadLeads()` Function
- Add query filter based on `showExcludedLeads`:
  - **Normal view**: Join `user_leads` and filter `WHERE user_leads.excluded IS NULL`
  - **Excluded view**: Join `user_leads` and filter `WHERE user_leads.excluded IS NOT NULL`, order by `excluded DESC`
- Change from querying `serp_leads_v2` directly to joining through `user_leads` table
- Update query to select from both tables with proper join

#### C. Add New UI Components

**Above table filters:**
- Checkbox: "Show Excluded Leads" (when checked, hides other filter options and shows only excluded leads)
- Visual banner when `showExcludedLeads=true`: "⚠️ Showing only excluded leads (most recent first)" (amber/yellow background)

**Action buttons area:**
- **Remove Leads** button: Visible when `!showExcludedLeads && selectedLeads.size > 0`
- **Restore Leads** button: Visible when `showExcludedLeads && selectedLeads.size > 0`

#### D. Create Exclusion Dialog Component
**Dialog structure:**
- Title: "Remove Selected Leads"
- Description: "Optionally add categories to your excluded list"
- Content:
  - Extract unique categories from selected leads' `categories` field
    - **Categories are space-separated** in the `categories` field
    - Parse: `lead.categories.split(' ').filter(c => c.trim())`
  - Collect all categories from all selected leads
  - Deduplicate and sort alphabetically
  - Display as checkboxes (one per unique category)
  - Text input for custom category with validation
    - Placeholder: "category1,category2,category3"
    - Label: "Custom Categories (comma-separated, no spaces)"
  - Validation message (red text) if custom category invalid
- Footer:
  - Cancel button
  - Confirm button (disabled if custom category has validation error)

**Validation for custom category field:**
- Must be comma-separated with NO spaces anywhere in the field
- Each category must contain only lowercase letters and underscores
- Regex pattern: `/^([a-z_]+)(,[a-z_]+)*$/` (matches: `category1,category2,category3`)
- Empty string is valid (user doesn't have to enter custom categories)
- Validation logic:
  ```typescript
  if (!customCategory.trim()) {
    // Valid: empty is OK
    setCustomCategoryError('');
  } else if (/^[a-z_]+(,[a-z_]+)*$/.test(customCategory)) {
    // Valid: matches pattern
    setCustomCategoryError('');
  } else {
    // Invalid
    setCustomCategoryError('Categories must be lowercase letters and underscores only, separated by commas with no spaces (example: plumber,electrician,contractor)');
  }
  ```

#### E. Implement `handleRemoveLeads()` Function
1. Open exclusion dialog
2. Extract unique categories from selected leads:
   ```typescript
   const allCategories = new Set<string>();
   leads
     .filter(lead => selectedLeads.has(lead.id!))
     .forEach(lead => {
       if (lead.categories) {
         lead.categories
           .split(' ')
           .filter(cat => cat.trim())
           .forEach(cat => allCategories.add(cat.trim()));
       }
     });
   ```
3. Wait for user confirmation

#### F. Implement `confirmExcludeLeads()` Function
1. Update `user_leads` table: `SET excluded = NOW() WHERE lead_id IN (selectedLeads) AND user_id = userAccountId`
2. If any categories selected from checkboxes OR custom categories entered:
   - Collect selected checkbox categories into array
   - Parse custom category field: `customCategory.split(',').filter(c => c.trim())`
   - Combine both arrays
   - Fetch current `user_accounts.serp_exc_cat` for current user
   - Parse existing categories: `(serp_exc_cat || '').split(',').filter(c => c.trim())`
   - Merge all categories into a Set (removes duplicates)
   - Sort alphabetically for consistency
   - Join with comma (no spaces): `Array.from(categoriesSet).sort().join(',')`
   - Update `user_accounts.serp_exc_cat` with new value
3. Close dialog
4. Reset dialog state: clear `selectedCategories`, `customCategory`, `customCategoryError`
5. Clear `selectedLeads`
6. Reload leads
7. Show success message: "Successfully excluded X lead(s)"

#### G. Implement `handleRestoreLeads()` Function
1. Update `user_leads` table: `SET excluded = NULL WHERE lead_id IN (selectedLeads) AND user_id = userAccountId`
2. Clear `selectedLeads`
3. Reload leads
4. Show success message: "Successfully restored X lead(s)"

#### H. UI/UX Behavior
- When `showExcludedLeads` is checked:
  - Hide "Show leads without emails" checkbox
  - Hide "Show already emailed leads" checkbox
  - Show prominent banner: "⚠️ Showing only excluded leads (most recent first)"
  - Replace "Generate Emails" button with "Restore Leads" button
- When switching between excluded/normal views, automatically clear `selectedLeads`
- Success messages appear for 3 seconds (existing pattern)
- Dialog closes on both Cancel and successful Confirm
- Real-time validation on custom category field as user types

#### I. Category Parsing Logic
**Important:** Categories in `serp_leads_v2.categories` field are **space-separated**:
- Example: `"plumber general_contractor electrician"`
- Parse with: `categories.split(' ').filter(c => c.trim())`

**Categories in `user_accounts.serp_exc_cat` are comma-separated (no spaces):**
- Example: `"plumber,general_contractor,electrician"`
- Parse with: `serp_exc_cat.split(',').filter(c => c.trim())`
- Save with: `categories.join(',')`

**Custom category input validation:**
- Must match: `/^[a-z_]+(,[a-z_]+)*$/`
- Examples:
  - ✓ Valid: `"plumber,electrician"`
  - ✓ Valid: `"medical_supply,general_contractor"`
  - ✓ Valid: `""` (empty)
  - ✗ Invalid: `"plumber, electrician"` (has space after comma)
  - ✗ Invalid: `"Plumber,electrician"` (uppercase)
  - ✗ Invalid: `"plumber electrician"` (space separator instead of comma)
  - ✗ Invalid: `"plumber,electrician,"` (trailing comma)

## Technical Details

### Database Operations
- **Exclude**: `UPDATE user_leads SET excluded = NOW() WHERE lead_id = ANY($1) AND user_id = $2`
- **Restore**: `UPDATE user_leads SET excluded = NULL WHERE lead_id = ANY($1) AND user_id = $2`
- **Update categories**: `UPDATE user_accounts SET serp_exc_cat = $1 WHERE id = $2`

### Query Changes
**Current (lines 118-134):**
```typescript
let query = supabase
  .from('serp_leads_v2')
  .select('id, title, address, phone, url, email, facebook_url, instagram_url, categories', { count: 'exact' });
```

**New approach:**
```typescript
let query = supabase
  .from('user_leads')
  .select(`
    lead_id,
    excluded,
    serp_leads_v2!inner(id, title, address, phone, url, email, facebook_url, instagram_url, categories)
  `, { count: 'exact' })
  .eq('user_id', userAccountId);

// Filter by excluded status
if (showExcludedLeads) {
  query = query.not('excluded', 'is', null).order('excluded', { ascending: false });
} else {
  query = query.is('excluded', null);
}
```

**Handle nested data structure:**
- Query returns: `{ lead_id, excluded, serp_leads_v2: { id, title, ... } }`
- Flatten for table display: `data.map(row => ({ ...row.serp_leads_v2, excluded: row.excluded }))`

### Components to Import
- `Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle` from `@/components/ui/dialog`

## Files to Modify
- `app/auth/leads/page.tsx` - Main implementation file

## Key Technical Notes

### Category Handling Summary
1. **Lead categories** (from `serp_leads_v2.categories`): Space-separated
   - Example: `"plumber electrician contractor"`
   - Parse: `.split(' ')`
2. **Excluded categories** (from `user_accounts.serp_exc_cat`): Comma-separated (no spaces)
   - Example: `"plumber,electrician,contractor"`
   - Parse: `.split(',')`
   - Save: `.join(',')`
3. **Custom category field validation**:
   - Can contain multiple categories: `"category1,category2,category3"`
   - Must be lowercase, letters and underscores only, comma-separated, NO spaces anywhere
   - Regex: `/^[a-z_]+(,[a-z_]+)*$/`
4. **Deduplication**: Use Set to prevent duplicates when merging checkbox selections, custom categories, and existing serp_exc_cat

## Success Criteria
- ✓ Normal view shows only non-excluded leads (excluded IS NULL)
- ✓ Excluded view shows only excluded leads sorted by most recent exclusion
- ✓ Remove button opens dialog with category selection
- ✓ Categories from selected leads (space-separated) appear as checkboxes in dialog
- ✓ Custom category input accepts multiple comma-separated categories
- ✓ Custom category field validates: lowercase, letters/underscores, commas only, NO spaces
- ✓ Excluded leads get timestamp set in user_leads.excluded
- ✓ Selected categories (both checkboxes and custom) append to user_accounts.serp_exc_cat (comma-separated, no duplicates)
- ✓ Restore button removes timestamp from user_leads.excluded
- ✓ UI clearly indicates when viewing excluded leads with prominent banner
- ✓ Proper error handling and success messages
- ✓ Category parsing handles both space-separated (leads) and comma-separated (serp_exc_cat) formats
- ✓ Real-time validation feedback on custom category field
