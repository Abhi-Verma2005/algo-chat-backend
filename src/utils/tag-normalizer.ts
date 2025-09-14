/**
 * Tag Normalization Utility
 * Converts various user input formats to standardized SCREAMING_SNAKE_CASE tags
 */

// Define the mapping of user input variations to standardized tags
const TAG_MAPPINGS: Record<string, string> = {
  // Basic Control Flow
  'if else': 'IF_ELSE',
  'if-else': 'IF_ELSE',
  'if/else': 'IF_ELSE',
  'conditional': 'IF_ELSE',
  'conditionals': 'IF_ELSE',
  
  // Loops
  'loop': 'LOOPS',
  'loops': 'LOOPS',
  'for loop': 'LOOPS',
  'while loop': 'LOOPS',
  'iteration': 'LOOPS',
  'iterative': 'LOOPS',
  
  // Nested Loops
  'nested loop': 'NESTED_LOOP',
  'nested loops': 'NESTED_LOOP',
  'nested iteration': 'NESTED_LOOP',
  'double loop': 'NESTED_LOOP',
  'triple loop': 'NESTED_LOOP',
  
  // Lists and Strings
  'list': 'LIST_AND_STRING',
  'lists': 'LIST_AND_STRING',
  'string': 'LIST_AND_STRING',
  'strings': 'LIST_AND_STRING',
  'array': 'LIST_AND_STRING',
  'arrays': 'LIST_AND_STRING',
  'list and string': 'LIST_AND_STRING',
  'list & string': 'LIST_AND_STRING',
  
  // Two Pointers
  'two pointer': 'TWO_POINTERS',
  'two pointers': 'TWO_POINTERS',
  '2 pointer': 'TWO_POINTERS',
  '2 pointers': 'TWO_POINTERS',
  'dual pointer': 'TWO_POINTERS',
  'dual pointers': 'TWO_POINTERS',
  'fast slow': 'TWO_POINTERS',
  'fast slow pointer': 'TWO_POINTERS',
  'slow fast': 'TWO_POINTERS',
  'slow fast pointer': 'TWO_POINTERS',
  
  // Prefix Sum
  'prefix sum': 'PREFIX_SUM',
  'prefixsum': 'PREFIX_SUM',
  'cumulative sum': 'PREFIX_SUM',
  'running sum': 'PREFIX_SUM',
  'partial sum': 'PREFIX_SUM',
  
  // Binary Search
  'binary search': 'BINARY_SEARCH',
  'binarysearch': 'BINARY_SEARCH',
  'binsearch': 'BINARY_SEARCH',
  'bisection': 'BINARY_SEARCH',
  'divide and conquer': 'BINARY_SEARCH',
  'divide & conquer': 'BINARY_SEARCH',
  
  // Sliding Window
  'sliding window': 'SLIDING_WINDOWS',
  'slidingwindow': 'SLIDING_WINDOWS',
  'window': 'SLIDING_WINDOWS',
  'windows': 'SLIDING_WINDOWS',
  'subarray': 'SLIDING_WINDOWS',
  'substring': 'SLIDING_WINDOWS',
  'contiguous': 'SLIDING_WINDOWS',
  
  // 1D Arrays
  '1d array': '1D_ARRAYS',
  '1d arrays': '1D_ARRAYS',
  'one dimensional array': '1D_ARRAYS',
  'one dimensional arrays': '1D_ARRAYS',
  'single dimension': '1D_ARRAYS',
  'linear array': '1D_ARRAYS',
  'linear arrays': '1D_ARRAYS',
  
  // 2D Arrays
  '2d array': '2D_ARRAYS',
  '2d arrays': '2D_ARRAYS',
  'two dimensional array': '2D_ARRAYS',
  'two dimensional arrays': '2D_ARRAYS',
  'matrix': '2D_ARRAYS',
  'matrices': '2D_ARRAYS',
  'grid': '2D_ARRAYS',
  'table': '2D_ARRAYS',
  
  // Recursion
  'recursion': 'RECURSION',
  'recursive': 'RECURSION',
  'recursively': 'RECURSION',
  'backtrack': 'RECURSION',
  'backtracking': 'RECURSION',
  'dfs': 'RECURSION',
  'depth first search': 'RECURSION',
  
  // Dynamic Programming
  'dynamic programming': 'DYNAMIC_PROGRAMMING',
  'dynamicprogramming': 'DYNAMIC_PROGRAMMING',
  'dp': 'DYNAMIC_PROGRAMMING',
  'memoization': 'DYNAMIC_PROGRAMMING',
  'memo': 'DYNAMIC_PROGRAMMING',
  'tabulation': 'DYNAMIC_PROGRAMMING',
  'bottom up': 'DYNAMIC_PROGRAMMING',
  'top down': 'DYNAMIC_PROGRAMMING',
  
  // Linked List
  'linked list': 'LINKED_LIST',
  'linkedlist': 'LINKED_LIST',
  'singly linked': 'LINKED_LIST',
  'doubly linked': 'LINKED_LIST',
  'll node': 'LINKED_LIST',
  'll nodes': 'LINKED_LIST',
  
  // Stack
  'stack': 'STACK',
  'stacks': 'STACK',
  'lifo': 'STACK',
  'last in first out': 'STACK',
  'push pop': 'STACK',
  
  // Set
  'set': 'SET',
  'sets': 'SET',
  'unique': 'SET',
  'distinct': 'SET',
  'hashset': 'SET',
  
  // Dictionary
  'dictionary': 'DICTIONARY',
  'dict': 'DICTIONARY',
  'key value': 'DICTIONARY',
  'key-value': 'DICTIONARY',
  'key value pair': 'DICTIONARY',
  'key-value pair': 'DICTIONARY',
  
  // Hash Tables
  'hash table': 'HASHTABLES',
  'hashtable': 'HASHTABLES',
  'hash': 'HASHTABLES',
  'hashing': 'HASHTABLES',
  'hashmap': 'HASHTABLES',
  'hash map': 'HASHTABLES',
  
  // Binary Tree
  'binary tree': 'BINARY_TREE',
  'binarytree': 'BINARY_TREE',
  'tree': 'BINARY_TREE',
  'trees': 'BINARY_TREE',
  'bt': 'BINARY_TREE',
  'tree node': 'BINARY_TREE',
  'tree nodes': 'BINARY_TREE',
  
  // Binary Search Tree
  'binary search tree': 'BINARY_SEARCH_TREE',
  'binarysearchtree': 'BINARY_SEARCH_TREE',
  'bst': 'BINARY_SEARCH_TREE',
  'sorted tree': 'BINARY_SEARCH_TREE',
  'ordered tree': 'BINARY_SEARCH_TREE',
  
  // Additional common variations
  'array problem': '1D_ARRAYS',
  'array problems': '1D_ARRAYS',
  'string problem': 'LIST_AND_STRING',
  'string problems': 'LIST_AND_STRING',
  'tree problem': 'BINARY_TREE',
  'tree problems': 'BINARY_TREE',
  'graph': 'BINARY_TREE', // Assuming graphs might be categorized under trees
  'graphs': 'BINARY_TREE',
  'sorting': '1D_ARRAYS', // Assuming sorting is typically array-based
  'searching': 'BINARY_SEARCH',
  'greedy': 'DYNAMIC_PROGRAMMING', // Greedy algorithms often overlap with DP
  'greedy algorithm': 'DYNAMIC_PROGRAMMING',
  'queue': 'STACK', // Assuming queue might be categorized under stack
  'queues': 'STACK',
  'heap': 'BINARY_TREE', // Heaps are typically tree-based
  'heaps': 'BINARY_TREE',
  'union find': '1D_ARRAYS', // Assuming UF is array-based
  'union-find': '1D_ARRAYS',
  'disjoint set': '1D_ARRAYS',
  'disjoint sets': '1D_ARRAYS'
};

