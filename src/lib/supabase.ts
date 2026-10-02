import { createClient, type User } from '@supabase/supabase-js';
import type { SavedLesson, LessonSettings, ResourceComment, OutputType, InstitutionId } from '@/types';

// Supabase configuration
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://opukajcwunqrxtdeikcs.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 10);
};

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'placeholder-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

export interface TeacherProfile {
  id: string;
  email?: string;
  name: string;
  avatarUrl?: string;
  institution: InstitutionId;
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        error: new Error('Supabase is not configured yet. Please provide VITE_SUPABASE_ANON_KEY in your environment variables.'),
      };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    if (!isSupabaseConfigured()) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export function extractProfileFromUser(user: User): TeacherProfile {
  const metadata = user.user_metadata || {};
  const email = user.email || '';
  const name = metadata.full_name || metadata.name || email.split('@')[0] || 'المعلم المبدع';
  const avatarUrl = metadata.avatar_url || metadata.picture;
  
  // Heuristic school affiliation
  let institution: InstitutionId = 'sahlah';
  if (email.toLowerCase().includes('furqan') || (metadata.school && metadata.school.includes('furqan'))) {
    institution = 'furqan';
  }

  return {
    id: user.id,
    email,
    name,
    avatarUrl,
    institution,
  };
}

// ============================================================================
// CLOUD RESOURCE SYNC & COMMUNITY HUB
// ============================================================================

export interface CloudResourceRecord {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  user_avatar?: string;
  institution?: string;
  title: string;
  subject?: string;
  grade?: string;
  output_type: string;
  content_html: string;
  settings?: Record<string, unknown>;
  is_public: boolean;
  likes_count: number;
  comments_count?: number;
  created_at: string;
  updated_at: string;
}

function mapRecordToLesson(rec: CloudResourceRecord): SavedLesson {
  return {
    id: rec.id,
    title: rec.title,
    outputType: rec.output_type as OutputType,
    settings: (rec.settings as unknown as LessonSettings) || {
      subject: rec.subject || '',
      grade: rec.grade || '',
      duration: '45 دقيقة',
      studentLevel: 'متوسط',
      teacherName: rec.user_name || '',
      lessonTitle: rec.title,
      contentLanguage: 'ar',
      institution: (rec.institution as InstitutionId) || 'sahlah',
    },
    contentHtml: rec.content_html,
    createdAt: new Date(rec.created_at).getTime(),
    updatedAt: new Date(rec.updated_at).getTime(),
    isPublic: rec.is_public,
    userId: rec.user_id,
    userName: rec.user_name,
    userEmail: rec.user_email,
    userAvatar: rec.user_avatar,
    institution: (rec.institution as InstitutionId) || 'sahlah',
    likesCount: rec.likes_count || 0,
    commentsCount: rec.comments_count || 0,
  };
}

/**
 * Save / Upsert a lesson to Cloud Library
 */
export async function saveCloudResource(
  lesson: SavedLesson,
  user: User,
  isPublic = false
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const profile = extractProfileFromUser(user);

    const payload = {
      id: lesson.id,
      user_id: user.id,
      user_email: profile.email,
      user_name: profile.name,
      user_avatar: profile.avatarUrl,
      institution: lesson.settings?.institution || profile.institution,
      title: lesson.title,
      subject: lesson.settings?.subject || '',
      grade: lesson.settings?.grade || '',
      output_type: lesson.outputType,
      content_html: lesson.contentHtml,
      settings: lesson.settings,
      is_public: isPublic,
      likes_count: lesson.likesCount || 0,
      updated_at: new Date().toISOString(),
      created_at: new Date(lesson.createdAt || Date.now()).toISOString(),
    };

    const { error } = await supabase
      .from('resources')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase save error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn('Cloud sync error:', error);
    return { success: false, error };
  }
}

/**
 * Fetch all resources saved by the current user from Cloud Library
 */
export async function getCloudResources(userId: string): Promise<SavedLesson[]> {
  try {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Failed to load cloud resources:', error.message);
      return [];
    }

    return (data || []).map((row) => mapRecordToLesson(row as CloudResourceRecord));
  } catch (err) {
    console.warn('getCloudResources error:', err);
    return [];
  }
}

/**
 * Toggle publication of a resource in the Community Hub
 */
export async function togglePublicResource(
  resourceId: string,
  isPublic: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('resources')
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq('id', resourceId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

/**
 * Delete a resource from Supabase Cloud
 */
export async function deleteCloudResource(resourceId: string): Promise<{ success: boolean }> {
  try {
    if (!isSupabaseConfigured()) return { success: false };

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);

    return { success: !error };
  } catch {
    return { success: false };
  }
}

/**
 * Fetch public community resources with optional filters
 */
export async function getPublicCommunityResources(filters?: {
  subject?: string;
  grade?: string;
  outputType?: string;
  search?: string;
}): Promise<SavedLesson[]> {
  try {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('resources')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(60);

    if (filters?.subject && filters.subject !== 'all') {
      query = query.eq('subject', filters.subject);
    }
    if (filters?.grade && filters.grade !== 'all') {
      query = query.eq('grade', filters.grade);
    }
    if (filters?.outputType && filters.outputType !== 'all') {
      query = query.eq('output_type', filters.outputType);
    }
    if (filters?.search && filters.search.trim()) {
      query = query.ilike('title', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Community query error:', error.message);
      return [];
    }

    return (data || []).map((row) => mapRecordToLesson(row as CloudResourceRecord));
  } catch (err) {
    console.warn('getPublicCommunityResources error:', err);
    return [];
  }
}

/**
 * Like a community resource
 */
export async function likeCommunityResource(resourceId: string): Promise<number> {
  try {
    if (!isSupabaseConfigured()) return 0;

    // Fetch current likes
    const { data } = await supabase
      .from('resources')
      .select('likes_count')
      .eq('id', resourceId)
      .single();

    const current = (data?.likes_count as number) || 0;
    const next = current + 1;

    await supabase
      .from('resources')
      .update({ likes_count: next })
      .eq('id', resourceId);

    return next;
  } catch {
    return 0;
  }
}

/**
 * Fetch comments for a resource
 */
export async function getResourceComments(resourceId: string): Promise<ResourceComment[]> {
  try {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('resource_comments')
      .select('*')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Comments query error:', error.message);
      return [];
    }

    return (data || []).map((row: {
      id: string;
      resource_id: string;
      user_id: string;
      user_name?: string;
      user_avatar?: string;
      school?: string;
      comment: string;
      created_at: string;
    }) => ({
      id: row.id,
      resourceId: row.resource_id,
      userId: row.user_id,
      userName: row.user_name || 'معلم زميل',
      userAvatar: row.user_avatar,
      school: row.school,
      comment: row.comment,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn('getResourceComments error:', err);
    return [];
  }
}

/**
 * Post a comment to a community resource
 */
export async function addResourceComment(
  resourceId: string,
  comment: string,
  user: User
): Promise<{ success: boolean; comment?: ResourceComment; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    const profile = extractProfileFromUser(user);
    const id = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newRecord = {
      id,
      resource_id: resourceId,
      user_id: user.id,
      user_name: profile.name,
      user_avatar: profile.avatarUrl,
      school: profile.institution === 'furqan' ? 'مدارس الفرقان' : 'أكاديمية سهلة',
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('resource_comments')
      .insert(newRecord);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      comment: {
        id,
        resourceId,
        userId: user.id,
        userName: profile.name,
        userAvatar: profile.avatarUrl,
        school: newRecord.school,
        comment: comment.trim(),
        createdAt: newRecord.created_at,
      },
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
