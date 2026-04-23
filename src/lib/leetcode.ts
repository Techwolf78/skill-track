export interface LeetCodeProblem {
  title: string;
  titleSlug: string;
  difficulty: number;
  questionId: string;
  isPaidOnly: boolean;
}

const ALGORITHMS_ENDPOINT_URL = "https://leetcode.com/api/problems/algorithms/";

export const fetchLeetCodeProblems = async (): Promise<LeetCodeProblem[]> => {
  try {
    const response = await fetch(ALGORITHMS_ENDPOINT_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`LeetCode API returned ${response.status}`);
    }

    const data = (await response.json()) as {
      stat_status_pairs: Array<{
        stat: {
          question__title: string;
          question__title_slug: string;
          frontend_question_id: number;
        };
        difficulty: { level: number };
        paid_only: boolean;
      }>;
    };

    return data.stat_status_pairs.map((item) => ({
      title: item.stat.question__title,
      titleSlug: item.stat.question__title_slug,
      difficulty: item.difficulty.level,
      questionId: item.stat.frontend_question_id.toString(),
      isPaidOnly: item.paid_only,
    }));
  } catch (error) {
    console.error("Error fetching LeetCode problems:", error);
    return [];
  }
};

export const getDifficultyLabel = (level: number): string => {
  switch (level) {
    case 1:
      return "Easy";
    case 2:
      return "Medium";
    case 3:
      return "Hard";
    default:
      return "Medium";
  }
};

export const mapLeetCodeToAppQuestion = (problem: LeetCodeProblem) => {
  return {
    title: problem.title,
    content: `Problem description for ${problem.title} (Visit https://leetcode.com/problems/${problem.titleSlug}/ for details)`,
    difficulty: getDifficultyLabel(problem.difficulty),
    categoryTitle: "Algorithms",
    enableRunCode: true,
    judgerAvailable: true,
    isPaidOnly: problem.isPaidOnly,
    type: "coding",
    leetcode_slug: problem.titleSlug,
    codeSnippets: [
      { lang: "Python3", langSlug: "python3", code: "class Solution:\n    def solve(self, input):\n        pass" },
      { lang: "Java", langSlug: "java", code: "class Solution {\n    public void solve() {\n    }\n}" },
      { lang: "C++", langSlug: "cpp", code: "class Solution {\npublic:\n    void solve() {\n    }\n};" }
    ],
    sampleTestCases: [
      { input: "", expected: "" }
    ],
  };
};
