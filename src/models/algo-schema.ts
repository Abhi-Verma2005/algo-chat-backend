import { pgTable, varchar, uuid, boolean, timestamp, integer, text, jsonb, pgEnum, index, unique, foreignKey, primaryKey, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Helper function to generate UUIDs
const generateUUID = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Enums
export const contestStatusEnum = pgEnum('ContestStatus', ['UPCOMING', 'ACTIVE', 'COMPLETED']);
export const difficultyEnum = pgEnum('Difficulty', ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'VERYHARD']);
export const questionPlatformEnum = pgEnum('QuestionPlatform', ['LEETCODE', 'CODEFORCES', 'CODECHEF']);
export const submissionStatusEnum = pgEnum('SubmissionStatus', [
  'PENDING',
  'ACCEPTED',
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'COMPILATION_ERROR'
]);
export const applicationStatusEnum = pgEnum('ApplicationStatus', ['PENDING', 'ACCEPTED', 'REJECTED']);
export const rankEnum = pgEnum('Rank', [
  'novice_1',
  'novice_2',
  'learner_1',
  'learner_2',
  'competent_1',
  'advanced',
  'expert'
]);

// Tables
export const UserApiKey = pgTable('UserApiKey', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  key: varchar('key').notNull().unique(),
  userId: varchar('userId').notNull().unique(),
});

export const User = pgTable('User', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  username: varchar('username').notNull().unique(),
  email: varchar('email').notNull().unique(),
  password: varchar('password').notNull(),
  leetcodeUsername: varchar('leetcodeUsername').unique(),
  codechefUsername: varchar('codechefUsername').unique(),
  isComplete: boolean('isComplete'),
  codeforcesUsername: varchar('codeforcesUsername').unique(),
  section: varchar('section'),
  enrollmentNum: varchar('enrollmentNum').unique(),
  profileUrl: varchar('profileUrl'),
  groupId: varchar('groupId'),
  individualPoints: integer('individualPoints').default(0),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  groupIdIdx: index('User_groupId_idx').on(table.groupId),
}));

export const TempContestQuestion = pgTable('TempContestQuestion', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  contestId: integer('contestId').notNull(),
});

export const Group = pgTable('Group', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  name: varchar('name').notNull().unique(),
  coordinatorId: varchar('coordinatorId').notNull().unique(),
  groupPoints: integer('groupPoints').default(0),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  coordinatorIdIdx: index('Group_coordinatorId_idx').on(table.coordinatorId),
}));

export const GroupPermission = pgTable('GroupPermission', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  groupId: varchar('groupId').notNull(),
  contestId: integer('contestId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  groupIdContestIdUnique: unique('GroupPermission_groupId_contestId_key').on(table.groupId, table.contestId),
}));

export const Contest = pgTable('Contest', {
  id: serial('id').primaryKey(),
  startTime: timestamp('startTime').notNull(),
  name: varchar('name').default('Contest'),
  endTime: timestamp('endTime').notNull(),
  status: contestStatusEnum('status').default('UPCOMING'),
  duration: integer('duration').default(0),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  statusStartTimeIdx: index('Contest_status_startTime_idx').on(table.status, table.startTime),
}));

export const TempContestTime = pgTable('TempContestTime', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  contestId: integer('contestId').notNull(),
  endTime: timestamp('endTime').notNull(),
  userId: varchar('userId').notNull(),
});

export const GroupOnContest = pgTable('GroupOnContest', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  groupId: varchar('groupId').notNull(),
  contestId: integer('contestId').notNull(),
  score: integer('score').default(0),
  rank: integer('rank'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  groupIdContestIdUnique: unique('GroupOnContest_groupId_contestId_key').on(table.groupId, table.contestId),
  contestIdScoreIdx: index('GroupOnContest_contestId_score_idx').on(table.contestId, table.score),
}));

export const questions = pgTable('questions', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  leetcodeUrl: varchar('leetcodeUrl').unique(),
  codechefUrl: varchar('codechefUrl').unique(),
  codeforcesUrl: varchar('codeforcesUrl').unique(),
  difficulty: difficultyEnum('difficulty').notNull(),
  points: integer('points').notNull(),
  inContest: boolean('inContest').default(false),
  inArena: boolean('inArena').default(false),
  arenaAddedAt: timestamp('arenaAddedAt'),
  slug: varchar('slug').notNull().unique(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  teachingMeta: jsonb('teachingMeta'),
}, (table) => ({
  inArenaArenaAddedAtIdx: index('questions_inArena_arenaAddedAt_idx').on(table.inArena, table.arenaAddedAt),
}));

