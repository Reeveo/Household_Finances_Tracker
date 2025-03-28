import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemStorage } from '../storage';

describe('MemStorage', () => {
  let storage: MemStorage;
  
  beforeEach(() => {
    // Create a fresh instance for each test
    storage = new MemStorage();
  });
  
  describe('User methods', () => {
    it('creates and retrieves a user', async () => {
      const userInput = {
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      const createdUser = await storage.createUser(userInput);
      
      expect(createdUser.id).toBeDefined();
      expect(createdUser.username).toBe(userInput.username);
      expect(createdUser.name).toBe(userInput.name);
      expect(createdUser.email).toBe(userInput.email);
      expect(createdUser.password).toBe(userInput.password);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      
      // Test getUser
      const retrievedUser = await storage.getUser(createdUser.id);
      expect(retrievedUser).toEqual(createdUser);
      
      // Test getUserByUsername
      const retrievedByUsername = await storage.getUserByUsername('testuser');
      expect(retrievedByUsername).toEqual(createdUser);
      
      // Test getUserByEmail
      const retrievedByEmail = await storage.getUserByEmail('test@example.com');
      expect(retrievedByEmail).toEqual(createdUser);
    });
    
    it('returns undefined for non-existent user', async () => {
      const user = await storage.getUser(999);
      expect(user).toBeUndefined();
      
      const userByUsername = await storage.getUserByUsername('nonexistent');
      expect(userByUsername).toBeUndefined();
      
      const userByEmail = await storage.getUserByEmail('nonexistent@example.com');
      expect(userByEmail).toBeUndefined();
    });
  });
  
  describe('Transaction methods', () => {
    let userId: number;
    
    beforeEach(async () => {
      // Create a test user first
      const user = await storage.createUser({
        username: 'transactionuser',
        password: 'password',
        name: 'Transaction User',
        email: 'transactions@example.com'
      });
      userId = user.id;
    });
    
    it('creates and retrieves a transaction', async () => {
      const transactionInput = {
        userId,
        date: '2023-06-15',
        description: 'Test Transaction',
        amount: '100.00',
        category: 'Income',
        subcategory: 'Salary',
        type: 'income',
        paymentMethod: 'Bank Transfer',
        isRecurring: false,
        budgetMonth: null,
        balance: null,
        reference: null,
        notes: null,
        importHash: null
      };
      
      const createdTransaction = await storage.createTransaction(transactionInput);
      
      expect(createdTransaction.id).toBeDefined();
      expect(createdTransaction.userId).toBe(userId);
      expect(createdTransaction.description).toBe('Test Transaction');
      expect(createdTransaction.amount).toBe('100.00');
      expect(createdTransaction.category).toBe('Income');
      expect(createdTransaction.createdAt).toBeInstanceOf(Date);
      
      // Test getTransactionById
      const retrievedTransaction = await storage.getTransactionById(createdTransaction.id);
      expect(retrievedTransaction).toEqual(createdTransaction);
      
      // Test getTransactions
      const allTransactions = await storage.getTransactions(userId);
      expect(allTransactions).toHaveLength(1);
      expect(allTransactions[0]).toEqual(createdTransaction);
    });
    
    it('creates multiple transactions in batch', async () => {
      const transactionInputs = [
        {
          userId,
          date: '2023-06-15',
          description: 'Transaction 1',
          amount: '100.00',
          category: 'Income',
          subcategory: 'Salary',
          type: 'income',
          paymentMethod: 'Bank Transfer',
          isRecurring: false,
          budgetMonth: null,
          balance: null,
          reference: null,
          notes: null,
          importHash: 'hash1'
        },
        {
          userId,
          date: '2023-06-16',
          description: 'Transaction 2',
          amount: '-50.00',
          category: 'Essentials',
          subcategory: 'Groceries',
          type: 'expense',
          paymentMethod: 'Credit Card',
          isRecurring: false,
          budgetMonth: null,
          balance: null,
          reference: null,
          notes: null,
          importHash: 'hash2'
        }
      ];
      
      const createdTransactions = await storage.createManyTransactions(transactionInputs);
      
      expect(createdTransactions).toHaveLength(2);
      expect(createdTransactions[0].description).toBe('Transaction 1');
      expect(createdTransactions[1].description).toBe('Transaction 2');
      
      // Test getTransactions
      const allTransactions = await storage.getTransactions(userId);
      expect(allTransactions).toHaveLength(2);
    });
    
    it('updates a transaction', async () => {
      // Create a transaction first
      const transaction = await storage.createTransaction({
        userId,
        date: '2023-06-15',
        description: 'Original Description',
        amount: '100.00',
        category: 'Income',
        subcategory: 'Salary',
        type: 'income',
        paymentMethod: 'Bank Transfer',
        isRecurring: false,
        budgetMonth: null,
        balance: null,
        reference: null,
        notes: null,
        importHash: null
      });
      
      // Update the transaction
      const updatedTransaction = await storage.updateTransaction(transaction.id, {
        description: 'Updated Description',
        amount: '150.00'
      });
      
      expect(updatedTransaction).toBeDefined();
      expect(updatedTransaction!.id).toBe(transaction.id);
      expect(updatedTransaction!.description).toBe('Updated Description');
      expect(updatedTransaction!.amount).toBe('150.00');
      expect(updatedTransaction!.category).toBe('Income'); // Unchanged field
      
      // Verify the update in storage
      const retrievedTransaction = await storage.getTransactionById(transaction.id);
      expect(retrievedTransaction!.description).toBe('Updated Description');
      expect(retrievedTransaction!.amount).toBe('150.00');
    });
    
    it('deletes a transaction', async () => {
      // Create a transaction first
      const transaction = await storage.createTransaction({
        userId,
        date: '2023-06-15',
        description: 'To Be Deleted',
        amount: '100.00',
        category: 'Income',
        subcategory: 'Salary',
        type: 'income',
        paymentMethod: 'Bank Transfer',
        isRecurring: false,
        budgetMonth: null,
        balance: null,
        reference: null,
        notes: null,
        importHash: null
      });
      
      // Verify it exists
      let retrievedTransaction = await storage.getTransactionById(transaction.id);
      expect(retrievedTransaction).toBeDefined();
      
      // Delete the transaction
      const result = await storage.deleteTransaction(transaction.id);
      expect(result).toBe(true);
      
      // Verify it's gone
      retrievedTransaction = await storage.getTransactionById(transaction.id);
      expect(retrievedTransaction).toBeUndefined();
    });
    
    it('filters transactions by date range', async () => {
      // Create transactions with different dates
      await storage.createManyTransactions([
        {
          userId,
          date: '2023-01-01',
          description: 'January Transaction',
          amount: '100.00',
          category: 'Income',
          type: 'income',
          paymentMethod: null,
          isRecurring: null,
          subcategory: null,
          budgetMonth: null,
          balance: null,
          reference: null,
          notes: null,
          importHash: null
        },
        {
          userId,
          date: '2023-02-15',
          description: 'February Transaction',
          amount: '200.00',
          category: 'Income',
          type: 'income',
          paymentMethod: null,
          isRecurring: null,
          subcategory: null,
          budgetMonth: null,
          balance: null,
          reference: null,
          notes: null,
          importHash: null
        },
        {
          userId,
          date: '2023-03-20',
          description: 'March Transaction',
          amount: '300.00',
          category: 'Income',
          type: 'income',
          paymentMethod: null,
          isRecurring: null,
          subcategory: null,
          budgetMonth: null,
          balance: null,
          reference: null,
          notes: null,
          importHash: null
        }
      ]);
      
      // Test date range filtering
      const transactions = await storage.getTransactionsByDateRange(
        userId,
        new Date('2023-01-15'),
        new Date('2023-03-01')
      );
      
      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe('February Transaction');
    });
    
    it('filters transactions by category', async () => {
      // Create transactions with different categories
      await storage.createManyTransactions([
        {
          userId,
          date: '2023-01-01',
          description: 'Salary',
          amount: '2000.00',
          category: 'Income',
          type: 'income',
          paymentMethod: null,
          isRecurring: null,
          subcategory: null,
          budgetMonth: null,
          balance: null,
          reference: null,
          notes: null,
          importHash: null
        },
        {
          userId,
          date: '2023-01-05',
          description: 'Groceries',
          amount: '-150.00',
          category: 'Essentials',
          type: 'expense',
          paymentMethod: null,
          isRecurring: null,
          subcategory: null,
          budgetMonth: null,
          balance: null,
          reference: null,
          notes: null,
          importHash: null
        },
        {
          userId,
          date: '2023-01-10',
          description: 'Restaurant',
          amount: '-80.00',
          category: 'Lifestyle',
          type: 'expense',
          paymentMethod: null,
          isRecurring: null,
          subcategory: null,
          budgetMonth: null,
          balance: null,
          reference: null,
          notes: null,
          importHash: null
        }
      ]);
      
      // Test category filtering
      const transactions = await storage.getTransactionsByCategory(userId, 'Essentials');
      
      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe('Groceries');
    });
    
    it('gets transactions by import hash', async () => {
      // Create a transaction with an import hash
      const importHash = 'unique-import-hash';
      
      await storage.createTransaction({
        userId,
        date: '2023-06-15',
        description: 'Imported Transaction',
        amount: '100.00',
        category: 'Income',
        type: 'income',
        paymentMethod: null,
        isRecurring: null,
        subcategory: null,
        budgetMonth: null,
        balance: null,
        reference: null,
        notes: null,
        importHash
      });
      
      // Test retrieving by import hash
      const transaction = await storage.getTransactionByImportHash(importHash);
      
      expect(transaction).toBeDefined();
      expect(transaction!.description).toBe('Imported Transaction');
      expect(transaction!.importHash).toBe(importHash);
    });

    it('creates and retrieves a recurring transaction without end date', async () => {
      const transactionInput = {
        userId,
        date: '2023-06-15',
        description: 'Monthly Rent',
        amount: '-1200.00',
        category: 'Essentials',
        subcategory: 'Housing',
        type: 'expense',
        paymentMethod: 'Bank Transfer',
        isRecurring: true,
        frequency: 'monthly', 
        hasEndDate: false,
        endDate: null,
        nextDueDate: '2023-07-15',
        budgetMonth: 6,
        budgetYear: 2023,
        balance: null,
        reference: null,
        notes: 'Recurring monthly rent payment',
        importHash: null
      };
      
      const createdTransaction = await storage.createTransaction(transactionInput);
      
      expect(createdTransaction.id).toBeDefined();
      expect(createdTransaction.isRecurring).toBe(true);
      expect(createdTransaction.frequency).toBe('monthly');
      expect(createdTransaction.hasEndDate).toBe(false);
      expect(createdTransaction.endDate).toBeNull();
      expect(createdTransaction.nextDueDate).toBe('2023-07-15');
      
      // Test getTransactionById for a recurring transaction
      const retrievedTransaction = await storage.getTransactionById(createdTransaction.id);
      expect(retrievedTransaction).toEqual(createdTransaction);
    });
    
    it('creates and retrieves a recurring transaction with end date', async () => {
      const transactionInput = {
        userId,
        date: '2023-06-15',
        description: 'Gym Membership',
        amount: '-50.00',
        category: 'Lifestyle',
        subcategory: 'Fitness',
        type: 'expense',
        paymentMethod: 'Credit Card',
        isRecurring: true,
        frequency: 'monthly',
        hasEndDate: true, 
        endDate: '2023-12-15',
        nextDueDate: '2023-07-15',
        budgetMonth: 6,
        budgetYear: 2023,
        balance: null,
        reference: null,
        notes: 'Monthly gym membership with 6 month commitment',
        importHash: null
      };
      
      const createdTransaction = await storage.createTransaction(transactionInput);
      
      expect(createdTransaction.id).toBeDefined();
      expect(createdTransaction.isRecurring).toBe(true);
      expect(createdTransaction.frequency).toBe('monthly');
      expect(createdTransaction.hasEndDate).toBe(true);
      expect(createdTransaction.endDate).toBe('2023-12-15');
      expect(createdTransaction.nextDueDate).toBe('2023-07-15');
      
      // Test getTransactionById for a recurring transaction with end date
      const retrievedTransaction = await storage.getTransactionById(createdTransaction.id);
      expect(retrievedTransaction).toEqual(createdTransaction);
    });
    
    it('creates multiple recurring transactions in batch', async () => {
      const transactionInputs = [
        {
          userId,
          date: '2023-06-15',
          description: 'Netflix Subscription',
          amount: '-12.99',
          category: 'Lifestyle',
          subcategory: 'Entertainment',
          type: 'expense',
          paymentMethod: 'Credit Card',
          isRecurring: true,
          frequency: 'monthly',
          hasEndDate: false,
          endDate: null,
          nextDueDate: '2023-07-15',
          budgetMonth: 6,
          budgetYear: 2023,
          balance: null,
          reference: null,
          notes: null,
          importHash: 'netflix-hash'
        },
        {
          userId,
          date: '2023-06-20',
          description: 'Car Lease',
          amount: '-350.00',
          category: 'Essentials',
          subcategory: 'Transportation',
          type: 'expense',
          paymentMethod: 'Bank Transfer',
          isRecurring: true,
          frequency: 'monthly',
          hasEndDate: true,
          endDate: '2025-06-20',
          nextDueDate: '2023-07-20',
          budgetMonth: 6,
          budgetYear: 2023,
          balance: null,
          reference: null,
          notes: '24-month car lease',
          importHash: 'car-lease-hash'
        }
      ];
      
      const createdTransactions = await storage.createManyTransactions(transactionInputs);
      
      expect(createdTransactions).toHaveLength(2);
      expect(createdTransactions[0].description).toBe('Netflix Subscription');
      expect(createdTransactions[0].isRecurring).toBe(true);
      expect(createdTransactions[0].hasEndDate).toBe(false);
      
      expect(createdTransactions[1].description).toBe('Car Lease');
      expect(createdTransactions[1].isRecurring).toBe(true);
      expect(createdTransactions[1].hasEndDate).toBe(true);
      expect(createdTransactions[1].endDate).toBe('2025-06-20');
      
      // Test getTransactions
      const allTransactions = await storage.getTransactions(userId);
      expect(allTransactions.length).toBeGreaterThanOrEqual(2);
      
      // Verify both transactions exist in the result
      const netflix = allTransactions.find(t => t.description === 'Netflix Subscription');
      const carLease = allTransactions.find(t => t.description === 'Car Lease');
      
      expect(netflix).toBeDefined();
      expect(carLease).toBeDefined();
      expect(netflix!.isRecurring).toBe(true);
      expect(carLease!.isRecurring).toBe(true);
      expect(netflix!.hasEndDate).toBe(false);
      expect(carLease!.hasEndDate).toBe(true);
      expect(carLease!.endDate).toBe('2025-06-20');
    });
    
    it('updates a recurring transaction', async () => {
      // Create a recurring transaction first
      const transaction = await storage.createTransaction({
        userId,
        date: '2023-06-15',
        description: 'Original Subscription',
        amount: '-10.00',
        category: 'Lifestyle',
        subcategory: 'Entertainment',
        type: 'expense',
        paymentMethod: 'Credit Card',
        isRecurring: true,
        frequency: 'monthly',
        hasEndDate: false,
        endDate: null,
        nextDueDate: '2023-07-15',
        budgetMonth: 6,
        budgetYear: 2023,
        balance: null,
        reference: null,
        notes: null,
        importHash: null
      });
      
      // Update the transaction to have an end date
      const updatedTransaction = await storage.updateTransaction(transaction.id, {
        description: 'Updated Subscription',
        amount: '-15.00',
        hasEndDate: true,
        endDate: '2024-06-15',
        frequency: 'quarterly'
      });
      
      expect(updatedTransaction).toBeDefined();
      expect(updatedTransaction!.id).toBe(transaction.id);
      expect(updatedTransaction!.description).toBe('Updated Subscription');
      expect(updatedTransaction!.amount).toBe('-15.00');
      expect(updatedTransaction!.isRecurring).toBe(true);
      expect(updatedTransaction!.frequency).toBe('quarterly');
      expect(updatedTransaction!.hasEndDate).toBe(true);
      expect(updatedTransaction!.endDate).toBe('2024-06-15');
      
      // Verify the update in storage
      const retrievedTransaction = await storage.getTransactionById(transaction.id);
      expect(retrievedTransaction!.description).toBe('Updated Subscription');
      expect(retrievedTransaction!.frequency).toBe('quarterly');
      expect(retrievedTransaction!.hasEndDate).toBe(true);
      expect(retrievedTransaction!.endDate).toBe('2024-06-15');
    });
  });
});