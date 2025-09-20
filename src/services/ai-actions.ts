import { and, desc, eq, inArray } from 'drizzle-orm';
import { externalDb } from '@/lib/algo-db';
import {
  User,
  questions,
  QuestionTag,
  _QuestionToQuestionTag,
  Bookmark,
  Submission,
  UserConfig,
  LeetCodeStats,
  difficultyEnum
} from '@/models/algo-schema';
import { normalizeTags, convertToScreamingSnakeCase } from '@/utils/tag-normalizer';
import { CodeChefStats } from '@/models/algo-schema';

type Difficulty = 'BEGINNER' | 'EASY' | 'MEDIUM' | 'HARD' | 'VERYHARD';

function slugToTitle(slug?: string | null): string | undefined {
  if (!slug) return undefined;
  return slug
    .split('-')
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(' ');
}

function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${m}-${day}`;
}

export const getUserProgress = async (userId: string, options: { timeRange: string }) => {
  // Fetch basic user
  const [user] = await externalDb.select().from(User).where(eq(User.id, userId));

  // Fetch config + stats (optional)
  const [config] = await externalDb
    .select()
    .from(UserConfig)
    .where(eq(UserConfig.userEmail, user?.email ?? ''));

  const [lcStats] = await externalDb
    .select()
    .from(LeetCodeStats)
    .where(eq(LeetCodeStats.leetcodeUsername, user?.leetcodeUsername ?? ''));

  const [ccStats] = user?.email
    ? await externalDb
        .select()
        .from(CodeChefStats)
        .where(eq(CodeChefStats.email, user.email))
    : [undefined as any];

  // Time window filter (optional simple filtering on createdAt)
  const now = new Date();
  let since: Date | undefined;
  if (options.timeRange === 'week') {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (options.timeRange === 'month') {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get user's submissions in range
  const submissions = await externalDb
    .select()
    .from(Submission)
    .where(
      since
        ? and(eq(Submission.userId, userId), (Submission.createdAt as any).gte(since))
        : eq(Submission.userId, userId)
    )
    .orderBy(desc(Submission.createdAt));

  const qIds = Array.from(new Set(submissions.map((s) => s.questionId)));
  const qMap = new Map<string, (typeof questions)['$inferSelect']>();
  if (qIds.length) {
    const qs = await externalDb.select().from(questions).where(inArray(questions.id, qIds));
    qs.forEach((q) => qMap.set(q.id, q));
  }

  // Difficulty aggregates
  const difficulties: Difficulty[] = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'VERYHARD'];
  const byDifficulty = new Map<Difficulty, { solved: number; attempted: number }>();
  difficulties.forEach((d) => byDifficulty.set(d, { solved: 0, attempted: 0 }));

  const attemptedByQuestion = new Map<string, boolean>();
  const solvedByQuestion = new Map<string, boolean>();

  for (const s of submissions) {
    attemptedByQuestion.set(s.questionId, true);
    if (s.status === 'ACCEPTED') {
      solvedByQuestion.set(s.questionId, true);
    }
  }

  for (const qId of attemptedByQuestion.keys()) {
    const q = qMap.get(qId);
    if (!q) continue;
    const bucket = byDifficulty.get(q.difficulty as Difficulty);
    if (!bucket) continue;
    bucket.attempted += 1;
    if (solvedByQuestion.get(qId)) bucket.solved += 1;
  }

  const totalSolved = Array.from(solvedByQuestion.values()).filter(Boolean).length;

  // Streak (days with at least one ACCEPTED)
  const acceptedDates = new Set<string>();
  submissions.forEach((s) => {
    if (s.status === 'ACCEPTED' && s.createdAt) acceptedDates.add(dateKey(new Date(s.createdAt)));
  });
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    if (acceptedDates.has(dateKey(d))) streak += 1; else break;
  }

  return {
    user: {
      username: user?.username ?? '',
      leetcodeUsername: user?.leetcodeUsername ?? '',
      codechefUsername: (user as any)?.codechefUsername ?? '',
      enrollmentNum: user?.enrollmentNum ?? '',
      section: user?.section ?? '',
      individualPoints: user?.individualPoints ?? 0,
      leetcodeQuestionsSolved: lcStats?.totalSolved ?? config?.leetcode_questions_solved ?? totalSolved,
      codechefQuestionsSolved: ccStats?.totalSolved ?? 0,
      codeforcesQuestionsSolved: config?.codeforces_questions_solved ?? 0,
      rank: (config?.rank as string) ?? 'novice_1',
      userBrief:
        config?.user_brief ??
        'Just started focusing on DSA to build problem-solving skills for placements.'
    },
    overview: {
      totalSolved,
      difficultyBreakdown: difficulties.map((d) => {
        const bucket = byDifficulty.get(d)!;
        const successRate = bucket.attempted ? Math.round((bucket.solved / bucket.attempted) * 100) : 0;
        return { difficulty: d, solved: bucket.solved, attempted: bucket.attempted, successRate };
      }),
      currentStreak: streak,
      timeRange: options.timeRange
    },
    // Optional: lightweight tag summary (top tags attempted)
    tagProgress: [],
    recentActivity: {
      last30Days: [],
      thisWeek: [],
      today: []
    }
  };
};

export const getRecentActivity = async (userId: string) => {
  const subs = await externalDb
    .select()
    .from(Submission)
    .where(eq(Submission.userId, userId))
    .orderBy(desc(Submission.createdAt))
    .limit(20);

  const qIds = Array.from(new Set(subs.map((s) => s.questionId)));
  const qMap = new Map<string, (typeof questions)['$inferSelect']>();
  if (qIds.length) {
    const qs = await externalDb.select().from(questions).where(inArray(questions.id, qIds));
    qs.forEach((q) => qMap.set(q.id, q));
  }

  return subs.map((s) => {
    const q = qMap.get(s.questionId);
    const solved = s.status === 'ACCEPTED';
    return {
      type: solved ? 'problem_solved' : 'problem_attempted',
      problem: q?.slug ?? s.questionId,
      title: slugToTitle(q?.slug) ?? q?.slug ?? s.questionId,
      difficulty: q?.difficulty ?? 'EASY',
      timestamp: s.createdAt ?? new Date().toISOString(),
      description: `Status: ${s.status}`,
    };
  });
};

export const getFilteredQuestions = async ({ topics, userId, limit, unsolvedOnly, platform, difficulty, slug, url }: {
  topics: string[];
  userId: string;
  limit: number;
  unsolvedOnly?: boolean;
  platform?: 'LEETCODE' | 'CODECHEF' | 'CODEFORCES';
  difficulty?: Difficulty | Difficulty[];
  slug?: string;
  url?: string;
}) => {
  const normalizedTopics = new Set(normalizeTags(topics || []));

  // Detect platform bias from topics
  let wantsCodeChef = normalizedTopics.has('CODECHEF');
  let wantsLeetCode = normalizedTopics.has('LEETCODE');
  let wantsCodeforces = normalizedTopics.has('CODEFORCES');

  // Explicit platform overrides inferred topics if provided
  if (platform === 'CODECHEF') { wantsCodeChef = true; wantsLeetCode = false; wantsCodeforces = false; }
  if (platform === 'LEETCODE') { wantsLeetCode = true; wantsCodeChef = false; wantsCodeforces = false; }
  if (platform === 'CODEFORCES') { wantsCodeforces = true; wantsLeetCode = false; wantsCodeChef = false; }

  // Load all tags (keeps it simple and avoids dialect-specific functions)
  const allTags = await externalDb.select().from(QuestionTag);
  const wantedTagIds = allTags
    .filter((t) => normalizedTopics.has(convertToScreamingSnakeCase(t.name || '')))
    .map((t) => t.id);

  // Platform-only request without explicit tags: fall back to broad pool
  const platformOnly = wantedTagIds.length === 0 && (wantsCodeChef || wantsLeetCode || wantsCodeforces);

  // Find questions linked to these tag IDs
  const qTagLinks = platformOnly
    ? []
    : await externalDb
        .select()
        .from(_QuestionToQuestionTag)
        .where(inArray(_QuestionToQuestionTag.B, wantedTagIds))
        .limit(2000);

  const questionIds = platformOnly ? [] : Array.from(new Set(qTagLinks.map((l) => l.A)));

  // Load questions and decorate with user-specific flags
  let qs = [] as (typeof questions)['$inferSelect'][];
  if (platformOnly) {
    // Broad sample; we'll filter by URL presence per platform
    qs = await externalDb
      .select()
      .from(questions)
      .orderBy(desc(questions.createdAt as any))
      .limit(500);
  } else {
    if (questionIds.length === 0) {
      return { questionsWithSolvedStatus: [], individualPoints: 0 };
    }
    qs = await externalDb
      .select()
      .from(questions)
      .where(inArray(questions.id, questionIds))
      .limit(Math.min(Math.max(limit, 1), 100));
  }

  // User bookmarks
  const bookmarks = await externalDb
    .select()
    .from(Bookmark)
    .where(eq(Bookmark.userId, userId));
  const bookmarkedSet = new Set(bookmarks.map((b) => b.questionId));

  // Solved questions (distinct by questionId)
  const userSubs = await externalDb
    .select()
    .from(Submission)
    .where(eq(Submission.userId, userId));
  const solvedSet = new Set(
    userSubs.filter((s) => s.status === 'ACCEPTED').map((s) => s.questionId)
  );

  // Map questionId -> tag names for returned questions
  const relevantQIds = qs.map((q) => q.id);
  const tagLinksForQs = relevantQIds.length
    ? await externalDb
        .select()
        .from(_QuestionToQuestionTag)
        .where(inArray(_QuestionToQuestionTag.A, relevantQIds))
    : [];

  const tagIdSet = Array.from(new Set(tagLinksForQs.map((l) => l.B)));
  const tagRecords = tagIdSet.length
    ? await externalDb.select().from(QuestionTag).where(inArray(QuestionTag.id, tagIdSet))
    : [];
  const tagMap = new Map(tagRecords.map((t) => [t.id, t.name] as const));

  let items = qs.map((q) => {
    const tNames = tagLinksForQs
      .filter((l) => l.A === q.id)
      .map((l) => tagMap.get(l.B))
      .filter(Boolean) as string[];

    return {
      id: q.id,
      title: slugToTitle(q.slug) ?? q.slug,
      slug: q.slug,
      difficulty: q.difficulty,
      points: q.points,
      leetcodeUrl: q.leetcodeUrl,
      codechefUrl: (q as any).codechefUrl,
      inArena: q.inArena,
      arenaAddedAt: q.arenaAddedAt ?? undefined,
      isSolved: solvedSet.has(q.id),
      isBookmarked: bookmarkedSet.has(q.id),
      questionTags: tNames.map((name) => ({ name }))
    };
  });

  // Apply platform filters
  if (wantsCodeChef) items = items.filter((q) => !!q.codechefUrl);
  if (wantsLeetCode) items = items.filter((q) => !!q.leetcodeUrl);
  if (wantsCodeforces) items = items.filter((q) => !!(q as any).codeforcesUrl);

  // Apply difficulty filter if supplied
  if (difficulty) {
    const set = new Set(Array.isArray(difficulty) ? difficulty : [difficulty]);
    items = items.filter((q) => set.has(q.difficulty as Difficulty));
  }

  // Apply slug/url filter if supplied
  if (slug) {
    const s = slug.trim().toLowerCase();
    items = items.filter((q) => q.slug?.toLowerCase() === s);
  } else if (url) {
    const u = url.trim().toLowerCase();
    const lastPart = u.split('/').filter(Boolean).pop();
    if (lastPart) {
      items = items.filter((q) => q.slug?.toLowerCase() === lastPart);
    } else {
      // fallback: by platform domain
      if (u.includes('leetcode')) items = items.filter((q) => !!q.leetcodeUrl);
      if (u.includes('codechef')) items = items.filter((q) => !!q.codechefUrl);
    }
  }

  if (unsolvedOnly) items = items.filter((q) => !q.isSolved);

  return {
    questionsWithSolvedStatus: items.slice(0, Math.min(Math.max(limit, 1), 100)),
    individualPoints: (() => {
      // Best-effort: fetch user's points if needed (already available in many calls)
      // We avoid an extra DB call here; points can be omitted or 0 if not present
      return 0;
    })(),
  } as any;
};

export const getTags = async () => {
  const rows = await externalDb.select().from(QuestionTag).orderBy(QuestionTag.name as any);
  return rows.map((r) => r.name).filter((n): n is string => !!n);
};

export const getUserContextForPrompt = async (userId: string) => {
  const [user] = await externalDb.select().from(User).where(eq(User.id, userId));
  const [config] = await externalDb
    .select()
    .from(UserConfig)
    .where(eq(UserConfig.userEmail, user?.email ?? ''));

  // Lightweight preference estimation: most seen tags in recent attempts
  const recentSubs = await externalDb
    .select()
    .from(Submission)
    .where(eq(Submission.userId, userId))
    .orderBy(desc(Submission.createdAt))
    .limit(100);

  const qIds = Array.from(new Set(recentSubs.map((s) => s.questionId)));
  const links = qIds.length
    ? await externalDb
        .select()
        .from(_QuestionToQuestionTag)
        .where(inArray(_QuestionToQuestionTag.A, qIds))
    : [];
  const tagIds = Array.from(new Set(links.map((l) => l.B)));
  const tags = tagIds.length
    ? await externalDb.select().from(QuestionTag).where(inArray(QuestionTag.id, tagIds))
    : [];

  const tagFreq = new Map<string, number>();
  links.forEach((l) => {
    const name = tags.find((t) => t.id === l.B)?.name;
    if (!name) return;
    tagFreq.set(name, (tagFreq.get(name) ?? 0) + 1);
  });
  const preferredTopics = Array.from(tagFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    currentLevel: (config?.rank as string) ?? 'novice_1',
    preferredTopics: preferredTopics.length ? preferredTopics : ['Array', 'String'],
    learningGoals: 'Improve fundamentals and pattern recognition with spaced repetition',
    timeAvailable: '1-2 hours per day',
    weakAreas: ['Dynamic Programming', 'Graph Algorithms'],
    preferences: 'Prefers step-by-step hints and visual mental models',
    progress: (recentSubs.length ? 'Consistent recent practice' : 'Needs a fresh start'),
  };
};

// Minimal platform-specific question fetcher returning only slug and platform URL
// platform: 'LEETCODE' | 'CODECHEF'
export const getQuestionsByPlatform = async ({
  platform,
  userId,
  limit = 10,
  topics = [],
  unsolvedOnly = false,
}: {
  platform: 'LEETCODE' | 'CODECHEF';
  userId: string;
  limit?: number;
  topics?: string[];
  unsolvedOnly?: boolean;
}) => {
  const cappedLimit = Math.min(Math.max(limit ?? 10, 1), 100);

  // Optional tag filtering
  const normalizedTopics = new Set(normalizeTags(topics || []));
  const allTags = await externalDb.select().from(QuestionTag);
  const wantedTagIds = allTags
    .filter((t) => normalizedTopics.has(convertToScreamingSnakeCase(t.name || '')))
    .map((t) => t.id);

  let qIds: string[] | null = null;
  if (wantedTagIds.length > 0) {
    const links = await externalDb
      .select()
      .from(_QuestionToQuestionTag)
      .where(inArray(_QuestionToQuestionTag.B, wantedTagIds))
      .limit(5000);
    qIds = Array.from(new Set(links.map((l) => l.A)));
  }

  // Load a reasonable pool and filter in-memory for portability
  let pool = [] as (typeof questions)['$inferSelect'][];
  if (qIds && qIds.length > 0) {
    pool = await externalDb
      .select()
      .from(questions)
      .where(inArray(questions.id, qIds))
      .limit(1000);
  } else {
    pool = await externalDb
      .select()
      .from(questions)
      .orderBy(desc(questions.createdAt as any))
      .limit(1000);
  }

  // Solved filter support
  let solvedSet = new Set<string>();
  if (unsolvedOnly) {
    const subs = await externalDb
      .select()
      .from(Submission)
      .where(eq(Submission.userId, userId));
    solvedSet = new Set(subs.filter((s) => s.status === 'ACCEPTED').map((s) => s.questionId));
  }

  const items = pool
    .filter((q) => {
      if (platform === 'LEETCODE') return !!q.leetcodeUrl;
      if (platform === 'CODECHEF') return !!(q as any).codechefUrl;
      return false;
    })
    .filter((q) => (unsolvedOnly ? !solvedSet.has(q.id) : true))
    .slice(0, cappedLimit)
    .map((q) => ({
      slug: q.slug,
      url: platform === 'LEETCODE' ? (q.leetcodeUrl as string) : ((q as any).codechefUrl as string),
    }));

  return { questions: items };
};