-- Enable all existing playbooks for marketplace (make them free)
-- This will make all current playbooks appear in the marketplace

UPDATE playbooks 
SET 
  is_marketplace = true,
  price = 0,  -- Make them all free
  total_purchases = 0,
  average_rating = 0.0
WHERE is_marketplace = false;

-- Verify the update
SELECT id, title, is_marketplace, price, total_purchases, average_rating 
FROM playbooks 
WHERE is_marketplace = true;
