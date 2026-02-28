/**
 * User Service - Manages user profiles, progress, and achievements
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile, UserProgress, Achievement, UserAchievement } from '@/lib/types';

export class UserService {
  private toUTCDateString(input: Date | string): string {
    const d = new Date(input);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
      d.getUTCDate()
    ).padStart(2, '0')}`;
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[v0] Error fetching profile:', error);
      return null;
    }

    return data as Profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[v0] Error updating profile:', error);
      return null;
    }

    return data as Profile;
  }

  /**
   * Get user progress (XP, level, streaks)
   */
  async getUserProgress(userId: string): Promise<UserProgress | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[v0] Error fetching user progress:', error);
      return null;
    }

    return data as UserProgress;
  }

  /**
   * Add XP to user and handle leveling
   */
  async addXP(userId: string, xpAmount: number): Promise<UserProgress | null> {
    const supabase = await createClient();
    
    // Get current progress
    const { data: currentProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!currentProgress) return null;

    const newTotalXP = (currentProgress.total_xp || 0) + xpAmount;
    const newLevel = this.calculateLevel(newTotalXP);
    
    // Check if leveled up
    const leveledUp = newLevel > (currentProgress.level || 1);

    // Update progress
    const today = this.toUTCDateString(new Date());

    const { data, error } = await supabase
      .from('user_progress')
      .update({
        total_xp: newTotalXP,
        level: newLevel,
        last_activity_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[v0] Error updating XP:', error);
      return null;
    }

    await this.checkXPAchievements(userId, newTotalXP);

    if (leveledUp) {
      console.log(`[v0] User ${userId} leveled up to ${newLevel}!`);
    }

    return data as UserProgress;
  }

  /**
   * Update user streak logic
   */
  async updateStreak(userId: string): Promise<UserProgress | null> {
    const supabase = await createClient();
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!progress) return null;

    const now = new Date();
    const today = this.toUTCDateString(now);
    const lastActivity = progress.last_activity_date ? new Date(progress.last_activity_date) : null;
    const lastActivityDay = lastActivity ? this.toUTCDateString(lastActivity) : null;
    
    let newStreak = progress.current_streak || 0;
    
    if (!lastActivity) {
      newStreak = 1;
    } else {
      const diffInDays = Math.floor(
        (new Date(`${today}T00:00:00.000Z`).getTime() - new Date(`${lastActivityDay}T00:00:00.000Z`).getTime()) /
          (1000 * 3600 * 24)
      );
      
      if (diffInDays === 1) {
        newStreak += 1;
      } else if (diffInDays > 1) {
        newStreak = 1;
      }
      // if diffInDays === 0, keep current streak (already active today)
    }

    const newLongestStreak = Math.max(newStreak, progress.longest_streak || 0);

    const { data, error } = await supabase
      .from('user_progress')
      .update({
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_activity_date: today,
        updated_at: now.toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (data) {
      await this.checkStreakAchievements(userId, data.current_streak || 0);
    }

    return data as UserProgress;
  }

  async dailyCheckIn(userId: string): Promise<{ checkedIn: boolean; xpAwarded: number; progress: UserProgress | null }> {
    const supabase = await createClient();
    const today = this.toUTCDateString(new Date());
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!progress) {
      return { checkedIn: false, xpAwarded: 0, progress: null };
    }

    const lastActivityDay = progress.last_activity_date
      ? this.toUTCDateString(progress.last_activity_date)
      : null;

    if (lastActivityDay === today) {
      return { checkedIn: false, xpAwarded: 0, progress: progress as UserProgress };
    }

    const streak = await this.updateStreak(userId);
    const updated = await this.addXP(userId, 10);
    return { checkedIn: true, xpAwarded: 10, progress: updated || streak };
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(limit = 10): Promise<any[]> {
    const supabase = createAdminClient() || await createClient();
    const { data: progressRows, error } = await supabase
      .from('user_progress')
      .select('*')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[v0] Error fetching leaderboard:', error);
      return [];
    }

    if (!progressRows || progressRows.length === 0) {
      return [];
    }

    const userIds = progressRows.map((row: any) => row.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, wallet_address')
      .in('id', userIds);

    if (profilesError) {
      console.warn('[v0] Error fetching leaderboard profiles:', profilesError);
    }

    const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
    return progressRows.map((row: any) => ({
      ...row,
      profiles: profileById.get(row.user_id) || null
    }));
  }

  async getUserRank(userId: string): Promise<number> {
    const supabase = await createClient();

    const { data: me } = await supabase
      .from('user_progress')
      .select('total_xp')
      .eq('user_id', userId)
      .single();

    if (!me) return 0;

    const { count } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .gt('total_xp', me.total_xp || 0);

    return (count || 0) + 1;
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string): Promise<Array<Achievement & { earned_at: string }>> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        earned_at,
        achievements (*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('[v0] Error fetching user achievements:', error);
      return [];
    }

    return data.map(item => ({
      ...item.achievements,
      earned_at: item.earned_at
    })) as any;
  }

  /**
   * Award achievement to user
   */
  async awardAchievement(userId: string, achievementCode: string): Promise<boolean> {
    const supabase = await createClient();
    
    // Get achievement
    const { data: achievement } = await supabase
      .from('achievements')
      .select('id')
      .eq('code', achievementCode)
      .single();

    if (!achievement) return false;

    // Check if already earned
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievement.id)
      .single();

    if (existing) return false; // Already earned

    // Award achievement
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievement.id
      });

    return !error;
  }

  /**
   * Level calculation logic
   * Level 1: 0 XP
   * Level 2: 1000 XP
   * Level 3: 2500 XP
   * Level 4: 5000 XP
   * Formula: level = floor(sqrt(xp / 100)) + 1 (simplified example)
   */
  private calculateLevel(xp: number): number {
    return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)));
  }

  /**
   * Check and award XP-based achievements
   */
  private async checkXPAchievements(userId: string, totalXP: number): Promise<void> {
    const xpMilestones = [
      { threshold: 100, code: 'xp_100' },
      { threshold: 500, code: 'xp_500' },
      { threshold: 1000, code: 'xp_1000' }
    ];

    for (const milestone of xpMilestones) {
      if (totalXP >= milestone.threshold) {
        await this.awardAchievement(userId, milestone.code);
      }
    }
  }

  /**
   * Check and award streak-based achievements
   */
  private async checkStreakAchievements(userId: string, streak: number): Promise<void> {
    if (streak >= 3) {
      await this.awardAchievement(userId, 'streak_3');
    }
    if (streak >= 7) {
      await this.awardAchievement(userId, 'streak_7');
    }
    if (streak >= 30) {
      await this.awardAchievement(userId, 'streak_30');
    }
  }
}

// Singleton instance
export const userService = new UserService();
