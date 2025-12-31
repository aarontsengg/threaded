/**
 * Budget Tracker - Manages per-user spending limits
 * Tracks spending in-memory (resets on server restart)
 * For production, replace with database storage
 */

const PER_USER_LIMIT = 0.50; // $0.50 USDC per user

// In-memory storage of user spending
// Key: userId (session ID or IP), Value: total spent in USDC
const userSpending = new Map<string, number>();

export const budgetTracker = {
  /**
   * Get total amount spent by a user
   */
  getUserSpending(userId: string): number {
    return userSpending.get(userId) || 0;
  },

  /**
   * Get remaining budget for a user
   */
  getRemainingBudget(userId: string): number {
    const spent = this.getUserSpending(userId);
    return Math.max(0, PER_USER_LIMIT - spent);
  },

  /**
   * Check if user has sufficient budget for a transaction
   */
  checkBudget(userId: string, amount: number): {
    hasEnough: boolean;
    spent: number;
    remaining: number;
    limit: number;
  } {
    const spent = this.getUserSpending(userId);
    const remaining = PER_USER_LIMIT - spent;

    return {
      hasEnough: remaining >= amount,
      spent,
      remaining: Math.max(0, remaining),
      limit: PER_USER_LIMIT
    };
  },

  /**
   * Record a successful spending transaction
   */
  recordSpending(userId: string, amount: number): void {
    const currentSpent = this.getUserSpending(userId);
    userSpending.set(userId, currentSpent + amount);
  },

  /**
   * Get all user spending data (for debugging/admin)
   */
  getAllSpending(): Array<{ userId: string; spent: number; remaining: number }> {
    return Array.from(userSpending.entries()).map(([userId, spent]) => ({
      userId,
      spent,
      remaining: Math.max(0, PER_USER_LIMIT - spent)
    }));
  },

  /**
   * Reset a specific user's budget
   */
  resetUser(userId: string): void {
    userSpending.delete(userId);
  },

  /**
   * Reset all budgets (for testing)
   */
  resetAll(): void {
    userSpending.clear();
  },

  /**
   * Get the per-user limit constant
   */
  getUserLimit(): number {
    return PER_USER_LIMIT;
  }
};
