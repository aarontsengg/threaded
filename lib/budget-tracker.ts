import { supabase } from './supabase'

const PER_USER_LIMIT = 0.50;

export const budgetTracker = {
  async getUserSpending(userId: string): Promise<number> {
    const { data } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single()
    return data?.credits ?? 0
  },

  async checkBudget(userId: string, amount: number): Promise<{
    hasEnough: boolean;
    spent: number;
    remaining: number;
    limit: number;
  }> {
    const spent = await this.getUserSpending(userId)
    const remaining = PER_USER_LIMIT - spent
    return {
      hasEnough: remaining >= amount,
      spent,
      remaining: Math.max(0, remaining),
      limit: PER_USER_LIMIT,
    }
  },

  async recordSpending(userId: string, amount: number): Promise<void> {
    const spent = await this.getUserSpending(userId)
    await supabase
      .from('user_credits')
      .upsert({ user_id: userId, credits: spent + amount, updated_at: new Date().toISOString() })

    await supabase
      .from('tryon_usage')
      .insert({ user_id: userId, credits_used: amount })
  },

  getUserLimit(): number {
    return PER_USER_LIMIT
  },
}
