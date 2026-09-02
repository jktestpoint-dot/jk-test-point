/**
 * These are the currently supported category labels for authoring. Runtime
 * catalogue reads deliberately use the value saved on each published record,
 * so an existing published record is never hidden merely because its category
 * is not in this convenience list.
 */
export const MAIN_CATEGORIES = ["JKSSB", "Banking", "Kashmir University", "High Court"] as const;
export type MainCategory = string;

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
  library_section: string | null;
  total_marks: number;
  negative_marking: string;
  featured: boolean;
};
