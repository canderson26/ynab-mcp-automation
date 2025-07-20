import { MerchantDatabase } from './database.js';
import { join } from 'path';
import { mkdirSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Ensure data directory exists
const dataDir = join(process.cwd(), '../../data');
mkdirSync(dataDir, { recursive: true });

// Initialize database
const dbPath = process.env.DATABASE_PATH || join(dataDir, 'merchant_data.db');
console.log(`Initializing database at: ${dbPath}`);

const db = new MerchantDatabase(dbPath);

// Add some example high-confidence merchants based on your n8n workflow
const exampleMerchants = [
  { merchant_name: 'Sunoco', category_name: 'Gas & Transportation', confidence_score: 95 },
  { merchant_name: 'ExxonMobil', category_name: 'Gas & Transportation', confidence_score: 95 },
  { merchant_name: 'Instacart', category_name: 'Groceries', confidence_score: 90 },
  { merchant_name: 'Amazon', category_name: 'Stuff I Forgot to Budget For', confidence_score: 70 },
  { merchant_name: 'Claude.ai', category_name: 'Other Subscriptions', confidence_score: 95 },
  { merchant_name: 'River Financial', category_name: 'Brokerage', confidence_score: 90 },
  { merchant_name: 'Foresters Financial', category_name: 'Whole Life Insurance', confidence_score: 85 },
  { merchant_name: 'Accenture', category_name: 'Ready to assign', confidence_score: 100 },
  { merchant_name: 'OrthoVA', category_name: 'Ready to assign', confidence_score: 100 }
];

console.log('Adding example merchant rules...');
const result = db.importMerchantRules(exampleMerchants);
console.log(`Imported ${result.imported} merchant rules`);

if (result.errors > 0) {
  console.error('Errors:', result.details.errors);
}

// Show database stats
const stats = db.getStats();
console.log('\nDatabase Statistics:');
console.log(`- Total merchants: ${stats.total_merchants}`);
console.log(`- Total categorizations: ${stats.total_categorizations}`);
console.log(`- Average confidence: ${stats.avg_confidence}%`);

// Show high confidence merchants
console.log('\nHigh confidence merchants:');
const suggestions = db.getMerchantSuggestions(80);
suggestions.forEach(s => {
  console.log(`- ${s.name} → ${s.category_name} (${Math.round(s.confidence_score)}%)`);
});

db.close();
console.log('\nDatabase initialized successfully!');