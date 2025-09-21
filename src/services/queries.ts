import { genSaltSync, hashSync, compareSync } from "bcryptjs";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../lib/database";
import { externalDb } from "../lib/algo-db";
import { chat, codeSubmissions } from "../models/schema";
import { User, UserApiKey } from "../models/algo-schema";

// ============ EXTERNAL USER AUTHENTICATION FUNCTIONS ============
// These functions interact with your external database using Drizzle

export async function authenticateUser(email: string, password: string) {
  try {
    const usersFound = await externalDb
      .select()
      .from(User)
      .where(eq(User.email, email));
    
    if (usersFound.length === 0) {
      return null;
    }
    
    const user = usersFound[0];
    
    // Compare password with hashed password
    const isValidPassword = compareSync(password, user.password);
    
    if (!isValidPassword) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error("Failed to authenticate user from external database");
    throw error;
  }
}

export async function getExternalUser(userEmail: string) {
  try {
    const usersFound = await externalDb
      .select({
        password: User.password,
        username: User.username,
        email: User.email,
        id: User.id
      })
      .from(User)
      .where(eq(User.email, userEmail));

    return usersFound.length > 0 ? usersFound[0] : null;
  } catch (error) {
    console.error("Failed to get user from external database: ", error);
    throw error;
  }
}

export async function getExternalUserByEmail(email: string) {
  try {
    const usersFound = await externalDb
      .select()
      .from(User)
      .where(eq(User.email, email));
    
    return usersFound.length > 0 ? usersFound[0] : null;
  } catch (error) {
    console.error("Failed to get user by email from external database");
    throw error;
  }
}

// ============ CHAT FUNCTIONS (LOCAL DATABASE) ============

export async function saveChat({
  id,
  messages,
  externalUserId,
  userEmail,
}: {
  id: string;
  messages: any;
  externalUserId: string;
  userEmail?: string;
}) {
  try {
    const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

    if (selectedChats.length > 0) {
      return await db
        .update(chat)
        .set({
          messages: JSON.stringify(messages),
        })
        .where(eq(chat.id, id));
    }

    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      messages: JSON.stringify(messages),
      externalUserId,
      userEmail,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByExternalUserId({ externalUserId }: { externalUserId: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.externalUserId, externalUserId))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by external user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

// ============ CODE SUBMISSION FUNCTIONS ============

export async function saveCodeSubmission({
  externalUserId,
  questionSlug,
  code,
  language,
  problemTitle,
  submissionStatus,
}: {
  externalUserId: string;
  questionSlug: string;
  code: string;
  language: string;
  problemTitle?: string;
  submissionStatus: string;
}) {
  try {
    // Normalize status and only persist accepted solutions
    const normalized = (submissionStatus || '').toString().trim().toLowerCase();
    const isAccepted = normalized === 'accepted' || normalized === 'accept' || normalized === 'ac';
    if (!isAccepted) {
      // Do not store non-accepted code submissions
      return { skipped: true, reason: 'non-accepted' } as any;
    }

    // Deduplicate: if an accepted submission already exists, return existing and skip insert
    const existing = await db
      .select()
      .from(codeSubmissions)
      .where(and(
        eq(codeSubmissions.externalUserId, externalUserId),
        eq(codeSubmissions.questionSlug, questionSlug)
      )) as any[];

    const acceptedExisting = existing?.find((s: any) => (s.submissionStatus || '').toLowerCase() === 'accepted');
    if (acceptedExisting) {
      return { skipped: true, reason: 'duplicate-accepted', submission: acceptedExisting } as any;
    }

    // Insert the accepted solution
    const inserted = await db.insert(codeSubmissions).values({
      externalUserId,
      questionSlug,
      code,
      language,
      problemTitle,
      submissionStatus: 'accepted',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return inserted?.[0] ?? inserted;
  } catch (error) {
    console.error("Failed to save code submission in database");
    throw error;
  }
}

export async function getCodeSubmissionsByUser({ externalUserId }: { externalUserId: string }) {
  try {
    return await db
      .select()
      .from(codeSubmissions)
      .where(eq(codeSubmissions.externalUserId, externalUserId))
      .orderBy(desc(codeSubmissions.createdAt));
  } catch (error) {
    console.error("Failed to get code submissions by user from database");
    throw error;
  }
}

export async function getCodeSubmissionById({ id }: { id: string }) {
  try {
    const [submission] = await db.select().from(codeSubmissions).where(eq(codeSubmissions.id, id));
    return submission;
  } catch (error) {
    console.error("Failed to get code submission by id from database");
    throw error;
  }
} 