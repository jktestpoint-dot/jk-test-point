export const MAIN_CATEGORIES = ["JKSSB", "Banking", "Kashmir University", "High Court"] as const;
export type MainCategory = (typeof MAIN_CATEGORIES)[number];

export type PublicTestQuestion = {
  id: string;
  question_number: number;
  text: string;
  options: string[];
};

export type CatalogQuestion = PublicTestQuestion & { answer: number; explanation?: string };

export type CatalogTest = {
  id: string;
  title: string;
  main_category: MainCategory;
  subcategory: string;
  description: string;
  question_count: number;
  duration_minutes: number;
  price: number;
  total_marks: number;
  negative_marking: string;
  featured: boolean;
};
