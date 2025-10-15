# Marketplace Schema Summary

## Overview
This document outlines the database schema changes needed to implement marketplace functionality for Playbooq.AI, allowing users to buy and sell playbooks.

## Key Changes Made

### 1. Updated `playbooks` Table
Added marketplace-specific columns:
- `is_marketplace` (BOOLEAN) - Whether the playbook is available for purchase
- `price` (INTEGER) - Price in cents (e.g., 999 = $9.99)
- `preview_content` (JSONB) - Preview content shown to potential buyers
- `total_purchases` (INTEGER) - Number of times this playbook has been purchased
- `average_rating` (DECIMAL) - Average rating from 1-5 stars

**Note**: `description` and `category` columns already existed and were not duplicated.

### 2. New Tables Created

#### `marketplace_ratings`
- Stores user ratings and reviews for marketplace playbooks
- One rating per user per playbook (enforced by UNIQUE constraint)
- Rating scale: 1-5 stars
- Includes review text (optional)

#### `playbook_purchases`
- Tracks which users have purchased which playbooks
- One purchase record per user per playbook
- Stores the price paid at time of purchase
- Used to determine if user has access to full content

#### `playbook_favorites`
- Tracks which users have favorited which playbooks
- One favorite record per user per playbook
- Used for wishlist functionality in marketplace
- Separate from purchases (users can favorite without buying)

#### `purchases`
- Detailed transaction tracking for payment processing
- Links to Stripe payment intents
- Tracks platform fees and seller payouts
- Manages payout status and dates

### 3. Indexes Created
- `idx_playbooks_marketplace` - For marketplace queries
- `idx_playbooks_category` - For category filtering
- `idx_playbooks_price` - For price-based sorting
- `idx_ratings_playbook` - For rating lookups
- `idx_ratings_user` - For user rating history
- `idx_purchases_user` - For user purchase history
- `idx_purchases_playbook` - For playbook sales data
- `idx_purchases_status` - For payout management
- `idx_favorites_user` - For user favorites list
- `idx_favorites_playbook` - For playbook favorite counts

### 4. Row Level Security (RLS) Policies
- **marketplace_ratings**: Users can view public ratings, manage their own ratings
- **playbook_purchases**: Users can only view their own purchases
- **playbook_favorites**: Users can only view and manage their own favorites
- **purchases**: Users can view transactions they're involved in (buyer or seller)

### 5. Database Functions & Triggers
- `update_playbook_rating()` - Automatically updates average ratings when ratings change
- `update_playbook_purchase_count()` - Automatically updates purchase counts
- Triggers ensure data consistency without manual intervention

### 6. TypeScript Types Updated
Added comprehensive TypeScript interfaces for:
- All new table types (Row, Insert, Update)
- Marketplace-specific extended types
- Payment processing types
- Search and filter interfaces

## Key Features Supported

### For Sellers
- List playbooks in marketplace
- Set pricing and preview content
- Track sales and earnings
- Manage payout status

### For Buyers
- Browse and search marketplace
- View ratings and reviews
- Favorite playbooks for later
- Purchase playbooks
- Access purchased content
- Rate and review purchases
- Manage favorites/wishlist

### For Platform
- Track all transactions
- Manage platform fees
- Process payouts to sellers
- Monitor marketplace health

## Usage Examples

### Making a Playbook Available for Sale
```sql
UPDATE playbooks 
SET is_marketplace = true, 
    price = 999, 
    preview_content = '{"preview": "First few steps..."}'
WHERE id = 'playbook-uuid';
```

### Recording a Purchase
```sql
INSERT INTO playbook_purchases (playbook_id, user_id, price_paid)
VALUES ('playbook-uuid', 'user-id', 999);
```

### Adding a Rating
```sql
INSERT INTO marketplace_ratings (playbook_id, user_id, rating, review)
VALUES ('playbook-uuid', 'user-id', 5, 'Great playbook!');
```

### Favoriting a Playbook
```sql
INSERT INTO playbook_favorites (playbook_id, user_id)
VALUES ('playbook-uuid', 'user-id');
```

### Removing from Favorites
```sql
DELETE FROM playbook_favorites 
WHERE playbook_id = 'playbook-uuid' AND user_id = 'user-id';
```

## Next Steps
1. Run the SQL schema in Supabase
2. Update frontend components to use new types
3. Implement marketplace UI components
4. Add payment processing integration
5. Create seller dashboard
6. Implement search and filtering

## Files Modified
- `docs/marketplace-schema.sql` - Complete SQL schema
- `types/database.ts` - Updated TypeScript types
- `docs/marketplace-schema-summary.md` - This documentation
