/**
 * Course Service - Manages course data from Sanity CMS and Supabase cache
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Course, Lesson, Enrollment, LessonCompletion, CompleteLessonResult } from '@/lib/types';
import { sanityService } from './sanity.service';
import { blockchainService } from './blockchain.service';
import { userService } from './user.service';

export class CourseService {
  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  async resolveCourseId(courseId: string): Promise<string | null> {
    if (this.isUuid(courseId)) {
      return courseId;
    }

    const supabase = await createClient();
    const { data: existingBySanityId } = await supabase
      .from('courses')
      .select('id')
      .eq('sanity_id', courseId)
      .single();

    if (existingBySanityId?.id) {
      return existingBySanityId.id;
    }

    const { data: existingBySlug } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', courseId)
      .single();

    if (existingBySlug?.id) {
      return existingBySlug.id;
    }

    const sanityCourses = await sanityService.getCourses();
    const sanityCourse = sanityCourses.find((c: any) => c._id === courseId || c.slug === courseId);
    if (!sanityCourse) {
      return null;
    }

    const syncedId = await this.syncCourseToDb(sanityCourse);
    if (this.isUuid(syncedId)) {
      return syncedId;
    }

    const { data: bySlugAfterSync } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', sanityCourse.slug)
      .single();
    if (bySlugAfterSync?.id) {
      return bySlugAfterSync.id;
    }

    const { data: afterSync } = await supabase
      .from('courses')
      .select('id')
      .eq('sanity_id', sanityCourse._id)
      .single();

    return afterSync?.id || null;
  }

  /**
   * Get all published courses
   */
  async getCourses(filters?: {
    category?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    search?: string;
  }): Promise<Course[]> {
    let courses: Course[] = [];
    
    // Try Sanity first
    const sanityCourses = await sanityService.getCourses();
    if (sanityCourses && sanityCourses.length > 0) {
      const fallbackByCategory: Record<string, string> = {
        'web3': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
        'solana-development': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
        'defi': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
        'nfts': 'https://images.unsplash.com/photo-1643036450161-d4c01cfd1d8a?q=80&w=1200&auto=format&fit=crop',
        'blockchain-basics': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
        'smart-contracts': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
      }
      
      courses = sanityCourses.map((c: any) => ({
        id: c._id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        learning_outcomes: c.learningOutcomes || [],
        prerequisites: c.prerequisites || [],
        thumbnail_url: c.thumbnail_url || fallbackByCategory[c.category || 'web3'],
        difficulty: c.difficulty,
        duration_minutes: c.duration_minutes ?? 0,
        xp_reward: c.xp_reward ?? 500,
        category: c.category ?? 'web3',
        instructor_id: 'sanity',
        published: c.published ?? true,
        order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })) as Course[];
    } else {
      // Fallback to Supabase if Sanity is empty or fails
      const supabase = await createClient();
      let query = supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && data) {
        courses = data.map(course => ({
          ...course,
          published: course.is_published,
          duration_minutes: course.estimated_hours ? course.estimated_hours * 60 : 0
        })) as Course[];
      }
    }

    // Apply filters in memory
    if (filters) {
      if (filters.category) {
        courses = courses.filter(c => c.category === filters.category);
      }
      if (filters.difficulty) {
        courses = courses.filter(c => c.difficulty === filters.difficulty);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        courses = courses.filter(c => 
          c.title.toLowerCase().includes(searchLower) || 
          c.description.toLowerCase().includes(searchLower)
        );
      }
    }

    if (courses.length === 0 && !filters?.search && !filters?.category && !filters?.difficulty) {
      // Return mock data only if everything else failed and no filters are applied
      return [
        {
          id: '1',
          slug: 'solana-fundamentals',
          title: 'Solana Fundamentals',
          description: 'Start from scratch and understand the Solana blockchain inside out.',
          category: 'web3',
          difficulty: 'beginner',
          duration_minutes: 120,
          xp_reward: 500,
          published: true,
          instructor_id: 'mock-instructor',
          order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ] as Course[];
    }

    return courses;
  }

  async getLandingStats(): Promise<{
    activeStudents: number;
    totalCourses: number;
    totalCnftsMinted: number;
    totalXpEarned: number;
  }> {
    const admin = createAdminClient();
    const client = admin || await createClient();

    const [
      profilesCountResult,
      coursesCountResult,
      certificatesCountResult,
      xpRowsResult
    ] = await Promise.all([
      client.from('profiles').select('*', { count: 'exact', head: true }),
      client.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
      client.from('course_certificates').select('*', { count: 'exact', head: true }),
      client.from('user_progress').select('total_xp')
    ]);

    const xpRows = xpRowsResult.data || [];
    const totalXpEarned = xpRows.reduce((sum: number, row: any) => sum + Number(row?.total_xp || 0), 0);

    return {
      activeStudents: profilesCountResult.count || 0,
      totalCourses: coursesCountResult.count || 0,
      totalCnftsMinted: certificatesCountResult.count || 0,
      totalXpEarned
    };
  }

  /**
   * Sync course from Sanity to Supabase
   */
  async syncCourseToDb(sanityCourse: any): Promise<string> {
    const supabase = createAdminClient();
    if (!supabase) {
      return '';
    }
    
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', sanityCourse.slug)
      .single();

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('courses')
      .upsert({
        sanity_id: sanityCourse._id,
        title: sanityCourse.title,
        slug: sanityCourse.slug,
        description: sanityCourse.description,
        difficulty: sanityCourse.difficulty,
        category: sanityCourse.category,
        thumbnail_url: sanityCourse.thumbnail_url,
        estimated_hours: Math.ceil(sanityCourse.duration_minutes / 60),
        is_published: sanityCourse.published ?? true
      }, { onConflict: 'sanity_id' })
      .select('id')
      .single();

    if (error) {
      console.error('[CourseService] Error syncing course to DB:', error.message);
      return '';
    }

    return data.id;
  }

  /**
   * Get course by slug
   */
  async getCourseBySlug(slug: string): Promise<Course | null> {
    const supabase = await createClient();
    
    // Get the course from Supabase first
    const { data: dbCourse } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .single();

    const sanityCourse = await sanityService.getCourseBySlug(slug);
    
    if (sanityCourse) {
      let syncedCourseId = dbCourse?.id;
      if (!syncedCourseId) {
        const createdId = await this.syncCourseToDb(sanityCourse);
        if (this.isUuid(createdId)) {
          syncedCourseId = createdId;
        } else {
          const { data: fallback } = await supabase
            .from('courses')
            .select('id')
            .eq('slug', sanityCourse.slug)
            .single();
          syncedCourseId = fallback?.id;
        }
      }

      const fallbackByCategory: Record<string, string> = {
        'web3': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
        'solana-development': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
        'defi': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
        'nfts': 'https://images.unsplash.com/photo-1643036450161-d4c01cfd1d8a?q=80&w=1200&auto=format&fit=crop',
        'blockchain-basics': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
        'smart-contracts': 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=1200&auto=format&fit=crop',
      }
      return {
        id: syncedCourseId || sanityCourse._id,
        sanity_id: sanityCourse._id,
        slug: sanityCourse.slug,
        title: sanityCourse.title,
        description: sanityCourse.description,
        long_description: sanityCourse.longDescription,
        learning_outcomes: sanityCourse.learningOutcomes || [],
        prerequisites: sanityCourse.prerequisites || [],
        thumbnail_url: sanityCourse.thumbnail_url || fallbackByCategory[sanityCourse.category || 'web3'],
        difficulty: sanityCourse.difficulty,
        duration_minutes: sanityCourse.duration_minutes ?? 0,
        xp_reward: sanityCourse.xp_reward ?? 500,
        category: sanityCourse.category ?? 'web3',
        instructor_id: 'sanity',
        published: sanityCourse.published ?? true,
        order: 0,
        created_at: dbCourse?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Course;
    }
    
    if (!dbCourse) {
      const courses = await this.getCourses();
      return courses.find(c => c.slug === slug) || null;
    }
    
    return {
      ...dbCourse,
      published: dbCourse.is_published,
      duration_minutes: dbCourse.estimated_hours ? dbCourse.estimated_hours * 60 : 0
    } as Course;
  }

  /**
   * Get lessons for a course
   */
  async getCourseLessons(courseId: string): Promise<Lesson[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[v0] Error fetching lessons:', (error as any)?.message ?? error);
      return [];
    }

    return data.map(lesson => ({
      ...lesson,
      lesson_type: lesson.content_type === 'article' ? 'reading' : (lesson.content_type === 'interactive' ? 'coding' : lesson.content_type),
      order: lesson.order_index,
      duration_minutes: lesson.estimated_minutes || 0
    })) as Lesson[];
  }

  /**
   * Get lessons by course slug via Sanity (fallback)
   */
  async getCourseLessonsBySlug(courseSlug: string): Promise<Lesson[]> {
    const sanityCourse = await sanityService.getCourseBySlug(courseSlug);
    if (!sanityCourse?.lessons) return [];
    const mapped = sanityCourse.lessons.map((l: any, idx: number) => ({
      id: l._id,
      course_id: sanityCourse._id,
      slug: l.slug,
      title: l.title,
      description: l.description,
      content: l.content,
      lesson_type: l.lesson_type,
      duration_minutes: l.duration_minutes ?? 0,
      order: l.order_index ?? idx,
      xp_reward: l.xp_reward ?? 50,
      video_url: l.video_url,
      starter_code: l.codeChallenge?.starter_code,
      solution_code: l.codeChallenge?.solution_code,
      language: l.codeChallenge?.language,
        test_cases: l.codeChallenge?.test_cases,
        quiz: l.quiz
    })) as Lesson[];
    return mapped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Merge Supabase and Sanity lessons, preferring Sanity when available
   */
  async getMergedCourseLessons(courseSlug: string, courseId: string): Promise<Lesson[]> {
    const sanityCourse = await sanityService.getCourseBySlug(courseSlug);
    const sanityLessons = await this.getCourseLessonsBySlug(courseSlug);
    const dbCourseId = await this.resolveCourseId(courseId);
    const dbLessons = dbCourseId ? await this.getCourseLessons(dbCourseId) : [];

    try {
      if (sanityCourse && dbCourseId) {
        await this.ensureLessonsSynced(dbCourseId, sanityCourse);
      }
    } catch (error) {
      console.warn('[CourseService] Lesson sync failed, falling back to available lessons:', error);
    }

    if (sanityLessons.length === 0) return dbLessons;
    if (!dbCourseId || dbLessons.length === 0) return sanityLessons;

    const dbBySlug = new Map(dbLessons.map((lesson) => [lesson.slug, lesson]));
    const dbBySanityId = new Map((dbLessons as any[]).map((lesson: any) => [lesson.sanity_id, lesson]));

    // Graceful fallback: if mapping is incomplete, still return lessons for rendering.
    return sanityLessons.map(sl => {
      const dbL = dbBySlug.get(sl.slug) || dbBySanityId.get(sl.id);
      return {
        ...sl,
        id: dbL?.id || sl.id,
        course_id: dbCourseId || sl.course_id
      };
    });
  }

  /**
   * Get lesson by slug
   */
  async getLessonBySlug(courseSlug: string, lessonSlug: string): Promise<Lesson | null> {
    const supabase = await createClient();
    
    // First get the course from Sanity to have the full context
    const sanityCourse = await sanityService.getCourseBySlug(courseSlug);
    const sanityLesson = sanityCourse?.lessons?.find((l: any) => l.slug === lessonSlug);

    // Get the course from Supabase
    const { data: dbCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', courseSlug)
      .single();

    if (!dbCourse) {
      // Fallback to Sanity lesson if Supabase course doesn't exist
      if (sanityLesson) {
        return {
          id: sanityLesson._id,
          course_id: sanityCourse._id,
          slug: sanityLesson.slug,
          title: sanityLesson.title,
          description: sanityLesson.description,
          content: sanityLesson.content,
          lesson_type: sanityLesson.lesson_type,
          duration_minutes: sanityLesson.duration_minutes ?? 0,
          order: sanityLesson.order_index ?? 0,
          xp_reward: sanityLesson.xp_reward ?? 50,
          video_url: sanityLesson.video_url,
          starter_code: sanityLesson.codeChallenge?.starter_code,
          solution_code: sanityLesson.codeChallenge?.solution_code,
          language: sanityLesson.codeChallenge?.language,
          test_cases: sanityLesson.codeChallenge?.test_cases,
          quiz: sanityLesson.quiz
        } as Lesson;
      }
      return null;
    }

    // Get the lesson from Supabase
    const { data: dbLesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', dbCourse.id)
      .eq('slug', lessonSlug)
      .eq('is_published', true)
      .single();

    if (lessonError || !dbLesson) {
      // Fallback to Sanity lesson if Supabase lesson doesn't exist
      if (sanityLesson) {
        return {
          id: sanityLesson._id,
          course_id: dbCourse.id, // Use DB UUID for consistency
          slug: sanityLesson.slug,
          title: sanityLesson.title,
          description: sanityLesson.description,
          content: sanityLesson.content,
          lesson_type: sanityLesson.lesson_type,
          duration_minutes: sanityLesson.duration_minutes ?? 0,
          order: sanityLesson.order_index ?? 0,
          xp_reward: sanityLesson.xp_reward ?? 50,
          video_url: sanityLesson.video_url,
          starter_code: sanityLesson.codeChallenge?.starter_code,
          solution_code: sanityLesson.codeChallenge?.solution_code,
          language: sanityLesson.codeChallenge?.language,
          test_cases: sanityLesson.codeChallenge?.test_cases,
          quiz: sanityLesson.quiz
        } as Lesson;
      }
      return null;
    }

    const lesson = {
      ...dbLesson,
      lesson_type: dbLesson.content_type === 'article' ? 'reading' : (dbLesson.content_type === 'interactive' ? 'coding' : dbLesson.content_type),
      order: dbLesson.order_index,
      duration_minutes: dbLesson.estimated_minutes || 0
    } as Lesson;

    // Merge in code challenge data from Sanity if missing in DB
    if (lesson.lesson_type === 'coding' && !lesson.starter_code && sanityLesson?.codeChallenge) {
      lesson.starter_code = sanityLesson.codeChallenge.starter_code;
      lesson.solution_code = sanityLesson.codeChallenge.solution_code;
      lesson.language = sanityLesson.codeChallenge.language;
      lesson.test_cases = sanityLesson.codeChallenge.test_cases;
    }

    return lesson;
  }

  /**
   * Enroll user in course
   */
  async enrollUser(userId: string, courseId: string): Promise<Enrollment | null> {
    console.log('[CourseService] Enrolling user:', { userId, courseId });
    const supabase = await createClient();
    
    // Ensure courseId is a UUID if it looks like a Sanity ID
    let finalCourseId = courseId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
    
    if (!isUuid) {
      console.log('[CourseService] courseId is not a UUID, searching by sanity_id');
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('sanity_id', courseId)
        .single();
      
      if (course) {
        finalCourseId = course.id;
      } else {
        console.error('[CourseService] Course not found in DB for enrollment:', courseId);
        return null;
      }
    }

    // Check if already enrolled
    const { data: existing, error: checkError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', finalCourseId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('[CourseService] Error checking enrollment:', checkError.message);
    }

    if (existing) {
      console.log('[CourseService] User already enrolled');
      return existing as Enrollment;
    }

    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: finalCourseId,
        progress_percentage: 0
      })
      .select()
      .single();

    if (error) {
      console.error('[CourseService] Error enrolling user:', error.message);
      return null;
    }

    console.log('[CourseService] Successfully enrolled user');
    return data as Enrollment;
  }

  /**
   * Get user's enrollment for a course
   */
  async getUserEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (error) {
      return null;
    }

    return data as Enrollment;
  }

  /**
   * Get all user enrollments
   */
  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (*)
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.warn('[v0] Error fetching enrollments:', (error as any)?.message ?? error);
      return [];
    }

    return data as Enrollment[];
  }

  /**
   * STUBBED: Mark lesson as complete
   */
  async completeLesson(
    userId: string,
    lessonId: string,
    enrollmentId: string,
    xpEarned: number
  ): Promise<CompleteLessonResult> {
    const supabase = await createClient();
    if (!this.isUuid(lessonId)) {
      throw new Error('Invalid lesson ID');
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, user_id, course_id')
      .eq('id', enrollmentId)
      .single();

    if (!enrollment || enrollment.user_id !== userId) {
      throw new Error('Enrollment not found for user');
    }

    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, course_id, order_index, slug')
      .eq('id', lessonId)
      .single();

    if (!lesson || lesson.course_id !== enrollment.course_id) {
      throw new Error('Lesson does not belong to enrolled course');
    }

    const { data: publishedLessons, error: publishedLessonsError } = await supabase
      .from('lessons')
      .select('id, slug, order_index')
      .eq('course_id', enrollment.course_id)
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (publishedLessonsError) {
      throw new Error(`Failed loading lessons for lock check: ${publishedLessonsError.message}`);
    }

    let orderedLessons = publishedLessons || [];
    if (orderedLessons.length === 0) {
      const { data: fallbackLessons, error: fallbackLessonsError } = await supabase
        .from('lessons')
        .select('id, slug, order_index')
        .eq('course_id', enrollment.course_id)
        .order('order_index', { ascending: true });
      if (fallbackLessonsError) {
        throw new Error(`Failed loading fallback lessons for lock check: ${fallbackLessonsError.message}`);
      }
      orderedLessons = fallbackLessons || [];
    }

    const { data: completionRows, error: completionRowsError } = await supabase
      .from('lesson_completions')
      .select('lesson_id, lessons(slug)')
      .eq('user_id', userId)
      .eq('enrollment_id', enrollmentId);

    if (completionRowsError) {
      throw new Error(`Failed loading completion state for lock check: ${completionRowsError.message}`);
    }

    const completedIds = new Set<string>();
    const completedSlugs = new Set<string>();
    for (const row of completionRows || []) {
      if ((row as any)?.lesson_id) {
        completedIds.add((row as any).lesson_id);
      }
      const lessonRef = Array.isArray((row as any).lessons)
        ? (row as any).lessons[0]
        : (row as any).lessons;
      if (lessonRef?.slug) {
        completedSlugs.add(lessonRef.slug);
      }
    }

    const isLessonDone = (candidate: { id: string; slug?: string }) =>
      completedIds.has(candidate.id) || Boolean(candidate.slug && completedSlugs.has(candidate.slug));

    const targetIndex = orderedLessons.findIndex((l: any) => l.id === lesson.id || l.slug === lesson.slug);
    if (targetIndex < 0) {
      throw new Error('Lesson does not belong to enrolled course');
    }

    const targetAlreadyCompleted = isLessonDone(lesson as any);
    if (!targetAlreadyCompleted) {
      let nextPendingIndex = orderedLessons.length - 1;
      for (let index = 0; index < orderedLessons.length; index += 1) {
        if (!isLessonDone(orderedLessons[index] as any)) {
          nextPendingIndex = index;
          break;
        }
      }

      if (targetIndex !== nextPendingIndex) {
        throw new Error('Complete lessons in order to continue');
      }
    }

    let completionId: string | undefined;
    const { data, error } = await supabase
      .from('lesson_completions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        enrollment_id: enrollmentId,
        xp_earned: xpEarned
      })
      .select()
      .single();

    if (error) {
      if ((error as any).code === '23505') {
        const { data: existingCompletion } = await supabase
          .from('lesson_completions')
          .select('id, enrollment_id')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .single();

        if (existingCompletion && existingCompletion.enrollment_id !== enrollmentId) {
          // Data-repair path: same lesson was previously completed under a stale/wrong
          // enrollment. Move completion to the active enrollment so progress can advance.
          const { error: relinkError } = await supabase
            .from('lesson_completions')
            .update({ enrollment_id: enrollmentId, xp_earned: xpEarned })
            .eq('id', existingCompletion.id);

          if (relinkError) {
            throw new Error(relinkError.message || 'Failed to reconcile lesson completion');
          }
        }

        const progressState = await this.updateEnrollmentProgress(enrollmentId);
        return {
          completed: true,
          progressPercentage: progressState.progressPercentage,
          courseCompleted: progressState.courseCompleted,
          certificate: progressState.certificate,
          certificateError: progressState.certificateError
        };
      }
      throw new Error((error as any)?.message || 'Failed to complete lesson');
    }
    completionId = data.id;

    const progressState = await this.updateEnrollmentProgress(enrollmentId, completionId);
    await userService.addXP(userId, xpEarned);
    await userService.updateStreak(userId);
    await userService.awardAchievement(userId, 'first_lesson');
    if (progressState.courseCompleted) {
      await userService.awardAchievement(userId, 'course_complete');
    }

    return {
      completed: true,
      progressPercentage: progressState.progressPercentage,
      courseCompleted: progressState.courseCompleted,
      certificate: progressState.certificate,
      certificateError: progressState.certificateError
    };
  }

  /**
   * Get user's completed lessons for a course
   */
  async getUserCompletedLessons(userId: string, courseId: string): Promise<string[]> {
    const supabase = await createClient();
    const resolvedCourseId = await this.resolveCourseId(courseId);
    if (!resolvedCourseId) return [];

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', resolvedCourseId)
      .single();

    if (!enrollment) return [];

    const { data, error } = await supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('enrollment_id', enrollment.id);

    if (error) {
      console.warn('[v0] Error fetching completed lessons:', (error as any)?.message ?? error);
      return [];
    }

    return data.map(c => c.lesson_id);
  }

  async getUserCompletedLessonSlugs(userId: string, courseId: string): Promise<string[]> {
    const supabase = await createClient();

    const resolvedCourseId = await this.resolveCourseId(courseId);
    if (!resolvedCourseId) return [];

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', resolvedCourseId)
      .single();

    if (!enrollment) return [];

    const { data, error } = await supabase
      .from('lesson_completions')
      .select('lessons(slug)')
      .eq('user_id', userId)
      .eq('enrollment_id', enrollment.id);

    if (error) {
      console.warn('[v0] Error fetching completed lesson slugs:', (error as any)?.message ?? error);
      return [];
    }

    return (data || [])
      .map((row: any) => row.lessons?.slug)
      .filter(Boolean);
  }

  async ensureCourseCertificate(
    userId: string,
    courseId: string,
    lessonCompletionId?: string
  ): Promise<{ mintAddress: string; signature: string }> {
    const resolvedCourseId = await this.resolveCourseId(courseId);
    if (!resolvedCourseId) {
      throw new Error('Course not found for certificate issuance');
    }

    const supabase = await createClient();
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, completed_at, progress_percentage')
      .eq('user_id', userId)
      .eq('course_id', resolvedCourseId)
      .single();

    if (!enrollment) {
      throw new Error('Enrollment required to issue certificate');
    }

    const { data: publishedLessons, error: publishedLessonsError } = await supabase
      .from('lessons')
      .select('id, slug')
      .eq('course_id', resolvedCourseId)
      .eq('is_published', true);

    if (publishedLessonsError) {
      throw new Error(`Failed to verify course completion: ${publishedLessonsError.message}`);
    }

    let published = publishedLessons || [];
    if (published.length === 0) {
      const { data: fallbackLessons, error: fallbackLessonsError } = await supabase
        .from('lessons')
        .select('id, slug')
        .eq('course_id', resolvedCourseId);
      if (fallbackLessonsError) {
        throw new Error(`Failed to load fallback lessons: ${fallbackLessonsError.message}`);
      }
      published = fallbackLessons || [];
    }
    const lessonIds = published.map((lesson: any) => lesson.id).filter(Boolean);
    const lessonSlugs = new Set(published.map((lesson: any) => lesson.slug).filter(Boolean));
    let progress = enrollment.progress_percentage || 0;
    if (published.length > 0) {
      const { data: completionRows, error: completedLessonsError } = await supabase
        .from('lesson_completions')
        .select('lesson_id, lessons(slug)')
        .eq('enrollment_id', enrollment.id);

      if (completedLessonsError) {
        throw new Error(`Failed to verify lesson completions: ${completedLessonsError.message}`);
      }

      const completedIds = new Set<string>();
      const completedSlugs = new Set<string>();
      for (const row of completionRows || []) {
        if ((row as any)?.lesson_id) {
          completedIds.add((row as any).lesson_id);
        }
        const lessonRef = Array.isArray((row as any).lessons)
          ? (row as any).lessons[0]
          : (row as any).lessons;
        if (lessonRef?.slug) {
          completedSlugs.add(lessonRef.slug);
        }
      }

      const matchedCompleted = published.filter((lesson: any) => {
        return completedIds.has(lesson.id) || (lesson.slug && completedSlugs.has(lesson.slug));
      }).length;

      progress = Math.min(100, Math.round((matchedCompleted / published.length) * 100));
    }

    if (progress < 100) {
      throw new Error('Course must be completed before certificate issuance');
    }

    if (!enrollment.completed_at || (enrollment.progress_percentage || 0) !== progress) {
      await supabase
        .from('enrollments')
        .update({
          progress_percentage: progress,
          completed_at: enrollment.completed_at || new Date().toISOString()
        })
        .eq('id', enrollment.id);
    }

    const certificate = await this.issueCompletionCertificate(
      userId,
      resolvedCourseId,
      lessonCompletionId
    );

    if (!certificate) {
      throw new Error('Failed to issue certificate');
    }

    return certificate;
  }

  /**
   * Update enrollment progress percentage
   */
  private async updateEnrollmentProgress(
    enrollmentId: string,
    lessonCompletionId?: string
  ): Promise<{
    progressPercentage: number;
    courseCompleted: boolean;
    certificate?: { mintAddress: string; signature: string };
    certificateError?: string;
  }> {
    const supabase = await createClient();
    
    // Get enrollment with course
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, user_id, course_id, completed_at, progress_percentage')
      .eq('id', enrollmentId)
      .single();

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Only published lessons should count toward completion.
    const { data: publishedLessons, error: publishedLessonsError } = await supabase
      .from('lessons')
      .select('id, slug')
      .eq('course_id', enrollment.course_id)
      .eq('is_published', true);

    if (publishedLessonsError) {
      throw new Error(`Failed to load lessons for progress: ${publishedLessonsError.message}`);
    }

    let published = publishedLessons || [];
    if (published.length === 0) {
      const { data: fallbackLessons, error: fallbackLessonsError } = await supabase
        .from('lessons')
        .select('id, slug')
        .eq('course_id', enrollment.course_id);
      if (fallbackLessonsError) {
        throw new Error(`Failed to load fallback lessons for progress: ${fallbackLessonsError.message}`);
      }
      published = fallbackLessons || [];
    }
    const totalLessons = published.length;

    if (totalLessons > 0) {
      const { data: completionRows, error: completedLessonsError } = await supabase
        .from('lesson_completions')
        .select('lesson_id, lessons(slug)')
        .eq('enrollment_id', enrollmentId);

      if (completedLessonsError) {
        throw new Error(`Failed to load completions for progress: ${completedLessonsError.message}`);
      }

      const completedIds = new Set<string>();
      const completedSlugs = new Set<string>();
      for (const row of completionRows || []) {
        if ((row as any)?.lesson_id) {
          completedIds.add((row as any).lesson_id);
        }
        const lessonRef = Array.isArray((row as any).lessons)
          ? (row as any).lessons[0]
          : (row as any).lessons;
        if (lessonRef?.slug) {
          completedSlugs.add(lessonRef.slug);
        }
      }

      const matchedCompleted = published.filter((lesson: any) => {
        return completedIds.has(lesson.id) || (lesson.slug && completedSlugs.has(lesson.slug));
      }).length;
      const progress = Math.min(100, Math.round((matchedCompleted / totalLessons) * 100));
      await supabase
        .from('enrollments')
        .update({ 
          progress_percentage: progress,
          completed_at: progress === 100 ? new Date().toISOString() : null
        })
        .eq('id', enrollmentId);

      const certificate: { mintAddress: string; signature: string } | undefined = undefined;
      const certificateError: string | undefined = undefined;

      return {
        progressPercentage: progress,
        courseCompleted: progress === 100,
        certificate,
        certificateError
      };
    }

    return {
      progressPercentage: 0,
      courseCompleted: false
    };
  }

  private async ensureLessonsSynced(dbCourseId: string, sanityCourse: any): Promise<void> {
    if (!sanityCourse?.lessons?.length) {
      return;
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return;
    }
    const { data: existing } = await supabase
      .from('lessons')
      .select('id, sanity_id, slug')
      .eq('course_id', dbCourseId);

    const existingSanityIds = new Set((existing || []).map((l: any) => l.sanity_id));
    const existingSlugs = new Set((existing || []).map((l: any) => l.slug));

    // Check global sanity_id collisions so we can re-link existing rows
    // instead of failing on unique constraint "lessons_sanity_id_key".
    const sanityIds = sanityCourse.lessons.map((lesson: any) => lesson._id).filter(Boolean);
    const sanitySlugs = sanityCourse.lessons.map((lesson: any) => lesson.slug).filter(Boolean);
    const sanityIdSet = new Set(sanityIds);
    const sanitySlugSet = new Set(sanitySlugs);

    // Keep published lesson set aligned with Sanity to avoid stale lessons
    // blocking progress and completion.
    const staleLessonIds = (existing || [])
      .filter((lesson: any) => {
        const sanityIdMatch = Boolean(lesson.sanity_id) && sanityIdSet.has(lesson.sanity_id);
        const slugMatch = Boolean(lesson.slug) && sanitySlugSet.has(lesson.slug);
        return !sanityIdMatch && !slugMatch;
      })
      .map((lesson: any) => lesson.id);

    if (staleLessonIds.length > 0) {
      const { error: staleUpdateError } = await supabase
        .from('lessons')
        .update({ is_published: false })
        .in('id', staleLessonIds);

      if (staleUpdateError) {
        console.warn('[CourseService] Failed to archive stale lessons:', staleUpdateError.message);
      }
    }

    const { data: existingGlobalBySanityId } = await supabase
      .from('lessons')
      .select('id, sanity_id, course_id, slug')
      .in('sanity_id', sanityIds);
    const bySanityId = new Map((existingGlobalBySanityId || []).map((row: any) => [row.sanity_id, row]));

    const inserts: any[] = [];
    for (let index = 0; index < sanityCourse.lessons.length; index += 1) {
      const lesson = sanityCourse.lessons[index];
      if (existingSanityIds.has(lesson._id) || existingSlugs.has(lesson.slug)) {
        continue;
      }

      const globalExisting = bySanityId.get(lesson._id);
      if (globalExisting?.id) {
        // Re-link to the current course and keep metadata fresh.
        const { error: updateError } = await supabase
          .from('lessons')
          .update({
            course_id: dbCourseId,
            title: lesson.title,
            slug: lesson.slug,
            description: lesson.description || '',
            content_type: lesson.lesson_type === 'reading'
              ? 'article'
              : lesson.lesson_type === 'coding'
                ? 'interactive'
                : lesson.lesson_type,
            xp_reward: lesson.xp_reward ?? 50,
            order_index: lesson.order_index ?? index,
            estimated_minutes: lesson.duration_minutes ?? 0,
            is_published: true
          })
          .eq('id', globalExisting.id);

        if (!updateError) {
          existingSanityIds.add(lesson._id);
          existingSlugs.add(lesson.slug);
          continue;
        }
      }

      inserts.push({
        sanity_id: lesson._id,
        course_id: dbCourseId,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description || '',
        content_type: lesson.lesson_type === 'reading'
          ? 'article'
          : lesson.lesson_type === 'coding'
            ? 'interactive'
            : lesson.lesson_type,
        xp_reward: lesson.xp_reward ?? 50,
        order_index: lesson.order_index ?? index,
        estimated_minutes: lesson.duration_minutes ?? 0,
        is_published: true
      });
    }

    if (!inserts.length) {
      return;
    }

    const { error } = await supabase
      .from('lessons')
      .upsert(inserts, { onConflict: 'sanity_id' });

    if (error) {
      throw new Error(`Failed syncing lessons: ${error.message}`);
    }
  }

  private async issueCompletionCertificate(
    userId: string,
    courseId: string,
    lessonCompletionId?: string
  ): Promise<{ mintAddress: string; signature: string } | undefined> {
    const supabase = await createClient();

    const { data: existingCert } = await supabase
      .from('course_certificates')
      .select('mint_address, signature')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existingCert?.mint_address && existingCert?.signature) {
      return {
        mintAddress: existingCert.mint_address,
        signature: existingCert.signature
      };
    }

    const [{ data: profile }, { data: course }] = await Promise.all([
      supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', userId)
        .single(),
      supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single()
    ]);

    if (!profile?.wallet_address) {
      throw new Error('Wallet not linked; cannot issue certificate');
    }

    const result = await blockchainService.issueCourseCertificate(
      profile.wallet_address,
      courseId,
      course?.title || 'Course'
    );

    const { error } = await supabase
      .from('course_certificates')
      .upsert({
        user_id: userId,
        course_id: courseId,
        lesson_completion_id: lessonCompletionId || null,
        wallet_address: profile.wallet_address,
        mint_address: result.mintAddress,
        signature: result.signature,
        network: 'devnet',
        metadata_uri: null
      }, { onConflict: 'user_id,course_id' });

    if (error) {
      throw new Error(`Failed persisting certificate: ${error.message}`);
    }

    return {
      mintAddress: result.mintAddress,
      signature: result.signature
    };
  }
}

// Singleton instance
export const courseService = new CourseService();
