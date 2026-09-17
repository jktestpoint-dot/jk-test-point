export const MCQ_PRACTICE_SUBJECTS = [
  { id: "accountancy", name: "Accountancy", mcqCount: 500, price: 30 },
  { id: "mathematics", name: "Mathematics", mcqCount: 250, price: 30 },
  { id: "statistics", name: "Statistics", mcqCount: 250, price: 30 },
  { id: "economics", name: "Economics", mcqCount: 250, price: 30 },
  { id: "computer", name: "Computer", mcqCount: 400, price: 30 },
  { id: "jk-gk", name: "J&K GK", mcqCount: 0, price: 30 },
  { id: "general-knowledge", name: "General Knowledge", mcqCount: 0, price: 30 },
  { id: "reasoning", name: "Reasoning", mcqCount: 0, price: 30 },
  { id: "english", name: "English", mcqCount: 0, price: 30 },
  { id: "general-science", name: "General Science", mcqCount: 0, price: 30 },
  { id: "indian-polity", name: "Indian Polity", mcqCount: 0, price: 30 },
  { id: "history", name: "History", mcqCount: 0, price: 30 },
  { id: "geography", name: "Geography", mcqCount: 0, price: 30 },
] as const;

export function getMcqPracticeSubject(id: string) {
  return MCQ_PRACTICE_SUBJECTS.find((subject) => subject.id === id);
}
