import { Request, Response } from "express";
import { geminiFlashModel } from "@/services/ai-service";
import { generateObject } from "ai";
import { z } from "zod";
import { externalDb as db } from "@/lib/algo-db";
import {
  Submission,
  questions,
  submissionStatusEnum,
} from "@/models/algo-schema";
import { eq, and } from "drizzle-orm";

// Schema for AI verification response
const verificationSchema = z.object({
  isLegitimate: z
    .boolean()
    .describe("Whether the code is a legitimate solution (not hardcoded)"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence level of the assessment (0-1)"),
  feedback: z
    .string()
    .describe("Detailed explanation of why the code is legitimate or not"),
  reasonsForDecision: z
    .array(z.string())
    .describe("List of specific reasons for the decision"),
  suggestions: z
    .array(z.string())
    .optional()
    .describe("Suggestions for improvement if code is problematic"),
});

export const verifyCodeSolution = async (req: Request, res: Response) => {
  try {
    const { questionId, questionTitle, questionText, code, platform } =
      req.body;
    const userId = (req as any).user.userId; // Get userId from auth middleware

    console.log("🔍 Starting code verification:", {
      questionId,
      questionTitle,
      userId,
      platform,
      codeLength: code?.length || 0,
    });

    if (!questionId || !questionTitle || !questionText || !code || !platform) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: questionId, questionTitle, questionText, code, platform",
      });
    }

    // Create AI prompt for code verification
    const verificationPrompt = `
You are an expert code reviewer tasked with determining if a solution is legitimate or hardcoded.

**Problem Statement:**
${questionTitle}

**Full Problem Description:**
${questionText}

**Submitted Code:**
\`\`\`
${code}
\`\`\`

**Platform:** ${platform}

Please analyze this code and determine:

1. **Is this a legitimate algorithmic solution?** 
   - Does it solve the problem generally for all valid inputs?
   - Or is it hardcoded to pass only specific test cases?

2. **Key factors to consider:**
   - Does the code implement a proper algorithm/logic?
   - Are there hardcoded outputs or magic numbers that seem suspicious?
   - Does the solution handle edge cases properly?
   - Is the approach reasonable for this type of problem?
   - Are there obvious attempts to cheat the test system?

3. **Red flags for hardcoded solutions:**
   - Hardcoded return statements for specific inputs
   - Arrays of precomputed answers
   - If-else chains that handle specific test cases
   - Solutions that don't implement any real algorithm
   - Code that seems to memorize expected outputs

4. **Green flags for legitimate solutions:**
   - Proper algorithmic thinking
   - General logic that would work for any valid input
   - Appropriate data structures and algorithms
   - Code that solves the problem conceptually

Be strict but fair in your assessment. A solution should be marked as legitimate only if it demonstrates genuine problem-solving approach.
`;

    // Call AI to verify the code
    const aiResponse = await generateObject({
      model: geminiFlashModel,
      prompt: verificationPrompt,
      schema: verificationSchema,
    });

    const verification = aiResponse.object;

    // Log the verification for debugging
    console.log("🤖 AI Verification Result:", {
      questionId,
      userId,
      isLegitimate: verification.isLegitimate,
      confidence: verification.confidence,
      platform,
    });

    return res.json({
      success: true,
      isLegitimate: verification.isLegitimate,
      confidence: verification.confidence,
      feedback: verification.feedback,
      reasonsForDecision: verification.reasonsForDecision,
      suggestions: verification.suggestions,
    });
  } catch (error) {
    console.error("❌ Error verifying code solution:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify code solution",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const markQuestionCompleted = async (req: Request, res: Response) => {
  try {
    const { questionId, platform, code, verificationDetails } = req.body;
    const userId = (req as any).user.userId; // Get userId from auth middleware

    console.log("📝 Marking question as completed:", {
      questionId,
      userId,
      platform,
      hasVerificationDetails: !!verificationDetails,
      codeLength: code?.length || 0,
    });

    if (!questionId || !platform || !code) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: questionId, platform, code",
      });
    }

    // Verify the question exists
    const question = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (question.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Check if user already has a successful submission for this question
    const existingSubmission = await db
      .select()
      .from(Submission)
      .where(
        and(
          eq(Submission.userId, userId),
          eq(Submission.questionId, questionId),
          eq(Submission.status, "ACCEPTED")
        )
      )
      .limit(1);

    if (existingSubmission.length > 0) {
      return res.json({
        success: true,
        message: "Question already marked as completed",
        submissionId: existingSubmission[0].id,
      });
    }

    // Calculate score based on question difficulty and points
    const questionData = question[0];
    let score = questionData.points || 0;

    // Bonus points for AI verification confidence if available
    if (verificationDetails?.confidence) {
      score = Math.round(score * verificationDetails.confidence);
    }

    // Create new submission record
    const newSubmission = await db
      .insert(Submission)
      .values({
        userId,
        questionId,
        status: "ACCEPTED",
        score,
        createdAt: new Date(),
      })
      .returning();

    // Log verification details for audit purposes
    if (verificationDetails && newSubmission[0]) {
      console.log("🔍 Code verification completed:", {
        submissionId: newSubmission[0].id,
        userId,
        questionId,
        platform,
        isLegitimate: verificationDetails.isLegitimate ?? true,
        confidence: verificationDetails.confidence || 0,
        feedback: verificationDetails.feedback || "No feedback provided",
        reasonsForDecision: verificationDetails.reasonsForDecision || [],
        suggestions: verificationDetails.suggestions || [],
        timestamp: new Date().toISOString(),
        codeLength: code?.length || 0,
      });
    }

    console.log("✅ Question marked as completed:", {
      userId,
      questionId,
      submissionId: newSubmission[0].id,
      score,
      platform,
    });

    return res.json({
      success: true,
      message: "Question marked as completed successfully",
      submissionId: newSubmission[0].id,
      score,
      verificationDetails: verificationDetails || null,
    });
  } catch (error) {
    console.error("❌ Error marking question as completed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark question as completed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
