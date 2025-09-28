import express, { Router } from "express";
import { authenticateToken } from "@/middleware/auth";
import {
  verifyCodeSolution,
  markQuestionCompleted,
} from "@/controllers/verification-controller";

const router: Router = express.Router();

// All verification routes require authentication
router.use(authenticateToken);

/**
 * POST /api/verification/verify-solution
 * Verify if a code solution is legitimate (not hardcoded)
 *
 * Body:
 * {
 *   questionId: string,
 *   questionTitle: string,
 *   questionText: string,
 *   code: string,
 *   platform: 'codechef' | 'leetcode' | 'codeforces'
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   isLegitimate: boolean,
 *   confidence: number,
 *   feedback: string,
 *   reasonsForDecision: string[],
 *   suggestions?: string[]
 * }
 */
router.post("/verify-solution", verifyCodeSolution);

/**
 * POST /api/verification/mark-question-done
 * Mark a question as completed by the current user
 *
 * Body:
 * {
 *   questionId: string,
 *   platform: 'codechef' | 'leetcode' | 'codeforces',
 *   code: string,
 *   verificationDetails?: object
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   submissionId: string,
 *   score: number,
 *   verificationDetails?: object
 * }
 */
router.post("/mark-question-done", markQuestionCompleted);

/**
 * GET /api/verification/health
 * Health check for verification system
 */
router.get("/verification/health", (req, res) => {
  res.json({
    success: true,
    message: "Code verification system is operational",
    timestamp: new Date().toISOString(),
    user: (req as any).user?.username || "authenticated",
  });
});

export default router;
