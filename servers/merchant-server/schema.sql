-- Merchant Learning Database Schema

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    normalized_name TEXT NOT NULL,
    first_seen DATE DEFAULT CURRENT_DATE,
    last_seen DATE DEFAULT CURRENT_DATE,
    transaction_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categorizations table
CREATE TABLE IF NOT EXISTS categorizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    category_name TEXT NOT NULL,
    category_id TEXT,
    confidence REAL NOT NULL,
    auto_approved BOOLEAN DEFAULT FALSE,
    was_corrected BOOLEAN DEFAULT FALSE,
    transaction_id TEXT,
    amount REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Learning events table
CREATE TABLE IF NOT EXISTS learning_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'correction', 'confirmation', 'new_categorization'
    old_category TEXT,
    new_category TEXT,
    confidence_before REAL,
    confidence_after REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Merchant confidence scores
CREATE TABLE IF NOT EXISTS merchant_confidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    category_name TEXT NOT NULL,
    confidence_score REAL DEFAULT 50.0,
    success_count INTEGER DEFAULT 0,
    correction_count INTEGER DEFAULT 0,
    last_used DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id),
    UNIQUE(merchant_id, category_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchants_normalized_name ON merchants(normalized_name);
CREATE INDEX IF NOT EXISTS idx_categorizations_merchant_id ON categorizations(merchant_id);
CREATE INDEX IF NOT EXISTS idx_categorizations_created_at ON categorizations(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_events_merchant_id ON learning_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_created_at ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_merchant_confidence_merchant_category ON merchant_confidence(merchant_id, category_name);

-- Trigger to update merchant last_seen and transaction_count
CREATE TRIGGER IF NOT EXISTS update_merchant_stats
AFTER INSERT ON categorizations
BEGIN
    UPDATE merchants 
    SET last_seen = CURRENT_DATE,
        transaction_count = transaction_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.merchant_id;
END;

-- Trigger to update merchant confidence updated_at
CREATE TRIGGER IF NOT EXISTS update_merchant_confidence_timestamp
AFTER UPDATE ON merchant_confidence
BEGIN
    UPDATE merchant_confidence 
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;