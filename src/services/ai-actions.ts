import { z } from 'zod';
import { normalizeTags } from '../utils/tag-normalizer';

// Mock data for now - in a real implementation, these would connect to your database
export const getUserProgress = async (userId: string, options: { timeRange: string }) => {
  // Mock implementation - replace with actual database queries
  return {
    user: {
      username: "Test User",
      leetcodeUsername: "test_user",
      enrollmentNum: "1234567890",
      section: "A",
      individualPoints: 80,
      leetcodeQuestionsSolved: 25,
      codeforcesQuestionsSolved: 0,
      rank: "novice_1",
      userBrief: "Just started focusing on DSA to build problem-solving skills for placements."
    },
    overview: {
      totalSolved: 18,
      difficultyBreakdown: [
        { difficulty: "BEGINNER", solved: 8, attempted: 8, successRate: 100 },
        { difficulty: "EASY", solved: 7, attempted: 7, successRate: 100 },
        { difficulty: "MEDIUM", solved: 3, attempted: 3, successRate: 100 }
      ],
      currentStreak: 5,
      timeRange: options.timeRange
    },
    tagProgress: [
      { tagName: "Array", totalProblems: 15, solvedProblems: 12, easyCount: 8, mediumCount: 3, hardCount: 1 },
      { tagName: "String", totalProblems: 12, solvedProblems: 8, easyCount: 6, mediumCount: 2, hardCount: 0 },
      { tagName: "Linked List", totalProblems: 8, solvedProblems: 5, easyCount: 3, mediumCount: 2, hardCount: 0 }
    ],
    recentActivity: {
      last30Days: [
        { problem: 'Two Sum', difficulty: 'easy', solvedAt: new Date().toISOString() },
        { problem: 'Valid Parentheses', difficulty: 'easy', solvedAt: new Date().toISOString() }
      ],
      thisWeek: [
        { problem: 'Two Sum', difficulty: 'easy', solvedAt: new Date().toISOString() }
      ],
      today: []
    }
  };
};

export const getRecentActivity = async (userId: string) => {
  // Mock implementation
  return [
    { 
      type: 'problem_solved', 
      problem: 'Two Sum', 
      title: 'Two Sum',
      difficulty: 'EASY',
      timestamp: new Date().toISOString(),
      description: 'Solved Two Sum problem using hash map approach'
    },
    { 
      type: 'problem_attempted', 
      problem: 'Valid Parentheses', 
      title: 'Valid Parentheses',
      difficulty: 'EASY',
      timestamp: new Date().toISOString(),
      description: 'Attempted Valid Parentheses using stack'
    }
  ];
};

