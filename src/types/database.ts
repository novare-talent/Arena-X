export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Track = "dsa" | "backend" | "ml" | "frontend" | "ai_llm" | "security";
export type Tier = "unrated" | "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type MatchStatus = "waiting" | "in_progress" | "completed" | "abandoned";
export type Verdict = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "PENDING";
export type ContestStatus = "upcoming" | "active" | "finished";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          college: string | null;
          country: string | null;
          github_username: string | null;
          experience_level: string | null;
          is_pro: boolean;
          pro_expires_at: string | null;
          referral_code: string;
          referred_by: string | null;
          onboarding_completed: boolean;
          intake_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          college?: string | null;
          country?: string | null;
          github_username?: string | null;
          experience_level?: string | null;
          is_pro?: boolean;
          pro_expires_at?: string | null;
          referral_code?: string;
          referred_by?: string | null;
          onboarding_completed?: boolean;
          intake_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      user_ratings: {
        Row: {
          id: string;
          user_id: string;
          track: Track;
          elo: number;
          tier: Tier;
          peak_elo: number;
          matches_played: number;
          wins: number;
          losses: number;
          draws: number;
          current_streak: number;
          best_streak: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track: Track;
          elo?: number;
          tier?: Tier;
          peak_elo?: number;
          matches_played?: number;
          wins?: number;
          losses?: number;
          draws?: number;
          current_streak?: number;
          best_streak?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_ratings"]["Insert"]>;
      };
      problems: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          difficulty: number;
          topics: string[];
          time_limit_ms: number;
          memory_limit_kb: number;
          elo_floor: number;
          elo_ceiling: number;
          track: Track;
          is_active: boolean;
          is_ai_generated: boolean;
          created_by: string | null;
          editorial: string | null;
          accepted_count: number;
          submission_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          difficulty: number;
          topics?: string[];
          time_limit_ms?: number;
          memory_limit_kb?: number;
          elo_floor?: number;
          elo_ceiling?: number;
          track?: Track;
          is_active?: boolean;
          is_ai_generated?: boolean;
          created_by?: string | null;
          editorial?: string | null;
          accepted_count?: number;
          submission_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["problems"]["Insert"]>;
      };
      matches: {
        Row: {
          id: string;
          player_one_id: string;
          player_two_id: string;
          problem_id: string;
          track: Track;
          started_at: string;
          ended_at: string | null;
          winner_id: string | null;
          player_one_elo_before: number;
          player_two_elo_before: number;
          player_one_elo_after: number | null;
          player_two_elo_after: number | null;
          player_one_solve_time_ms: number | null;
          player_two_solve_time_ms: number | null;
          status: MatchStatus;
        };
        Insert: {
          id?: string;
          player_one_id: string;
          player_two_id: string;
          problem_id: string;
          track?: Track;
          started_at?: string;
          ended_at?: string | null;
          winner_id?: string | null;
          player_one_elo_before: number;
          player_two_elo_before: number;
          player_one_elo_after?: number | null;
          player_two_elo_after?: number | null;
          player_one_solve_time_ms?: number | null;
          player_two_solve_time_ms?: number | null;
          status?: MatchStatus;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
      };
      submissions: {
        Row: {
          id: string;
          match_id: string | null;
          user_id: string;
          problem_id: string;
          language: string;
          source_code: string;
          verdict: Verdict;
          runtime_ms: number | null;
          memory_kb: number | null;
          test_cases_passed: number;
          total_test_cases: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id?: string | null;
          user_id: string;
          problem_id: string;
          language: string;
          source_code: string;
          verdict?: Verdict;
          runtime_ms?: number | null;
          memory_kb?: number | null;
          test_cases_passed?: number;
          total_test_cases?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["submissions"]["Insert"]>;
      };
      contests: {
        Row: {
          id: string;
          title: string;
          starts_at: string;
          ends_at: string;
          duration_minutes: number;
          problem_ids: string[];
          status: ContestStatus;
          elo_rated: boolean;
          season_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          starts_at: string;
          ends_at: string;
          duration_minutes?: number;
          problem_ids?: string[];
          status?: ContestStatus;
          elo_rated?: boolean;
          season_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contests"]["Insert"]>;
      };
      contest_registrations: {
        Row: {
          id: string;
          contest_id: string;
          user_id: string;
          registered_at: string;
          final_score: number | null;
          final_rank: number | null;
          elo_change: number | null;
        };
        Insert: {
          id?: string;
          contest_id: string;
          user_id: string;
          registered_at?: string;
          final_score?: number | null;
          final_rank?: number | null;
          elo_change?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["contest_registrations"]["Insert"]>;
      };
      roadmap_progress: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          track: Track;
          problems_solved: number;
          problems_required: number;
          unlocked_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          track?: Track;
          problems_solved?: number;
          problems_required?: number;
          unlocked_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["roadmap_progress"]["Insert"]>;
      };
      daily_challenges: {
        Row: {
          id: string;
          user_id: string;
          problem_id: string;
          date: string;
          solved: boolean;
          solved_at: string | null;
          streak_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_id: string;
          date: string;
          solved?: boolean;
          solved_at?: string | null;
          streak_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["daily_challenges"]["Insert"]>;
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          created_at: string;
          reward_granted: boolean;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          created_at?: string;
          reward_granted?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["referrals"]["Insert"]>;
      };
    };
  };
}