/**
 * Normalizes a user input string to a standardized SCREAMING_SNAKE_CASE tag
 * @param input - The user input string
 * @returns The normalized tag or null if no match found
 */
export function normalizeTag(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  const normalizedInput = input.trim().toLowerCase();
  
  // Direct match
  if (TAG_MAPPINGS[normalizedInput]) {
    return TAG_MAPPINGS[normalizedInput];
  }
  
  // Check for partial matches and variations
  for (const [key, value] of Object.entries(TAG_MAPPINGS)) {
    if (normalizedInput.includes(key) || key.includes(normalizedInput)) {
      return value;
    }
  }
  
  // Check for word-based matches
  const words = normalizedInput.split(/\s+/);
  for (const word of words) {
    if (TAG_MAPPINGS[word]) {
      return TAG_MAPPINGS[word];
    }
  }
  
  // Try to convert to SCREAMING_SNAKE_CASE as fallback
  return convertToScreamingSnakeCase(input);
}

/**
 * Converts a string to SCREAMING_SNAKE_CASE format
 * @param input - The input string
 * @returns The converted string in SCREAMING_SNAKE_CASE
 */
export function convertToScreamingSnakeCase(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\s]+/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, '_') // Replace multiple spaces with single underscore
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Add underscore between camelCase
    .toUpperCase()
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

/**
 * Normalizes an array of user input strings to standardized tags
 * @param inputs - Array of user input strings
 * @returns Array of normalized tags (filtered to remove nulls)
 */
export function normalizeTags(inputs: string[]): string[] {
  if (!Array.isArray(inputs)) {
    return [];
  }
  
  return inputs
    .map(input => normalizeTag(input))
    .filter((tag): tag is string => tag !== null);
}

/**
 * Gets all available standardized tags
 * @returns Array of all available tags
 */
export function getAvailableTags(): string[] {
  return Object.values(TAG_MAPPINGS);
}

/**
 * Checks if a tag is valid (exists in our system)
 * @param tag - The tag to check
 * @returns True if the tag is valid
 */
export function isValidTag(tag: string): boolean {
  return getAvailableTags().includes(tag);
}

/**
 * Suggests similar tags based on user input
 * @param input - The user input string
 * @returns Array of suggested tags
 */
export function suggestTags(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }
  
  const normalizedInput = input.trim().toLowerCase();
  const suggestions: string[] = [];
  
  for (const [key, value] of Object.entries(TAG_MAPPINGS)) {
    if (key.includes(normalizedInput) || normalizedInput.includes(key)) {
      suggestions.push(value);
    }
  }
  
  // Remove duplicates and return
  return [...new Set(suggestions)];
}
