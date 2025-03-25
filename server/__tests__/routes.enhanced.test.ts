import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express, NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import { setupAuth } from '../auth';

// Mock storage methods with proper types
vi.mock('../storage', () => {
  return {
    storage: {
      getUser: vi.fn().mockReturnValue(undefined),
      getUserByUsername: vi.fn().mockReturnValue(undefined),
      createUser: vi.fn().mockReturnValue({}),
      getTransactions: vi.fn().mockReturnValue([]),
      getTransactionById: vi.fn().mockReturnValue(undefined),
      createTransaction: vi.fn().mockReturnValue({}),
      createManyTransactions: vi.fn().mockReturnValue([]),
      updateTransaction: vi.fn().mockReturnValue(undefined),
      deleteTransaction: vi.fn().mockReturnValue(true),
      getTransactionsByDateRange: vi.fn().mockReturnValue([]),
      getTransactionsByCategory: vi.fn().mockReturnValue([]),
      getTransactionsByBudgetMonth: vi.fn().mockReturnValue([]),
      getTransactionByImportHash: vi.fn().mockReturnValue(undefined),
      sessionStore: {
        get: vi.fn(),
        set: vi.fn(),
        destroy: vi.fn(),
      }
    }
  };
});

// Mock auth
vi.mock('../auth', () => ({
  setupAuth: vi.fn((app) => {
    // Mock authentication middleware for testing
    app.use((req: Request, res: Response, next: NextFunction) => {
      // For testing, we'll manually set req.user when needed
      next();
    });
  })
}));

