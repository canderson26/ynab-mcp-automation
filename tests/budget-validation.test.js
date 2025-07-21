#!/usr/bin/env node
/**
 * Basic Budget Validation Tests
 * Run with: node tests/budget-validation.test.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEquals(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected: ${expected}, Actual: ${actual}`);
    }
  }

  async run() {
    console.log('🧪 Running Budget Validation Tests...\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// Load CLAUDE.md
function loadClaudeFile() {
  const claudePath = join(__dirname, '../automation/CLAUDE.md');
  return readFileSync(claudePath, 'utf8');
}

// Parse targets from CLAUDE.md
function parseTargets(content) {
  const targetMatch = content.match(/targets:\s*\n([\s\S]*?)\n\n/);
  if (!targetMatch) throw new Error('Could not find targets section');
  
  const targets = {};
  const lines = targetMatch[1].split('\n');
  
  for (const line of lines) {
    const match = line.match(/^\s*"([^"]+)":\s*([0-9.]+)/);
    if (match) {
      targets[match[1]] = parseFloat(match[2]);
    }
  }
  
  return targets;
}

// Parse bills from CLAUDE.md
function parseBills(content) {
  const billMatch = content.match(/bills:\s*\n([\s\S]*?)\n```/);
  if (!billMatch) throw new Error('Could not find bills section');
  
  const bills = [];
  const lines = billMatch[1].split('\n');
  let currentBill = null;
  
  for (const line of lines) {
    const nameMatch = line.match(/- name: "([^"]+)"/);
    const amountMatch = line.match(/amount: ([0-9.]+)/);
    
    if (nameMatch) {
      if (currentBill) bills.push(currentBill);
      currentBill = { name: nameMatch[1] };
    } else if (amountMatch && currentBill) {
      currentBill.amount = parseFloat(amountMatch[1]);
    }
  }
  
  if (currentBill) bills.push(currentBill);
  return bills;
}

// Test setup
const runner = new TestRunner();
const EXPECTED_INCOME = 16904.22;

runner.test('CLAUDE.md file exists and is readable', () => {
  const content = loadClaudeFile();
  runner.assert(content.length > 0, 'CLAUDE.md should not be empty');
});

runner.test('Targets section parses correctly', () => {
  const content = loadClaudeFile();
  const targets = parseTargets(content);
  runner.assert(Object.keys(targets).length > 0, 'Should have targets');
});

runner.test('Bills section parses correctly', () => {
  const content = loadClaudeFile();
  const bills = parseBills(content);
  runner.assert(bills.length > 0, 'Should have bills');
});

runner.test('Budget math balances', () => {
  const content = loadClaudeFile();
  const targets = parseTargets(content);
  
  const totalTargets = Object.values(targets).reduce((sum, amount) => sum + amount, 0);
  const difference = Math.abs(totalTargets - EXPECTED_INCOME);
  
  runner.assert(difference < 1, `Budget should balance within $1. Difference: $${difference.toFixed(2)}`);
});

runner.test('All essential categories have targets', () => {
  const content = loadClaudeFile();
  const targets = parseTargets(content);
  
  const essentialCategories = [
    'Groceries',
    'Utilities', 
    'Car Insurance',
    'Term Life Insurance',
    'Daycare',
    'Brokerage'
  ];
  
  for (const category of essentialCategories) {
    runner.assert(
      targets[category] && targets[category] > 0,
      `${category} should have a positive target amount`
    );
  }
});

runner.test('No duplicate categories in targets', () => {
  const content = loadClaudeFile();
  const targetMatch = content.match(/targets:\s*\n([\s\S]*?)\n\n/);
  const lines = targetMatch[1].split('\n');
  
  const categoryNames = [];
  for (const line of lines) {
    const match = line.match(/^\s*"([^"]+)":/);
    if (match) {
      const category = match[1];
      runner.assert(
        !categoryNames.includes(category),
        `Duplicate category found: ${category}`
      );
      categoryNames.push(category);
    }
  }
});

runner.test('Savings rate is reasonable', () => {
  const content = loadClaudeFile();
  const targets = parseTargets(content);
  
  const savingsAmount = (targets['Brokerage'] || 0) + (targets['Emergency'] || 0);
  const savingsRate = (savingsAmount / EXPECTED_INCOME) * 100;
  
  runner.assert(savingsRate >= 20, `Savings rate should be at least 20%, got ${savingsRate.toFixed(1)}%`);
  runner.assert(savingsRate <= 60, `Savings rate should be at most 60%, got ${savingsRate.toFixed(1)}%`);
});

// Run tests
runner.run();