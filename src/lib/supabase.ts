import { createClient, type User } from '@supabase/supabase-js';
import type { SavedLesson, LessonSettings, ResourceComment, OutputType, InstitutionId } from '@/types';

// Supabase configuration with robust URL validation and fallback
const DEFAULT_SUPABASE_URL = 'https://opukajcwunqrxtdeikcs.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_signature';

function resolveSupabaseUrl(): string {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (envUrl && envUrl !== 'undefined' && envUrl !== 'null' && envUrl !== '""') {
    try {
      const parsed = new URL(envUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return envUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
      }
    } catch {
      // invalid URL format, fall back to default
    }
  }
  return DEFAULT_SUPABASE_URL;
}

export const supabaseUrl = resolveSupabaseUrl();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
const supabaseAnonKey = (rawAnonKey && rawAnonKey !== 'undefined' && rawAnonKey !== 'null') ? rawAnonKey : '';

export const isSupabaseConfigured = (): boolean => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!envUrl || envUrl === 'undefined' || envUrl === 'null' || !supabaseAnonKey || supabaseAnonKey.length < 15) {
    return false;
  }
  try {
    const parsed = new URL(envUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Initialize Supabase client safely with resilient fallback
function initSupabaseClient() {
  try {
    return createClient(supabaseUrl, supabaseAnonKey || DEFAULT_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('[EduHub] Could not initialize real Supabase client, active mock fallback:', err);
    const dummyQueryBuilder: any = {
      select: () => dummyQueryBuilder,
      insert: async () => ({ data: null, error: new Error('Supabase not configured') }),
      upsert: async () => ({ data: null, error: new Error('Supabase not configured') }),
      update: () => dummyQueryBuilder,
      delete: () => dummyQueryBuilder,
      eq: () => dummyQueryBuilder,
      order: () => dummyQueryBuilder,
      limit: () => dummyQueryBuilder,
      single: async () => ({ data: null, error: new Error('Supabase not configured') }),
      ilike: () => dummyQueryBuilder,
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return {
      from: () => dummyQueryBuilder,
      auth: {
        signInWithPassword: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
        signInWithOAuth: async () => ({ error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as unknown as ReturnType<typeof createClient>;
  }
}

export const supabase = initSupabaseClient();

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

export interface TeacherProfile {
  id: string;
  email?: string;
  name: string;
  avatarUrl?: string;
  institution: InstitutionId;
  schoolName?: string;
}

export function normalizeAuthIdentifier(input: string): string {
  const trimmed = (input || '').trim().toLowerCase();
  if (!trimmed) return '';
  // If user entered a username without @ (e.g. 'gamal' or 'teacher10'), format as valid email
  if (!trimmed.includes('@')) {
    return `${trimmed}@sahla-furqan.local`;
  }
  return trimmed;
}

export function translateAuthError(msg: string): string {
  const lower = (msg || '').toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials') || lower.includes('invalid_grant')) {
    return 'بيانات الدخول غير صحيحة أو أن الحساب غير مسجل بعد في المنصة.';
  }
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة.';
  }
  if (lower.includes('password should be at least')) {
    return 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.';
  }
  if (lower.includes('email not confirmed')) {
    return 'الحساب مسجل ولكن بانتظار تأكيد البريد الإلكتروني. يرجى تفقد صندوق الوارد أو البريد غير الهام (Spam).';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'تم إجراء عدة محاولات متتالية. يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً.';
  }
  if (lower.includes('valid email')) {
    return 'يرجى إدخال اسم مستخدم أو بريد إلكتروني صحيح.';
  }
  return msg;
}

export async function signInWithEmail(
  emailOrUsername: string,
  password: string
): Promise<{
  user: User | null;
  error: Error | null;
  isCredentialsError?: boolean;
  isNotConfirmed?: boolean;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        error: new Error('خدمة المزامنة السحابية غير مهيأة بعد. تأكد من تفعيل VITE_SUPABASE_ANON_KEY.'),
      };
    }
    const cleanEmail = normalizeAuthIdentifier(emailOrUsername);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      const isCredentialsError =
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials') ||
        msg.includes('invalid_grant');
      const isNotConfirmed = msg.includes('email not confirmed');
      return {
        user: null,
        error: new Error(translateAuthError(error.message)),
        isCredentialsError,
        isNotConfirmed,
      };
    }
    return { user: data.user, error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { user: null, error };
  }
}

export async function signUpWithEmail(
  emailOrUsername: string,
  password: string,
  fullName: string,
  school: string
): Promise<{
  user: User | null;
  session: unknown | null;
  error: Error | null;
  isAlreadyRegistered?: boolean;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        session: null,
        error: new Error('خدمة المزامنة السحابية غير مهيأة بعد. تأكد من تفعيل VITE_SUPABASE_ANON_KEY.'),
      };
    }
    const cleanEmail = normalizeAuthIdentifier(emailOrUsername);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          school: school,
          username: emailOrUsername.trim(),
        },
      },
    });
    if (error) {
      const isAlreadyRegistered =
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists');
      return {
        user: null,
        session: null,
        error: new Error(translateAuthError(error.message)),
        isAlreadyRegistered,
      };
    }
    return { user: data.user, session: data.session, error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { user: null, session: null, error };
  }
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        error: new Error('خدمة المزامنة السحابية غير مهيأة بعد.'),
      };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
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
  const schoolMeta = (metadata.school || '').toLowerCase();
  
  // School affiliation
  let institution: InstitutionId = 'sahlah';
  if (schoolMeta.includes('furqan') || email.toLowerCase().includes('furqan')) {
    institution = 'furqan';
  } else if (schoolMeta.includes('sahlah') || email.toLowerCase().includes('sahlah')) {
    institution = 'sahlah';
  }

  return {
    id: user.id,
    email,
    name,
    avatarUrl,
    institution,
    schoolName: metadata.school || (institution === 'furqan' ? 'مدارس الفرقان العالمية' : 'أكاديمية سهلة الدولية'),
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
  const parsedSettings = (typeof rec.settings === 'object' && rec.settings !== null ? rec.settings : {}) as Record<string, unknown>;
  const resolvedInstitution = (rec.institution || parsedSettings.institution || 'sahlah') as InstitutionId;

  return {
    id: rec.id,
    title: rec.title,
    outputType: rec.output_type as OutputType,
    settings: {
      subject: rec.subject || (parsedSettings.subject as string) || '',
      grade: rec.grade || (parsedSettings.grade as string) || '',
      duration: (parsedSettings.duration as string) || '45 دقيقة',
      studentLevel: (parsedSettings.studentLevel as string) || 'متوسط',
      teacherName: (parsedSettings.teacherName as string) || rec.user_name || '',
      lessonTitle: (parsedSettings.lessonTitle as string) || rec.title,
      contentLanguage: (parsedSettings.contentLanguage as any) || 'ar',
      institution: resolvedInstitution,
      ...(parsedSettings as unknown as Partial<LessonSettings>),
    },
    contentHtml: rec.content_html,
    html: rec.content_html,
    createdAt: new Date(rec.created_at).getTime(),
    updatedAt: new Date(rec.updated_at).getTime(),
    isPublic: rec.is_public,
    userId: rec.user_id,
    userName: rec.user_name,
    userEmail: rec.user_email,
    userAvatar: rec.user_avatar,
    institution: resolvedInstitution,
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
    const inst = lesson.settings?.institution || profile.institution || 'sahlah';

    // Store institution reliably inside settings JSON to prevent schema mismatch errors
    const enhancedSettings = {
      ...(lesson.settings || {}),
      institution: inst,
    };

    // Notice: We deliberately do NOT put 'institution' as a top-level column here
    // because the Supabase 'resources' table schema does not include an 'institution' column.
    // It is preserved reliably inside the 'settings' JSON column.
    const payload: Record<string, unknown> = {
      id: lesson.id,
      user_id: user.id,
      user_email: profile.email,
      user_name: profile.name,
      user_avatar: profile.avatarUrl,
      title: lesson.title,
      subject: lesson.settings?.subject || '',
      grade: lesson.settings?.grade || '',
      output_type: lesson.outputType,
      content_html: lesson.contentHtml || lesson.html || '',
      settings: enhancedSettings,
      is_public: isPublic,
      likes_count: lesson.likesCount || 0,
      updated_at: new Date().toISOString(),
      created_at: new Date(lesson.createdAt || Date.now()).toISOString(),
    };

    let { error } = await supabase
      .from('resources')
      .upsert(payload, { onConflict: 'id' });

    // Resilient schema cache fallback: if any optional column is reported missing
    // in the Supabase schema cache, strip it and retry immediately.
    let retries = 0;
    while (error && error.message && retries < 3) {
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Supabase schema cache missing column '${missingCol}', stripping and retrying...`);
        delete payload[missingCol];
        const retryResult = await supabase
          .from('resources')
          .upsert(payload, { onConflict: 'id' });
        error = retryResult.error;
        retries++;
      } else {
        break;
      }
    }

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
