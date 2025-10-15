-- Marketplace functionality for Playbooq
-- Note: description and category columns already exist in playbooks table

-- Add marketplace-specific columns to playbooks table
ALTER TABLE playbooks
ADD COLUMN is_marketplace BOOLEAN DEFAULT FALSE,
ADD COLUMN price INTEGER DEFAULT 0,
ADD COLUMN preview_content JSONB,
ADD COLUMN total_purchases INTEGER DEFAULT 0,
ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0;

-- Create indexes for marketplace queries
CREATE INDEX idx_playbooks_marketplace ON playbooks(is_marketplace, created_at DESC);
CREATE INDEX idx_playbooks_category ON playbooks(category);
CREATE INDEX idx_playbooks_price ON playbooks(price);

-- Marketplace ratings table
CREATE TABLE marketplace_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playbook_id, user_id)
);

-- Create indexes for ratings
CREATE INDEX idx_ratings_playbook ON marketplace_ratings(playbook_id);
CREATE INDEX idx_ratings_user ON marketplace_ratings(user_id);

-- Playbook purchases table (renamed from favorites for clarity)
CREATE TABLE playbook_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  price_paid INTEGER,
  UNIQUE(playbook_id, user_id)
);

-- Create indexes for purchases
CREATE INDEX idx_purchases_user ON playbook_purchases(user_id);
CREATE INDEX idx_purchases_playbook ON playbook_purchases(playbook_id);

-- Playbook favorites table (for marketplace wishlist)
CREATE TABLE playbook_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  favorited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playbook_id, user_id)
);

-- Create indexes for favorites
CREATE INDEX idx_favorites_user ON playbook_favorites(user_id);
CREATE INDEX idx_favorites_playbook ON playbook_favorites(playbook_id);

-- Transaction/payment tracking table
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id),
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  amount_total INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  seller_amount INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'completed', 'failed')),
  payout_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for purchases tracking
CREATE INDEX idx_purchases_buyer ON purchases(buyer_id);
CREATE INDEX idx_purchases_seller ON purchases(seller_id);
CREATE INDEX idx_purchases_status ON purchases(payout_status);

-- RLS Policies for marketplace_ratings
ALTER TABLE marketplace_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings for public playbooks" ON marketplace_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playbooks 
      WHERE playbooks.id = marketplace_ratings.playbook_id 
      AND playbooks.is_public = true
    )
  );

CREATE POLICY "Users can create their own ratings" ON marketplace_ratings
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own ratings" ON marketplace_ratings
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own ratings" ON marketplace_ratings
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS Policies for playbook_purchases
ALTER TABLE playbook_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON playbook_purchases
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own purchases" ON playbook_purchases
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- RLS Policies for playbook_favorites
ALTER TABLE playbook_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" ON playbook_favorites
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own favorites" ON playbook_favorites
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own favorites" ON playbook_favorites
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS Policies for purchases (transaction tracking)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON purchases
  FOR SELECT USING (buyer_id = auth.uid()::text OR seller_id = auth.uid()::text);

CREATE POLICY "System can create transactions" ON purchases
  FOR INSERT WITH CHECK (true);

-- Function to update playbook rating averages
CREATE OR REPLACE FUNCTION update_playbook_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE playbooks 
  SET average_rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM marketplace_ratings 
    WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)
  )
  WHERE id = COALESCE(NEW.playbook_id, OLD.playbook_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update rating averages
CREATE TRIGGER trigger_update_playbook_rating
  AFTER INSERT OR UPDATE OR DELETE ON marketplace_ratings
  FOR EACH ROW EXECUTE FUNCTION update_playbook_rating();

-- Function to update purchase counts
CREATE OR REPLACE FUNCTION update_playbook_purchase_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE playbooks 
  SET total_purchases = (
    SELECT COUNT(*)
    FROM playbook_purchases 
    WHERE playbook_id = NEW.playbook_id
  )
  WHERE id = NEW.playbook_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update purchase counts
CREATE TRIGGER trigger_update_playbook_purchase_count
  AFTER INSERT ON playbook_purchases
  FOR EACH ROW EXECUTE FUNCTION update_playbook_purchase_count();