export const getFilteredQuestions = async ({ topics, userId, limit, unsolvedOnly }: {
  topics: string[];
  userId: string;
  limit: number;
  unsolvedOnly?: boolean;
}) => {
  // Mock implementation - replace with actual database queries
  const mockQuestions = [
    {
      id: '1',
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'EASY',
      points: 4,
      leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
      inArena: true,
      arenaAddedAt: new Date('2024-01-01'),
      isSolved: false,
      isBookmarked: false,
      questionTags: [{ name: 'Array' }, { name: 'Hash Table' }]
    },
    {
      id: '2',
      title: 'Valid Parentheses',
      slug: 'valid-parentheses',
      difficulty: 'EASY',
      points: 4,
      leetcodeUrl: 'https://leetcode.com/problems/valid-parentheses/',
      inArena: true,
      arenaAddedAt: new Date('2024-01-02'),
      isSolved: false,
      isBookmarked: false,
      questionTags: [{ name: 'Stack' }, { name: 'String' }]
    },
    {
      id: '3',
      title: 'Binary Tree Inorder Traversal',
      slug: 'binary-tree-inorder-traversal',
      difficulty: 'MEDIUM',
      points: 6,
      leetcodeUrl: 'https://leetcode.com/problems/binary-tree-inorder-traversal/',
      inArena: true,
      arenaAddedAt: new Date('2024-01-03'),
      isSolved: false,
      isBookmarked: false,
      questionTags: [{ name: 'Tree' }, { name: 'Depth-First Search' }]
    },
    {
      id: '4',
      title: 'Binary Search',
      slug: 'binary-search',
      difficulty: 'EASY',
      points: 4,
      leetcodeUrl: 'https://leetcode.com/problems/binary-search/',
      inArena: true,
      arenaAddedAt: new Date('2024-01-04'),
      isSolved: false,
      isBookmarked: false,
      questionTags: [{ name: 'Binary Search' }, { name: 'Array' }]
    },
    {
      id: '5',
      title: 'Two Sum II - Input Array Is Sorted',
      slug: 'two-sum-ii-input-array-is-sorted',
      difficulty: 'MEDIUM',
      points: 6,
      leetcodeUrl: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/',
      inArena: true,
      arenaAddedAt: new Date('2024-01-05'),
      isSolved: false,
      isBookmarked: false,
      questionTags: [{ name: 'Two Pointers' }, { name: 'Array' }]
    },
    {
      id: '6',
      title: 'Longest Substring Without Repeating Characters',
      slug: 'longest-substring-without-repeating-characters',
      difficulty: 'MEDIUM',
      points: 6,
      leetcodeUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      inArena: true,
      arenaAddedAt: new Date('2024-01-06'),
      isSolved: false,
      isBookmarked: false,
      questionTags: [{ name: 'Sliding Window' }, { name: 'Hash Table' }, { name: 'String' }]
    }
  ];

  // Normalize topics using the intelligent tag normalizer
  const normalizedTopics = new Set(normalizeTags(topics || []));
  
  console.log("🔍 Original topics:", topics);
  console.log("🔍 Normalized topics:", Array.from(normalizedTopics));

  // Filter by topics (case/format insensitive)
  const filtered = mockQuestions.filter(q =>
    q.questionTags.some(tag => normalizedTopics.has(tag.name.toUpperCase().replace(/\s+/g, '_')))
  );
  
  // Filter by solved status if requested
  const finalQuestions = unsolvedOnly ? filtered.filter(q => !q.isSolved) : filtered;
  
  return {
    questionsWithSolvedStatus: finalQuestions.slice(0, limit),
    individualPoints: 80
  };
};

export const getTags = async () => {
  // Mock implementation
  return [
    'Array', 'String', 'Linked List', 'Tree', 'Graph', 'Dynamic Programming',
    'Greedy', 'Backtracking', 'Binary Search', 'Two Pointers', 'Sliding Window',
    'Stack', 'Queue', 'Hash Table', 'Heap', 'Union Find'
  ];
};

export const getUserContextForPrompt = async (userId: string) => {
  // Mock implementation - in real app, this would fetch user's learning context
  return {
    currentLevel: 'beginner',
    preferredTopics: ['Array', 'String'],
    learningGoals: 'Master basic data structures',
    timeAvailable: '1-2 hours per day',
    weakAreas: ['Dynamic Programming', 'Graph Algorithms'],
    preferences: 'Visual learning with examples',
    progress: 'Consistent daily practice'
  };
};

export const getCodeSubmissionsByUser = async ({ externalUserId }: { externalUserId: string }) => {
  // Mock implementation - replace with actual database queries
  return [
    {
      id: '1',
      externalUserId,
      questionSlug: 'two-sum',
      code: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}',
      language: 'javascript',
      problemTitle: 'Two Sum',
      submissionStatus: 'ACCEPTED',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      externalUserId,
      questionSlug: 'valid-parentheses',
      code: 'function isValid(s) {\n  const stack = [];\n  const pairs = {\n    ")": "(", "}": "{", "]": "["\n  };\n  \n  for (let char of s) {\n    if (pairs[char]) {\n      if (stack.pop() !== pairs[char]) return false;\n    } else {\n      stack.push(char);\n    }\n  }\n  \n  return stack.length === 0;\n}',
      language: 'javascript',
      problemTitle: 'Valid Parentheses',
      submissionStatus: 'ACCEPTED',
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16')
    }
  ];
};