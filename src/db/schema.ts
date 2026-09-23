import { sqliteTable, integer, text, real, unique, primaryKey } from "drizzle-orm/sqlite-core";

const nowSec = () => Math.floor(Date.now() / 1000);

export const classes = sqliteTable("classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
});

export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id").notNull().references(() => classes.id),
  name: text("name").notNull(),
  dedupLabel: text("dedup_label").notNull().default(""),
  status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
  loginVersion: integer("login_version").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
}, (t) => ({ uniqNameLabel: unique().on(t.classId, t.name, t.dedupLabel) }));

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["single", "multi", "fill", "short"] }).notNull(),
  stem: text("stem").notNull(),
  optionsJson: text("options_json"),
  answerJson: text("answer_json"),
  analysis: text("analysis"),
  knowledgeTagsJson: text("knowledge_tags_json").notNull().default("[]"),
  chapter: text("chapter"),
  difficulty: integer("difficulty").notNull().default(1),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
});

export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  type: text("type", { enum: ["normal"] }).notNull().default("normal"),
  dueAt: integer("due_at"),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
});

export const assignmentClasses = sqliteTable("assignment_classes", {
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  classId: integer("class_id").notNull().references(() => classes.id),
}, (t) => ({ pk: primaryKey({ columns: [t.assignmentId, t.classId] }) }));

export const assignmentQuestions = sqliteTable("assignment_questions", {
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  orderNo: integer("order_no").notNull(),
  score: real("score").notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.assignmentId, t.questionId] }) }));

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  status: text("status", { enum: ["not_started", "submitted", "graded"] }).notNull().default("not_started"),
  startedAt: integer("started_at"),
  submittedAt: integer("submitted_at"),
  durationSec: integer("duration_sec"),
  objectiveScore: real("objective_score"),
  totalScore: real("total_score"),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
}, (t) => ({ uniqOne: unique().on(t.assignmentId, t.studentId) }));

export const answers = sqliteTable("answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull().references(() => submissions.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  contentJson: text("content_json").notNull(),
  isCorrect: integer("is_correct"),
  score: real("score"),
  durationSec: integer("duration_sec"),
});

export const loginLogs = sqliteTable("login_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull().references(() => students.id),
  ip: text("ip"),
  ua: text("ua"),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
});
