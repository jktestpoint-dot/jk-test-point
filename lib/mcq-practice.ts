export const MCQ_PRACTICE_SUBJECTS = [
  { id: "accountancy", name: "Accountancy", mcqCount: 500, price: 49 },
  { id: "mathematics", name: "Mathematics", mcqCount: 250, price: 25 },
  { id: "statistics", name: "Statistics", mcqCount: 250, price: 25 },
  { id: "economics", name: "Economics", mcqCount: 250, price: 25 },
  { id: "computer", name: "Computer", mcqCount: 400, price: 30 },
] as const;

export function getMcqPracticeSubject(id: string) {
  return MCQ_PRACTICE_SUBJECTS.find((subject) => subject.id === id);
}
