import * as XLSX from "xlsx";

/** The reusable CSV/XLSX format shown to administrators. */
export const questionHeaders = ["question", "option_a", "option_b", "option_c", "option_d", "correct_answer", "subject", "mock_test", "explanation"] as const;
const legacyQuestionHeaders = ["question_number", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation"] as const;

export type ImportQuestion = {
  question_number: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  subject?: string;
  mock_test?: string;
};

export type QuestionImportPreview = {
  rows: ImportQuestion[];
  errors: string[];
  validRowCount: number;
  failedRowCount: number;
};

export function failedRowCount(errors: string[]) {
  const rows = new Set(errors.map((error) => error.match(/^Row (\d+):/)?.[1]).filter(Boolean));
  return rows.size;
}

function cleanHeader(header: string) {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function cell(row: Record<string, unknown>, header: string) {
  return String(row[header] ?? "").trim();
}

export async function parseQuestionFile(file: File): Promise<QuestionImportPreview> {
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
    return { rows: [], errors: ["Upload a CSV or XLSX file."], validRowCount: 0, failedRowCount: 0 };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  } catch {
    return { rows: [], errors: ["The file could not be read. Upload a valid CSV or XLSX workbook."], validRowCount: 0, failedRowCount: 0 };
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { rows: [], errors: ["The uploaded file has no worksheet."], validRowCount: 0, failedRowCount: 0 };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (!raw.length) return { rows: [], errors: ["The uploaded file contains no question rows."], validRowCount: 0, failedRowCount: 0 };

  const firstRow = Object.fromEntries(Object.entries(raw[0]).map(([key, value]) => [cleanHeader(key), value]));
  const headers = Object.keys(firstRow);
  const modernFormat = questionHeaders.every((header) => headers.includes(header));
  const legacyFormat = legacyQuestionHeaders.every((header) => headers.includes(header));
  if (!modernFormat && !legacyFormat) {
    return { rows: [], errors: [`Missing required columns. Use: ${questionHeaders.join(", ")}.`], validRowCount: 0, failedRowCount: raw.length };
  }

  const errors: string[] = [];
  const failedRows = new Set<number>();
  const addError = (rowNumber: number, message: string) => {
    failedRows.add(rowNumber);
    errors.push(`Row ${rowNumber + 2}: ${message}`);
  };

  const rows = raw.map((rawRow, index) => {
    const row = Object.fromEntries(Object.entries(rawRow).map(([key, value]) => [cleanHeader(key), value]));
    const value: ImportQuestion = modernFormat
      ? {
          question_number: String(index + 1), question_text: cell(row, "question"),
          option_a: cell(row, "option_a"), option_b: cell(row, "option_b"), option_c: cell(row, "option_c"), option_d: cell(row, "option_d"),
          correct_option: cell(row, "correct_answer").toUpperCase(),
          subject: cell(row, "subject"), mock_test: cell(row, "mock_test"), explanation: cell(row, "explanation"),
        }
      : {
          question_number: cell(row, "question_number"), question_text: cell(row, "question_text"),
          option_a: cell(row, "option_a"), option_b: cell(row, "option_b"), option_c: cell(row, "option_c"), option_d: cell(row, "option_d"),
          correct_option: cell(row, "correct_option").toUpperCase(), explanation: cell(row, "explanation"),
        };

    if (!/^[1-9]\d*$/.test(value.question_number)) addError(index, "question number must be a positive integer.");
    if (!value.question_text) addError(index, "question is empty.");
    for (const option of ["option_a", "option_b", "option_c", "option_d"] as const) if (!value[option]) addError(index, `${option} is empty.`);
    if (!/^[ABCD]$/.test(value.correct_option)) addError(index, "correct_answer must be A, B, C, or D.");
    if (modernFormat && !value.subject) addError(index, "subject is empty.");
    if (modernFormat && !value.mock_test) addError(index, "mock_test is empty.");
    return value;
  });

  const numberRows = new Map<string, number>();
  const questionRows = new Map<string, number>();
  rows.forEach((row, index) => {
    const previousNumber = numberRows.get(row.question_number);
    if (previousNumber !== undefined) {
      addError(index, `duplicate question number ${row.question_number}.`);
      addError(previousNumber, `duplicate question number ${row.question_number}.`);
    }
    numberRows.set(row.question_number, index);
    const fingerprint = row.question_text.trim().toLocaleLowerCase();
    const previousQuestion = questionRows.get(fingerprint);
    if (fingerprint && previousQuestion !== undefined) {
      addError(index, "duplicate question text in this file.");
      addError(previousQuestion, "duplicate question text in this file.");
    }
    if (fingerprint) questionRows.set(fingerprint, index);
  });

  return { rows, errors, validRowCount: rows.length - failedRows.size, failedRowCount: failedRows.size };
}
