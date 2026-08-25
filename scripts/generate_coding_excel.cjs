const XLSX = require('xlsx');
const path = require('path');

const codingQuestions = [
  {
    Title: "LRU Cache Implementation with O(1) Operations",
    Type: "Coding",
    Prompt: "Design a data structure that follows the constraints of a Least Recently Used (LRU) Cache.\n\nImplement the LRUCache class:\n- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.\n- int get(int key) Return the value of the key if the key exists, otherwise return -1.\n- void put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.\n\nThe functions get and put must each run in O(1) average time complexity.\n\nInput Format:\nThe first line contains the integer capacity and number of operations Q.\nThe next Q lines contain operation names followed by parameters ('get key' or 'put key value').\n\nOutput Format:\nFor each 'get' operation, print the integer value or -1 separated by spaces.",
    Subject: "Computer Science",
    Topic: "Data Structures",
    Subtopic: "Hash Table & Linked List",
    Difficulty: "Hard",
    Marks: 10,
    "Time Limit (s)": 3,
    "Memory Limit (MB)": 512,
    Constraints: "1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5\nAt most 2 * 10^5 calls will be made to get and put.",
    "Sample Explanation": "LRUCache cache = new LRUCache(2);\ncache.put(1, 1); // cache is {1=1}\ncache.put(2, 2); // cache is {1=1, 2=2}\ncache.get(1);    // return 1\ncache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}\ncache.get(2);    // returns -1 (not found)\ncache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}\ncache.get(1);    // returns -1 (not found)\ncache.get(3);    // returns 3\ncache.get(4);    // returns 4",
    Tags: "data-structures, lru-cache, doubly-linked-list, hashmap, design, algorithms",
    "Avg Time (s)": 1200
  },
  {
    Title: "Trapping Rain Water in Elevation Map",
    Type: "Coding",
    Prompt: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nYour algorithm should compute the total volume of trapped water across all bars in O(n) time and O(1) auxiliary space.\n\nInput Format:\nA single line containing N space-separated integers representing the height of elevation bars.\n\nOutput Format:\nPrint a single integer representing the total units of water trapped.",
    Subject: "Computer Science",
    Topic: "Algorithms",
    Subtopic: "Two Pointers",
    Difficulty: "Hard",
    Marks: 8,
    "Time Limit (s)": 2,
    "Memory Limit (MB)": 256,
    Constraints: "n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5",
    "Sample Explanation": "Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\nExplanation: The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water (blue section) are being trapped between valleys.",
    Tags: "two-pointers, dynamic-programming, stack, arrays",
    "Avg Time (s)": 900
  },
  {
    Title: "Longest Substring Without Repeating Characters",
    Type: "Coding",
    Prompt: "Given a string s, find the length of the longest substring without repeating characters.\n\nA substring is a contiguous non-empty sequence of characters within a string. Your solution should use an optimal sliding window approach with hash set/map lookup.\n\nInput Format:\nA single string s containing English letters, digits, symbols and spaces.\n\nOutput Format:\nPrint a single integer representing the maximum length of unique-character substring.",
    Subject: "Computer Science",
    Topic: "Algorithms",
    Subtopic: "Sliding Window",
    Difficulty: "Medium",
    Marks: 6,
    "Time Limit (s)": 2,
    "Memory Limit (MB)": 256,
    Constraints: "0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.",
    "Sample Explanation": "Input: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with the length of 3.\n\nInput: s = \"bbbbb\"\nOutput: 1\nExplanation: The answer is \"b\", with the length of 1.\n\nInput: s = \"pwwkew\"\nOutput: 3\nExplanation: The answer is \"wke\", with the length of 3. Notice that the answer must be a substring, \"pwke\" is a subsequence and not a substring.",
    Tags: "sliding-window, hashmap, strings, two-pointers",
    "Avg Time (s)": 600
  },
  {
    Title: "Median of Two Sorted Arrays",
    Type: "Coding",
    Prompt: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity must be O(log (m+n)).\n\nInput Format:\nFirst line contains integer m and sorted integers for nums1.\nSecond line contains integer n and sorted integers for nums2.\n\nOutput Format:\nPrint the median as a float formatted to 5 decimal places.",
    Subject: "Computer Science",
    Topic: "Algorithms",
    Subtopic: "Binary Search",
    Difficulty: "Hard",
    Marks: 10,
    "Time Limit (s)": 2,
    "Memory Limit (MB)": 256,
    Constraints: "nums1.length == m\nnums2.length == n\n0 <= m <= 1000\n0 <= n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6",
    "Sample Explanation": "Input: nums1 = [1,3], nums2 = [2]\nOutput: 2.00000\nExplanation: merged array = [1,2,3] and median is 2.\n\nInput: nums1 = [1,2], nums2 = [3,4]\nOutput: 2.50000\nExplanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.",
    Tags: "binary-search, arrays, divide-and-conquer",
    "Avg Time (s)": 1200
  },
  {
    Title: "Word Ladder II - Shortest Transformation Sequences",
    Type: "Coding",
    Prompt: "A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that:\n- Every adjacent pair of words differs by exactly one letter.\n- Every si for 1 <= i <= k is in wordList. (beginWord does not need to be in wordList).\n- sk == endWord\n\nGiven two words, beginWord and endWord, and a dictionary wordList, return all the shortest transformation sequences from beginWord to endWord, or an empty list if no such sequence exists. Each sequence should be returned as a list of the words [beginWord, s1, s2, ..., endWord].\n\nInput Format:\nFirst line: beginWord\nSecond line: endWord\nThird line: space-separated list of dictionary words\n\nOutput Format:\nPrint each valid shortest transformation sequence on a separate line.",
    Subject: "Computer Science",
    Topic: "Data Structures",
    Subtopic: "Graph BFS / DFS",
    Difficulty: "Hard",
    Marks: 10,
    "Time Limit (s)": 4,
    "Memory Limit (MB)": 512,
    Constraints: "1 <= beginWord.length <= 5\nendWord.length == beginWord.length\n1 <= wordList.length <= 500\nwordList[i].length == beginWord.length\nbeginWord, endWord, and wordList[i] consist of lowercase English letters.\nbeginWord != endWord\nAll the words in wordList are unique.",
    "Sample Explanation": "Input: beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]\nOutput: [[\"hit\",\"hot\",\"dot\",\"dog\",\"cog\"],[\"hit\",\"hot\",\"lot\",\"log\",\"cog\"]]\nExplanation: There are 2 shortest knowledge transformation sequences:\n\"hit\" -> \"hot\" -> \"dot\" -> \"dog\" -> \"cog\"\n\"hit\" -> \"hot\" -> \"lot\" -> \"log\" -> \"cog\"",
    Tags: "bfs, dfs, graph, hashmap, strings, backtracking",
    "Avg Time (s)": 1500
  },
  {
    Title: "Course Schedule - Topological Dependency Cycle Detection",
    Type: "Coding",
    Prompt: "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.\n\nFor example, the pair [0, 1], indicates that to take course 0 you have to first take course 1.\n\nReturn true if you can finish all courses. Otherwise, return false (indicating a circular prerequisite dependency).\n\nInput Format:\nFirst line contains integer numCourses.\nSecond line contains integer M representing number of prerequisite pairs.\nFollowing M lines each contain two integers ai and bi.\n\nOutput Format:\nPrint 'true' if all courses can be completed, otherwise print 'false'.",
    Subject: "Computer Science",
    Topic: "Data Structures",
    Subtopic: "Topological Sort",
    Difficulty: "Medium",
    Marks: 6,
    "Time Limit (s)": 2,
    "Memory Limit (MB)": 256,
    Constraints: "1 <= numCourses <= 2000\n0 <= prerequisites.length <= 5000\nprerequisites[i].length == 2\n0 <= ai, bi < numCourses\nAll the pairs prerequisites[i] are unique.",
    "Sample Explanation": "Input: numCourses = 2, prerequisites = [[1,0]]\nOutput: true\nExplanation: There are a total of 2 courses to take. To take course 1 you should have finished course 0. So it is possible.\n\nInput: numCourses = 2, prerequisites = [[1,0],[0,1]]\nOutput: false\nExplanation: There are a total of 2 courses to take. To take course 1 you should have finished course 0, and to take course 0 you should also have finished course 1. So it is impossible.",
    Tags: "graph, topological-sort, bfs, dfs, cycle-detection",
    "Avg Time (s)": 750
  },
  {
    Title: "Coin Change - Minimum Coins Dynamic Programming",
    Type: "Coding",
    Prompt: "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nYou may assume that you have an infinite number of each kind of coin.\n\nInput Format:\nFirst line: integer N (number of coin types) followed by N space-separated coin values.\nSecond line: integer amount.\n\nOutput Format:\nPrint a single integer representing the minimum number of coins needed, or -1.",
    Subject: "Computer Science",
    Topic: "Algorithms",
    Subtopic: "Dynamic Programming",
    Difficulty: "Medium",
    Marks: 6,
    "Time Limit (s)": 2,
    "Memory Limit (MB)": 256,
    Constraints: "1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4",
    "Sample Explanation": "Input: coins = [1,2,5], amount = 11\nOutput: 3\nExplanation: 11 = 5 + 5 + 1 (3 coins total).\n\nInput: coins = [2], amount = 3\nOutput: -1",
    Tags: "dynamic-programming, memoization, breadth-first-search",
    "Avg Time (s)": 600
  },
  {
    Title: "Serialize and Deserialize Binary Tree",
    Type: "Coding",
    Prompt: "Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.\n\nDesign an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.\n\nClarification: The input/output format is the same as how LeetCode serializes a binary tree. You do not necessarily need to follow this format, so please be creative and come up with different approaches yourself.\n\nInput Format:\nA string representing the level-order traversal of the binary tree with null pointers.\n\nOutput Format:\nThe reconstituted tree printed in matching level-order format.",
    Subject: "Computer Science",
    Topic: "Data Structures",
    Subtopic: "Binary Trees",
    Difficulty: "Hard",
    Marks: 10,
    "Time Limit (s)": 3,
    "Memory Limit (MB)": 512,
    Constraints: "The number of nodes in the tree is in the range [0, 10^4].\n-1000 <= Node.val <= 1000",
    "Sample Explanation": "Input: root = [1,2,3,null,null,4,5]\nOutput: [1,2,3,null,null,4,5]\nExplanation: Tree node 1 has left child 2 and right child 3. Node 3 has left child 4 and right child 5.",
    Tags: "tree, binary-tree, design, string, bfs, dfs",
    "Avg Time (s)": 1000
  }
];

const targetPath = path.resolve(__dirname, '../public/coding_questions_sample.xlsx');

const ws = XLSX.utils.json_to_sheet(codingQuestions);
ws['!cols'] = [
  { wch: 40 }, // Title
  { wch: 8 },  // Type
  { wch: 85 }, // Prompt (Large description)
  { wch: 20 }, // Subject
  { wch: 18 }, // Topic
  { wch: 25 }, // Subtopic
  { wch: 12 }, // Difficulty
  { wch: 8 },  // Marks
  { wch: 14 }, // Time Limit (s)
  { wch: 18 }, // Memory Limit (MB)
  { wch: 35 }, // Constraints
  { wch: 60 }, // Sample Explanation
  { wch: 35 }, // Tags
  { wch: 12 }  // Avg Time (s)
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Coding Questions");

XLSX.writeFile(wb, targetPath);
console.log('Successfully generated Coding Questions Excel file at:', targetPath);
