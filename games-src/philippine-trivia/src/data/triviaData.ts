import { QuizCategory, QuestionType, UnifiedQuestion } from "../types/trivia";

/**
 * Quiz loader.
 *
 * Every `data/*.json` file is eagerly imported via Vite's import.meta.glob, so
 * dropping a new quiz file into `data/` registers a new category automatically —
 * no code change required.
 *
 * The raw files come in three shapes, all handled by `normalizeQuestion`:
 *   1. classic flat:   { questions: [{ id, question, options, hint?,
 *                          answer_key: { correct_answer, explanation } }] }
 *   2. rounds:         { rounds: [{ round_name, questions: [{ q_id, question?,
 *                          statement?, options?, answer, explanation }] }] }
 *   3. typed flat:     { questions: [{ q_id, questionText, type, options,
 *                          correctAnswer, explanation }] }
 */

interface RawQuestion {
  id?: number;
  q_id?: number;
  question?: string;
  questionText?: string;
  statement?: string;
  type?: string;
  options?: string[];
  hint?: string;
  answer?: string;
  correctAnswer?: string;
  answer_key?: { correct_answer: string; explanation: string };
  explanation?: string;
}

interface RawRound {
  round_name: string;
  questions: RawQuestion[];
}

interface RawQuizFile {
  quiz_title?: string;
  description?: string;
  questions?: RawQuestion[];
  rounds?: RawRound[];
}

const rawFiles = import.meta.glob("/data/*.json", { eager: true }) as Record<
  string,
  { default: RawQuizFile }
>;

function fileIdFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.json$/i, "");
}

function detectType(q: RawQuestion): QuestionType {
  const explicit = (q.type || "").toLowerCase().replace(/[\s_]+/g, "-");
  if (explicit.startsWith("true")) return "true-false";
  if (explicit.startsWith("open") || explicit.startsWith("fill")) return "open-text";
  if (explicit.startsWith("multiple")) return "multiple-choice";
  if (q.statement !== undefined) return "true-false";
  if (!q.options || q.options.length === 0) return "open-text";
  return "multiple-choice";
}

function normalizeQuestion(
  q: RawQuestion,
  quizId: string,
  globalIndex: number,
  categoryTitle: string,
  roundName?: string,
): UnifiedQuestion {
  const type = detectType(q);

  const correctAnswer = String(
    q.answer_key?.correct_answer ?? q.correctAnswer ?? q.answer ?? "",
  ).trim();
  const explanation = String(q.answer_key?.explanation ?? q.explanation ?? "").trim();

  // For true/false rounds the prompt lives in `statement` (no `question`).
  let questionText = (q.questionText ?? q.question ?? "").trim();
  if (q.statement) {
    questionText = questionText
      ? `${questionText}\n\n"${q.statement}"`
      : q.statement;
  }

  let options = q.options ? [...q.options] : [];
  if (type === "true-false" && options.length === 0) options = ["True", "False"];

  return {
    id: `${quizId}-${globalIndex}`,
    questionText,
    type,
    options,
    hint: q.hint?.trim() || undefined,
    correctAnswer,
    explanation,
    categoryTitle,
    roundName,
  };
}

function flattenQuestions(raw: RawQuizFile, quizId: string, title: string): UnifiedQuestion[] {
  const out: UnifiedQuestion[] = [];
  let i = 0;
  if (raw.rounds?.length) {
    for (const round of raw.rounds) {
      for (const q of round.questions || []) {
        out.push(normalizeQuestion(q, quizId, i++, title, round.round_name));
      }
    }
  } else {
    for (const q of raw.questions || []) {
      out.push(normalizeQuestion(q, quizId, i++, title));
    }
  }
  // Drop anything malformed (no prompt or no answer) so a bad row can't crash a quiz.
  return out.filter((q) => q.questionText && q.correctAnswer);
}

function prettify(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function pickIcon(text: string): string {
  const t = text.toLowerCase();
  if (/rizal|hero/.test(t)) return "BookOpen";
  if (/capital|government|republic/.test(t)) return "Landmark";
  if (/geograph|island|province|cities|landmark|\bmap\b/.test(t)) return "MapPin";
  if (/culture|perambulation/.test(t)) return "Compass";
  if (/history|facts/.test(t)) return "Scroll";
  return "Compass";
}

function deriveDifficulty(questions: UnifiedQuestion[]): QuizCategory["difficulty"] {
  const n = questions.length;
  const openCount = questions.filter((q) => q.type === "open-text").length;
  if (n > 20 || openCount > n * 0.4) return "Hard";
  if (n >= 13) return "Medium";
  return "Easy";
}

function buildCategory(path: string, raw: RawQuizFile): QuizCategory {
  const id = fileIdFromPath(path);
  const title = (raw.quiz_title || prettify(id)).trim();
  const questions = flattenQuestions(raw, id, title);
  const questionCount = questions.length;

  const cleanTitle = title
    .replace(/\b(trivia|quiz|facts)\b/gi, "")
    .replace(/[:\-–]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const description =
    raw.description?.trim() ||
    `A ${questionCount}-question challenge testing how well you know ${cleanTitle}.`;

  return {
    id,
    title,
    description,
    iconName: pickIcon(`${id} ${title}`),
    difficulty: deriveDifficulty(questions),
    questionCount,
    estimatedTime: `${Math.max(2, Math.ceil(questionCount * 0.3))} mins`,
    questions,
  };
}

const DIFFICULTY_ORDER: Record<QuizCategory["difficulty"], number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

export const categories: QuizCategory[] = Object.entries(rawFiles)
  .map(([path, mod]) => buildCategory(path, mod.default))
  .filter((c) => c.questionCount > 0)
  .sort(
    (a, b) =>
      DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
      a.title.localeCompare(b.title),
  );

// Questions are normalized at load time, so this is now a simple accessor kept
// for the call sites that still ask the category for its questions.
export function parseAndUnifyQuiz(category: QuizCategory): UnifiedQuestion[] {
  return category.questions;
}
