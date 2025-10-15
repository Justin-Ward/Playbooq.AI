-- Enable the existing playbook for marketplace
-- This will make the "Corporate Treasury" playbook appear in the marketplace

UPDATE playbooks 
SET 
  is_marketplace = true,
  price = 0,  -- Make it free
  total_purchases = 0,
  average_rating = 0.0
WHERE id = 'c3eb1d3f-1d26-466b-9530-90967c195e9f';

-- Verify the update
SELECT id, title, is_marketplace, price, total_purchases, average_rating 
FROM playbooks 
WHERE id = 'c3eb1d3f-1d26-466b-9530-90967c195e9f';
