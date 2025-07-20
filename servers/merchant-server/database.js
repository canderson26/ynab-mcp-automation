import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class MerchantDatabase {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Initialize schema
    this.initializeSchema();
    
    // Prepare common statements
    this.prepareStatements();
  }

  initializeSchema() {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    this.db.exec(schema);
  }

  prepareStatements() {
    // Merchant operations
    this.stmts = {
      // Find or create merchant
      findMerchant: this.db.prepare(`
        SELECT * FROM merchants WHERE normalized_name = ?
      `),
      
      createMerchant: this.db.prepare(`
        INSERT INTO merchants (name, normalized_name) 
        VALUES (?, ?)
      `),
      
      // Get merchant history
      getMerchantHistory: this.db.prepare(`
        SELECT 
          c.category_name,
          c.confidence,
          c.auto_approved,
          c.was_corrected,
          c.created_at,
          mc.confidence_score,
          mc.success_count,
          mc.correction_count
        FROM categorizations c
        LEFT JOIN merchant_confidence mc 
          ON c.merchant_id = mc.merchant_id 
          AND c.category_name = mc.category_name
        WHERE c.merchant_id = ?
        ORDER BY c.created_at DESC
        LIMIT 10
      `),
      
      // Get merchant confidence
      getMerchantConfidence: this.db.prepare(`
        SELECT * FROM merchant_confidence
        WHERE merchant_id = ? AND category_name = ?
      `),
      
      // Record categorization
      recordCategorization: this.db.prepare(`
        INSERT INTO categorizations 
        (merchant_id, category_name, category_id, confidence, auto_approved, transaction_id, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      
      // Update confidence
      updateConfidence: this.db.prepare(`
        INSERT INTO merchant_confidence 
        (merchant_id, category_name, confidence_score, success_count, last_used)
        VALUES (?, ?, ?, 1, CURRENT_DATE)
        ON CONFLICT (merchant_id, category_name) DO UPDATE SET
          confidence_score = 
            CASE 
              WHEN excluded.confidence_score > merchant_confidence.confidence_score 
              THEN excluded.confidence_score
              ELSE (merchant_confidence.confidence_score * 0.8 + excluded.confidence_score * 0.2)
            END,
          success_count = merchant_confidence.success_count + 1,
          last_used = CURRENT_DATE
      `),
      
      // Record correction
      recordCorrection: this.db.prepare(`
        INSERT INTO learning_events
        (merchant_id, event_type, old_category, new_category, confidence_before)
        VALUES (?, 'correction', ?, ?, ?)
      `),
      
      updateCorrectionCount: this.db.prepare(`
        UPDATE merchant_confidence
        SET correction_count = correction_count + 1,
            confidence_score = confidence_score * 0.7
        WHERE merchant_id = ? AND category_name = ?
      `),
      
      // Get high confidence merchants
      getHighConfidenceMerchants: this.db.prepare(`
        SELECT 
          m.name,
          mc.category_name,
          mc.confidence_score,
          mc.success_count,
          mc.correction_count
        FROM merchant_confidence mc
        JOIN merchants m ON mc.merchant_id = m.id
        WHERE mc.confidence_score >= ?
        ORDER BY mc.confidence_score DESC
      `),
      
      // Get recent activity
      getRecentActivity: this.db.prepare(`
        SELECT 
          m.name as merchant_name,
          c.category_name,
          c.confidence,
          c.auto_approved,
          c.was_corrected,
          c.created_at
        FROM categorizations c
        JOIN merchants m ON c.merchant_id = m.id
        ORDER BY c.created_at DESC
        LIMIT ?
      `),
      
      // Stats queries
      getStats: this.db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM merchants) as total_merchants,
          (SELECT COUNT(*) FROM categorizations) as total_categorizations,
          (SELECT COUNT(*) FROM categorizations WHERE auto_approved = 1) as auto_approved_count,
          (SELECT COUNT(*) FROM learning_events WHERE event_type = 'correction') as correction_count,
          (SELECT AVG(confidence_score) FROM merchant_confidence) as avg_confidence
      `)
    };
  }

  // Normalize merchant name for matching
  normalizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim();
  }

  // Find or create a merchant
  findOrCreateMerchant(merchantName) {
    const normalized = this.normalizeName(merchantName);
    
    let merchant = this.stmts.findMerchant.get(normalized);
    
    if (!merchant) {
      const result = this.stmts.createMerchant.run(merchantName, normalized);
      merchant = {
        id: result.lastInsertRowid,
        name: merchantName,
        normalized_name: normalized
      };
    }
    
    return merchant;
  }

  // Get merchant categorization history
  getMerchantHistory(merchantName) {
    const merchant = this.stmts.findMerchant.get(this.normalizeName(merchantName));
    if (!merchant) return null;
    
    const history = this.stmts.getMerchantHistory.all(merchant.id);
    
    // Calculate aggregate confidence
    const categoryStats = {};
    history.forEach(item => {
      if (!categoryStats[item.category_name]) {
        categoryStats[item.category_name] = {
          count: 0,
          confidence_score: item.confidence_score || 50,
          success_count: item.success_count || 0,
          correction_count: item.correction_count || 0
        };
      }
      categoryStats[item.category_name].count++;
    });
    
    // Find most likely category
    let mostLikely = null;
    let highestScore = 0;
    
    for (const [category, stats] of Object.entries(categoryStats)) {
      const score = stats.confidence_score * (stats.count / history.length);
      if (score > highestScore) {
        highestScore = score;
        mostLikely = {
          category,
          confidence: stats.confidence_score,
          usage_count: stats.count
        };
      }
    }
    
    return {
      merchant_id: merchant.id,
      merchant_name: merchant.name,
      total_transactions: history.length,
      most_likely_category: mostLikely,
      recent_history: history.slice(0, 5),
      category_breakdown: categoryStats
    };
  }

  // Get confidence for a specific merchant/category pair
  getMerchantConfidence(merchantName, categoryName) {
    const merchant = this.stmts.findMerchant.get(this.normalizeName(merchantName));
    if (!merchant) return { confidence: 0, isNew: true };
    
    const confidence = this.stmts.getMerchantConfidence.get(merchant.id, categoryName);
    
    return {
      confidence: confidence ? confidence.confidence_score : 0,
      success_count: confidence ? confidence.success_count : 0,
      correction_count: confidence ? confidence.correction_count : 0,
      isNew: !confidence
    };
  }

  // Record a new categorization
  recordCategorization(merchantName, categoryName, categoryId, confidence, autoApproved, transactionId = null, amount = null) {
    const merchant = this.findOrCreateMerchant(merchantName);
    
    // Record the categorization
    this.stmts.recordCategorization.run(
      merchant.id,
      categoryName,
      categoryId,
      confidence,
      autoApproved ? 1 : 0,
      transactionId,
      amount
    );
    
    // Update confidence if auto-approved
    if (autoApproved) {
      this.stmts.updateConfidence.run(merchant.id, categoryName, confidence);
    }
    
    return {
      merchant_id: merchant.id,
      success: true
    };
  }

  // Record a correction
  recordCorrection(merchantName, oldCategory, newCategory) {
    const merchant = this.stmts.findMerchant.get(this.normalizeName(merchantName));
    if (!merchant) return { success: false, error: 'Merchant not found' };
    
    // Get current confidence
    const oldConfidence = this.stmts.getMerchantConfidence.get(merchant.id, oldCategory);
    
    // Record the correction event
    this.stmts.recordCorrection.run(
      merchant.id,
      oldCategory,
      newCategory,
      oldConfidence ? oldConfidence.confidence_score : 0
    );
    
    // Decrease confidence in the old category
    if (oldConfidence) {
      this.stmts.updateCorrectionCount.run(merchant.id, oldCategory);
    }
    
    // Increase confidence in the new category
    this.stmts.updateConfidence.run(merchant.id, newCategory, 80);
    
    return {
      merchant_id: merchant.id,
      success: true,
      old_confidence: oldConfidence ? oldConfidence.confidence_score : 0,
      action: 'Confidence decreased for old category, increased for new'
    };
  }

  // Get merchants with high confidence
  getMerchantSuggestions(minConfidence = 80) {
    return this.stmts.getHighConfidenceMerchants.all(minConfidence);
  }

  // Get recent activity
  getRecentActivity(limit = 20) {
    return this.stmts.getRecentActivity.all(limit);
  }

  // Get database statistics
  getStats() {
    const stats = this.stmts.getStats.get();
    stats.avg_confidence = Math.round(stats.avg_confidence || 0);
    return stats;
  }

  // Export merchant rules
  exportMerchantRules() {
    const rules = this.db.prepare(`
      SELECT 
        m.name as merchant_name,
        mc.category_name,
        mc.confidence_score,
        mc.success_count,
        mc.correction_count
      FROM merchant_confidence mc
      JOIN merchants m ON mc.merchant_id = m.id
      WHERE mc.confidence_score >= 70
      ORDER BY m.name, mc.confidence_score DESC
    `).all();
    
    return rules;
  }

  // Import merchant rules
  importMerchantRules(rules) {
    const imported = [];
    const errors = [];
    
    const transaction = this.db.transaction((rules) => {
      for (const rule of rules) {
        try {
          const merchant = this.findOrCreateMerchant(rule.merchant_name);
          
          this.db.prepare(`
            INSERT INTO merchant_confidence 
            (merchant_id, category_name, confidence_score, success_count, correction_count, last_used)
            VALUES (?, ?, ?, ?, ?, CURRENT_DATE)
            ON CONFLICT (merchant_id, category_name) DO UPDATE SET
              confidence_score = excluded.confidence_score,
              success_count = excluded.success_count,
              correction_count = excluded.correction_count,
              last_used = CURRENT_DATE
          `).run(
            merchant.id,
            rule.category_name,
            rule.confidence_score || 75,
            rule.success_count || 0,
            rule.correction_count || 0
          );
          
          imported.push(rule.merchant_name);
        } catch (error) {
          errors.push({ merchant: rule.merchant_name, error: error.message });
        }
      }
    });
    
    transaction(rules);
    
    return {
      imported: imported.length,
      errors: errors.length,
      details: { imported, errors }
    };
  }

  // Backup database
  async backupDatabase(backupPath) {
    await this.db.backup(backupPath);
    return { success: true, path: backupPath };
  }

  // Health check
  checkHealth() {
    try {
      // Test database connectivity
      const stats = this.getStats();
      const tableCheck = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      
      return {
        status: 'healthy',
        database: 'connected',
        tables: tableCheck.length,
        merchants: stats.total_merchants,
        categorizations: stats.total_categorizations,
        average_confidence: stats.avg_confidence,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Close database connection
  close() {
    this.db.close();
  }
}