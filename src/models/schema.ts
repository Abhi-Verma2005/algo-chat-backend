import { Message } from "ai";
import { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  index,
  text,
} from "drizzle-orm/pg-core";

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  messages: json("messages").notNull(),
  // Store external user ID as string to match external system
  externalUserId: varchar("external_user_id", { length: 255 }).notNull(),
  // Optionally store user email for easier querying (denormalized)
  userEmail: varchar("user_email", { length: 255 }),
});

export type Chat = Omit<InferSelectModel<typeof chat>, "messages"> & {
  messages: Array<Message>;
};

export const codeSubmissions = pgTable("CodeSubmissions", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  externalUserId: varchar("external_user_id", { length: 255 }).notNull(),
  questionSlug: varchar("question_slug", { length: 255 }).notNull(),
  code: text("code").notNull(),
  language: varchar("language", { length: 50 }).notNull().default("python"),
  problemTitle: varchar("problem_title", { length: 500 }),
  submissionStatus: varchar("submission_status", { length: 50 }).notNull().default("accepted"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userQuestionIndex: index("user_question_idx").on(
    table.externalUserId,
    table.questionSlug
  ),
  userIndex: index("user_idx").on(table.externalUserId),
  questionIndex: index("question_idx").on(table.questionSlug),
}));

export type CodeSubmission = InferSelectModel<typeof codeSubmissions>; 