export const QuestionTag = pgTable('QuestionTag', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  name: varchar('name').notNull().unique(),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const Bookmark = pgTable('Bookmark', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  userId: varchar('userId').notNull(),
  questionId: varchar('questionId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
}, (table) => ({
  userIdQuestionIdUnique: unique('Bookmark_userId_questionId_key').on(table.userId, table.questionId),
  userIdIdx: index('Bookmark_userId_idx').on(table.userId),
  questionIdIdx: index('Bookmark_questionId_idx').on(table.questionId),
}));

export const Hintnew = pgTable('Hintnew', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  tagHintId: varchar('tagHintId').default('default'),
  content: varchar('content').default('Default content'),
  sequence: integer('sequence').default(0),
  createdAt: timestamp('createdAt').defaultNow(),
}, (table) => ({
  tagHintIdSequenceUnique: unique('Hintnew_tagHintId_sequence_key').on(table.tagHintId, table.sequence),
  tagHintIdSequenceIdx: index('Hintnew_tagHintId_sequence_idx').on(table.tagHintId, table.sequence),
}));

export const QuestionOnContest = pgTable('QuestionOnContest', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  contestId: integer('contestId'),
  questionId: varchar('questionId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
}, (table) => ({
  contestIdQuestionIdUnique: unique('QuestionOnContest_contestId_questionId_key').on(table.contestId, table.questionId),
}));

export const TagHint = pgTable('TagHint', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  questionId: varchar('questionId').notNull(),
  tagId: varchar('tagId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  questionIdTagIdUnique: unique('TagHint_questionId_tagId_key').on(table.questionId, table.tagId),
  questionIdIdx: index('TagHint_questionId_idx').on(table.questionId),
  tagIdIdx: index('TagHint_tagId_idx').on(table.tagId),
}));

export const TagHintRating = pgTable('TagHintRating', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  userId: varchar('userId').notNull(),
  tagHintId: varchar('tagHintId').notNull(),
  isHelpful: boolean('isHelpful').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  userIdTagHintIdUnique: unique('TagHintRating_userId_tagHintId_key').on(table.userId, table.tagHintId),
  tagHintIdx: index('TagHintRating_tagHintId_idx').on(table.tagHintId),
  userIdIdx: index('TagHintRating_userId_idx').on(table.userId),
  tagHintIdIsHelpfulIdx: index('TagHintRating_tagHintId_isHelpful_idx').on(table.tagHintId, table.isHelpful),
}));

export const Hint = pgTable('Hint', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  hint1: varchar('hint1').notNull(),
  hint2: varchar('hint2').notNull(),
  hint3: varchar('hint3').notNull(),
  questionId: varchar('questionId').notNull().unique(),
});

export const ContestPermission = pgTable('ContestPermission', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  contestId: integer('contestId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export const Submission = pgTable('Submission', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  userId: varchar('userId').notNull(),
  questionId: varchar('questionId').notNull(),
  contestId: integer('contestId'),
  score: integer('score').default(0),
  status: submissionStatusEnum('status').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
}, (table) => ({
  userIdContestIdIdx: index('Submission_userId_contestId_idx').on(table.userId, table.contestId),
  contestIdScoreIdx: index('Submission_contestId_score_idx').on(table.contestId, table.score),
}));

export const GroupApplication = pgTable('GroupApplication', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  status: applicationStatusEnum('status').default('PENDING'),
  applicantId: varchar('applicantId').notNull(),
  groupId: varchar('groupId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
}, (table) => ({
  applicantIdGroupIdUnique: unique('GroupApplication_applicantId_groupId_key').on(table.applicantId, table.groupId),
  groupIdStatusIdx: index('GroupApplication_groupId_status_idx').on(table.groupId, table.status),
  applicantIdStatusIdx: index('GroupApplication_applicantId_status_idx').on(table.applicantId, table.status),
}));

export const LeetCodeStats = pgTable('LeetCodeStats', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  username: varchar('username').notNull().unique(),
  email: varchar('email').notNull(),
  leetcodeUsername: varchar('leetcodeUsername').notNull(),
  userProfileUrl: varchar('userProfileUrl'),
  totalSolved: integer('totalSolved').default(0),
  easySolved: integer('easySolved').default(0),
  mediumSolved: integer('mediumSolved').default(0),
  hardSolved: integer('hardSolved').default(0),
  lastUpdated: timestamp('lastUpdated').defaultNow(),
});

export const CodeChefStats = pgTable('CodeChefStats', {
  id: varchar('id').primaryKey().$defaultFn(() => generateUUID()),
  username: varchar('username').notNull().unique(),
  email: varchar('email').notNull(),
  codechefUsername: varchar('codechefUsername').notNull(),
  userProfileUrl: varchar('userProfileUrl'),
  totalSolved: integer('totalSolved').default(0),
  lastUpdated: timestamp('lastUpdated').defaultNow(),
});