describe('API Routes - Enhanced Tests', () => {
  let app: Express;
  let server: any;
  
  beforeEach(async () => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Configure mock auth
    setupAuth(app);
    
    // Register routes
    server = await registerRoutes(app);
  });
  
  afterEach(() => {
    server.close();
  });
  
  describe('Authentication and Authorization', () => {
    it('rejects requests without authentication', async () => {
      // Setup a custom middleware that checks for user and rejects if not present
      app.use('/api/protected', (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });
      
      app.get('/api/protected', (req, res) => {
        res.json({ success: true });
      });
      
      const res = await request(app).get('/api/protected');
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
    
    it('allows authenticated requests', async () => {
      // Setup a custom middleware that checks for user
      app.use('/api/protected', (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });
      
      app.get('/api/protected', (req, res) => {
        res.json({ success: true });
      });
      
      const res = await request(app)
        .get('/api/protected')
        .set('user', JSON.stringify({ id: 1 }));  // Setting user for test
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
  
  describe('Input Validation', () => {
    it('validates required fields when creating transactions', async () => {
      // Missing required fields
      const invalidTransactionInput = {
        // Missing description
        amount: '100.00',
        category: 'Income',
        date: '2023-06-15',
        type: 'income'
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .set('user', JSON.stringify({ id: 1 }))
        .send(invalidTransactionInput);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('description is required');
      expect(storage.createTransaction).not.toHaveBeenCalled();
    });
    
    it('validates date format when creating transactions', async () => {
      const invalidDateInput = {
        description: 'Invalid Date Transaction',
        amount: '100.00',
        category: 'Income',
        date: 'not-a-date',  // Invalid date
        type: 'income'
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .set('user', JSON.stringify({ id: 1 }))
        .send(invalidDateInput);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('invalid date format');
      expect(storage.createTransaction).not.toHaveBeenCalled();
    });
    
    it('validates amount format when creating transactions', async () => {
      const invalidAmountInput = {
        description: 'Invalid Amount Transaction',
        amount: 'not-a-number',  // Invalid amount
        category: 'Income',
        date: '2023-06-15',
        type: 'income'
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .set('user', JSON.stringify({ id: 1 }))
        .send(invalidAmountInput);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('invalid amount');
      expect(storage.createTransaction).not.toHaveBeenCalled();
    });
    
    it('validates transaction type when creating transactions', async () => {
      const invalidTypeInput = {
        description: 'Invalid Type Transaction',
        amount: '100.00',
        category: 'Income',
        date: '2023-06-15',
        type: 'invalid-type'  // Invalid type (not income or expense)
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .set('user', JSON.stringify({ id: 1 }))
        .send(invalidTypeInput);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('invalid transaction type');
      expect(storage.createTransaction).not.toHaveBeenCalled();
    });
  });
  
  describe('Error Handling', () => {
    it('handles database errors when creating transactions', async () => {
      // Mock a database error
      storage.createTransaction.mockRejectedValue(new Error('Database error'));
      
      const transactionInput = {
        description: 'New Transaction',
        amount: '100.00',
        category: 'Income',
        date: '2023-06-15',
        type: 'income'
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .set('user', JSON.stringify({ id: 1 }))
        .send(transactionInput);
      
      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('Error creating transaction');
    });
    
    it('handles not found errors when getting a transaction', async () => {
      // Mock a not found response
      storage.getTransactionById.mockResolvedValue(undefined);
      
      const res = await request(app)
        .get('/api/transactions/999')
        .set('user', JSON.stringify({ id: 1 }));
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('Transaction not found');
    });
    
    it('handles unauthorized access to another user\'s transaction', async () => {
      // Mock a transaction that belongs to user 2
      storage.getTransactionById.mockResolvedValue({
        id: 999,
        userId: 2,  // Different from authenticated user
        description: 'Another User\'s Transaction',
        amount: '100.00',
        category: 'Income',
        date: '2023-06-15',
        type: 'income',
        createdAt: new Date()
      });
      
      const res = await request(app)
        .get('/api/transactions/999')
        .set('user', JSON.stringify({ id: 1 }));  // User 1 is authenticated
      
      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('Not authorized');
    });
  });
  
  describe('Query Parameter Handling', () => {
    it('correctly parses date range parameters', async () => {
      // Mock storage implementation
      storage.getTransactionsByDateRange.mockResolvedValue([]);
      
      await request(app)
        .get('/api/transactions?startDate=2023-01-01&endDate=2023-03-01')
        .set('user', JSON.stringify({ id: 1 }));
      
      // Check that the dates were correctly parsed
      expect(storage.getTransactionsByDateRange).toHaveBeenCalledWith(
        1,
        expect.any(Date),
        expect.any(Date)
      );
      
      // Extract the arguments
      const callArgs = storage.getTransactionsByDateRange.mock.calls[0];
      const startDate = callArgs[1];
      const endDate = callArgs[2];
      
      // Verify date parsing
      expect(startDate.getFullYear()).toBe(2023);
      expect(startDate.getMonth()).toBe(0);  // January (0-indexed)
      expect(startDate.getDate()).toBe(1);
      
      expect(endDate.getFullYear()).toBe(2023);
      expect(endDate.getMonth()).toBe(2);  // March (0-indexed)
      expect(endDate.getDate()).toBe(1);
    });
    
    it('handles invalid date parameters', async () => {
      const res = await request(app)
        .get('/api/transactions?startDate=invalid-date&endDate=2023-03-01')
        .set('user', JSON.stringify({ id: 1 }));
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('Invalid date format');
      expect(storage.getTransactionsByDateRange).not.toHaveBeenCalled();
    });
    
    it('correctly parses budget month parameters', async () => {
      // Mock storage implementation
      storage.getTransactionsByBudgetMonth.mockResolvedValue([]);
      
      await request(app)
        .get('/api/transactions?budgetMonth=6&budgetYear=2023')
        .set('user', JSON.stringify({ id: 1 }));
      
      // Check that the parameters were correctly parsed
      expect(storage.getTransactionsByBudgetMonth).toHaveBeenCalledWith(
        1,
        6,
        2023
      );
    });
    
    it('handles invalid budget month parameters', async () => {
      const res = await request(app)
        .get('/api/transactions?budgetMonth=invalid&budgetYear=2023')
        .set('user', JSON.stringify({ id: 1 }));
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('Invalid budget month');
      expect(storage.getTransactionsByBudgetMonth).not.toHaveBeenCalled();
    });
  });
  
  describe('Response Structure', () => {
    it('returns correctly structured transaction response', async () => {
      // Mock a transaction with all fields
      const mockTransaction = {
        id: 1,
        userId: 1,
        description: 'Complete Transaction',
        amount: '100.00',
        category: 'Income',
        subcategory: 'Salary',
        type: 'income',
        date: '2023-06-15',
        paymentMethod: 'Bank Transfer',
        isRecurring: true,
        frequency: 'monthly',
        hasEndDate: false,
        endDate: null,
        nextDueDate: '2023-07-15',
        budgetMonth: 6,
        budgetYear: 2023,
        balance: '1000.00',
        reference: 'REF123',
        notes: 'Transaction notes',
        importHash: 'hash123',
        createdAt: new Date('2023-06-15T10:00:00Z'),
        updatedAt: new Date('2023-06-15T10:00:00Z')
      };
      
      storage.getTransactionById.mockResolvedValue(mockTransaction);
      
      const res = await request(app)
        .get('/api/transactions/1')
        .set('user', JSON.stringify({ id: 1 }));
      
      expect(res.status).toBe(200);
      
      // Verify all expected fields are present in the response
      expect(res.body.id).toBe(1);
      expect(res.body.description).toBe('Complete Transaction');
      expect(res.body.amount).toBe('100.00');
      expect(res.body.category).toBe('Income');
      expect(res.body.subcategory).toBe('Salary');
      expect(res.body.type).toBe('income');
      expect(res.body.date).toBe('2023-06-15');
      expect(res.body.paymentMethod).toBe('Bank Transfer');
      expect(res.body.isRecurring).toBe(true);
      expect(res.body.frequency).toBe('monthly');
      expect(res.body.hasEndDate).toBe(false);
      expect(res.body.endDate).toBe(null);
      expect(res.body.nextDueDate).toBe('2023-07-15');
      expect(res.body.budgetMonth).toBe(6);
      expect(res.body.budgetYear).toBe(2023);
      expect(res.body.balance).toBe('1000.00');
      expect(res.body.reference).toBe('REF123');
      expect(res.body.notes).toBe('Transaction notes');
      expect(res.body.importHash).toBe('hash123');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
      
      // Sensitive fields should not be exposed
      expect(res.body.userId).toBeUndefined();
    });
  });
  
  describe('CSV Import Validation', () => {
    it('validates CSV import data format', async () => {
      // Invalid CSV data (missing required fields)
      const invalidCsvData = [
        {
          // Missing amount
          date: '2023-06-15',
          description: 'Missing Amount'
        }
      ];
      
      const res = await request(app)
        .post('/api/transactions/import')
        .set('user', JSON.stringify({ id: 1 }))
        .send({ transactions: invalidCsvData });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('Invalid CSV data');
      expect(storage.createManyTransactions).not.toHaveBeenCalled();
    });
    
    it('handles duplicate transactions during import', async () => {
      // Mock finding an existing transaction with the same import hash
      storage.getTransactionByImportHash.mockResolvedValue({
        id: 1,
        description: 'Existing Transaction'
      });
      
      const csvData = [
        {
          date: '2023-06-15',
          description: 'Duplicate Transaction',
          amount: '100.00',
          importHash: 'existing-hash'
        }
      ];
      
      const res = await request(app)
        .post('/api/transactions/import')
        .set('user', JSON.stringify({ id: 1 }))
        .send({ transactions: csvData });
      
      expect(res.status).toBe(200);
      expect(res.body.skipped).toBe(1);
      expect(res.body.imported).toBe(0);
      expect(storage.createManyTransactions).not.toHaveBeenCalled();
    });
  });
}); 