export const UserConfig = pgTable('UserConfig', {
  id: serial('id').primaryKey(),
  userEmail: varchar('userEmail').notNull().unique(),
  leetcode_questions_solved: integer('leetcode_questions_solved').notNull(),
  codeforces_questions_solved: integer('codeforces_questions_solved').notNull(),
  rank: rankEnum('rank').default('novice_1'),
  user_brief: text('user_brief').default('Just started focusing on DSA to build problem-solving skills for placements. Motivated to improve, needs structured guidance and consistent practice to grow from basics to intermediate level.'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

// Junction tables for many-to-many relationships
export const _QuestionToQuestionTag = pgTable('_QuestionToQuestionTag', {
  A: varchar('A').notNull(), // questionId
  B: varchar('B').notNull(), // questionTagId
}, (table) => ({
  AB_unique: unique('_QuestionToQuestionTag_AB_unique').on(table.A, table.B),
  A_index: index('_QuestionToQuestionTag_A_index').on(table.A),
  B_index: index('_QuestionToQuestionTag_B_index').on(table.B),
}));

export const _QuestionToTemp = pgTable('_QuestionToTemp', {
  A: varchar('A').notNull(), // questionId
  B: varchar('B').notNull(), // tempContestQuestionId
}, (table) => ({
  AB_unique: unique('_QuestionToTemp_AB_unique').on(table.A, table.B),
  A_index: index('_QuestionToTemp_A_index').on(table.A),
  B_index: index('_QuestionToTemp_B_index').on(table.B),
}));

export const _ContestPermissionToUser = pgTable('_ContestPermissionToUser', {
  A: varchar('A').notNull(), // contestPermissionId
  B: varchar('B').notNull(), // userId
}, (table) => ({
  AB_unique: unique('_ContestPermissionToUser_AB_unique').on(table.A, table.B),
  A_index: index('_ContestPermissionToUser_A_index').on(table.A),
  B_index: index('_ContestPermissionToUser_B_index').on(table.B),
}));

// Relations
export const userApiKeyRelations = relations(UserApiKey, ({ one }) => ({
  user: one(User, {
    fields: [UserApiKey.userId],
    references: [User.id],
  }),
}));

export const userRelations = relations(User, ({ one, many }) => ({
  apiKey: one(UserApiKey, {
    fields: [User.id],
    references: [UserApiKey.userId],
  }),
  group: one(Group, {
    fields: [User.groupId],
    references: [Group.id],
  }),
  coordinatedGroup: one(Group, {
    fields: [User.id],
    references: [Group.coordinatorId],
  }),
  submissions: many(Submission),
  bookmarks: many(Bookmark),
  applications: many(GroupApplication),
  contestTime: many(TempContestTime),
  ratings: many(TagHintRating),
  config: one(UserConfig, {
    fields: [User.email],
    references: [UserConfig.userEmail],
  }),
  contestPermissions: many(_ContestPermissionToUser),
}));

export const tempContestQuestionRelations = relations(TempContestQuestion, ({ many }) => ({
  questions: many(_QuestionToTemp),
}));

export const groupRelations = relations(Group, ({ one, many }) => ({
  coordinator: one(User, {
    fields: [Group.coordinatorId],
    references: [User.id],
  }),
  members: many(User),
  groupPermissions: many(GroupPermission),
  contestsAttempted: many(GroupOnContest),
  applications: many(GroupApplication),
}));

export const groupPermissionRelations = relations(GroupPermission, ({ one }) => ({
  group: one(Group, {
    fields: [GroupPermission.groupId],
    references: [Group.id],
  }),
  contest: one(Contest, {
    fields: [GroupPermission.contestId],
    references: [Contest.id],
  }),
}));

export const contestRelations = relations(Contest, ({ many }) => ({
  groupPermissions: many(GroupPermission),
  questions: many(QuestionOnContest),
  submissions: many(Submission),
  attemptedGroups: many(GroupOnContest),
  contestPermissions: many(ContestPermission),
}));

export const tempContestTimeRelations = relations(TempContestTime, ({ one }) => ({
  user: one(User, {
    fields: [TempContestTime.userId],
    references: [User.id],
  }),
}));

export const groupOnContestRelations = relations(GroupOnContest, ({ one }) => ({
  group: one(Group, {
    fields: [GroupOnContest.groupId],
    references: [Group.id],
  }),
  contest: one(Contest, {
    fields: [GroupOnContest.contestId],
    references: [Contest.id],
  }),
}));

export const questionsRelations = relations(questions, ({ many, one }) => ({
  questionTags: many(_QuestionToQuestionTag),
  contests: many(QuestionOnContest),
  submissions: many(Submission),
  temporary: many(_QuestionToTemp),
  bookmarks: many(Bookmark),
  tagHints: many(TagHint),
  hint: one(Hint, {
    fields: [questions.id],
    references: [Hint.questionId],
  }),
}));

export const questionTagRelations = relations(QuestionTag, ({ many }) => ({
  questions: many(_QuestionToQuestionTag),
  tagHints: many(TagHint),
}));

export const bookmarkRelations = relations(Bookmark, ({ one }) => ({
  user: one(User, {
    fields: [Bookmark.userId],
    references: [User.id],
  }),
  question: one(questions, {
    fields: [Bookmark.questionId],
    references: [questions.id],
  }),
}));

export const hintnewRelations = relations(Hintnew, ({ one }) => ({
  tagHint: one(TagHint, {
    fields: [Hintnew.tagHintId],
    references: [TagHint.id],
  }),
}));

export const questionOnContestRelations = relations(QuestionOnContest, ({ one }) => ({
  contest: one(Contest, {
    fields: [QuestionOnContest.contestId],
    references: [Contest.id],
  }),
  question: one(questions, {
    fields: [QuestionOnContest.questionId],
    references: [questions.id],
  }),
}));

export const tagHintRelations = relations(TagHint, ({ one, many }) => ({
  question: one(questions, {
    fields: [TagHint.questionId],
    references: [questions.id],
  }),
  tag: one(QuestionTag, {
    fields: [TagHint.tagId],
    references: [QuestionTag.id],
  }),
  hints: many(Hintnew),
  ratings: many(TagHintRating),
}));

export const tagHintRatingRelations = relations(TagHintRating, ({ one }) => ({
  user: one(User, {
    fields: [TagHintRating.userId],
    references: [User.id],
  }),
  tagHint: one(TagHint, {
    fields: [TagHintRating.tagHintId],
    references: [TagHint.id],
  }),
}));

export const hintRelations = relations(Hint, ({ one }) => ({
  question: one(questions, {
    fields: [Hint.questionId],
    references: [questions.id],
  }),
}));

export const contestPermissionRelations = relations(ContestPermission, ({ one, many }) => ({
  contest: one(Contest, {
    fields: [ContestPermission.contestId],
    references: [Contest.id],
  }),
  users: many(_ContestPermissionToUser),
}));

export const submissionRelations = relations(Submission, ({ one }) => ({
  user: one(User, {
    fields: [Submission.userId],
    references: [User.id],
  }),
  question: one(questions, {
    fields: [Submission.questionId],
    references: [questions.id],
  }),
  contest: one(Contest, {
    fields: [Submission.contestId],
    references: [Contest.id],
  }),
}));

export const groupApplicationRelations = relations(GroupApplication, ({ one }) => ({
  applicant: one(User, {
    fields: [GroupApplication.applicantId],
    references: [User.id],
  }),
  group: one(Group, {
    fields: [GroupApplication.groupId],
    references: [Group.id],
  }),
}));

export const userConfigRelations = relations(UserConfig, ({ one }) => ({
  user: one(User, {
    fields: [UserConfig.userEmail],
    references: [User.email],
  }),
}));

// Junction table relations
export const _QuestionToQuestionTagRelations = relations(_QuestionToQuestionTag, ({ one }) => ({
  question: one(questions, {
    fields: [_QuestionToQuestionTag.A],
    references: [questions.id],
  }),
  questionTag: one(QuestionTag, {
    fields: [_QuestionToQuestionTag.B],
    references: [QuestionTag.id],
  }),
}));

export const _QuestionToTempRelations = relations(_QuestionToTemp, ({ one }) => ({
  question: one(questions, {
    fields: [_QuestionToTemp.A],
    references: [questions.id],
  }),
  tempContestQuestion: one(TempContestQuestion, {
    fields: [_QuestionToTemp.B],
    references: [TempContestQuestion.id],
  }),
}));

export const questionToQuestionTag = pgTable('_QuestionToQuestionTag', {
  A: varchar('A').notNull(), // Question ID
  B: varchar('B').notNull(), // QuestionTag ID
}, (table) => ({
  pk: primaryKey({ columns: [table.A, table.B] }),
  AIdx: index('_QuestionToQuestionTag_A_index').on(table.A),
  BIdx: index('_QuestionToQuestionTag_B_index').on(table.B),
}));

export const _ContestPermissionToUserRelations = relations(_ContestPermissionToUser, ({ one }) => ({
  contestPermission: one(ContestPermission, {
    fields: [_ContestPermissionToUser.A],
    references: [ContestPermission.id],
  }),
  user: one(User, {
    fields: [_ContestPermissionToUser.B],
    references: [User.id],
  }),
})); 