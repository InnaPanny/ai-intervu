export type Target = {
  id: string;
  industry: string;
  role: string;
  experience: string;
  resume?: string;
  jd?: string;
  createdAt: string;
};

export type QuestionStatus = "pending" | "completed" | "hidden";
export type EvaluationRating = "表现优秀" | "基本达标" | "需要加强" | "信息不足";
export type MasteryLevel = "未练习" | "不熟悉" | "初步掌握" | "基本掌握" | "熟练掌握" | "稳定掌握";
export type TrainingMode = "关键词回忆" | "独立作答" | "回答结构填空";

export type DimensionEvaluation = {
  dimension: string;
  rating: EvaluationRating;
  feedback: string;
};

export type Question = {
  id: string;
  targetId: string;
  text: string;
  intent: string;
  category: string;
  reason: string;
  focus: string;
  core: boolean;
  status: QuestionStatus;
  hiddenFromStatus?: Exclude<QuestionStatus, "hidden">;
  draftAnswer?: string;
  answer?: string;
  finalAnswer?: string;
  outline?: string[];
  keywords?: string[];
  rating?: EvaluationRating;
  dimensions?: DimensionEvaluation[];
  informationGaps?: string[];
  improvement?: string;
  hintUsed?: boolean;
  lastPracticeUsedHint?: boolean;
  inFocusPractice?: boolean;
  focusCompleted?: boolean;
  mastery?: MasteryLevel;
  trainingMode?: TrainingMode;
  nextReviewDate?: string;
  intervalExcellentStreak?: number;
  lastIntervalReviewDate?: string;
  reviewCount?: number;
  helpful?: boolean;
  source: "generated" | "review";
  reviewOnly?: boolean;
  createdAt: string;
};

export type InterviewReview = {
  id: string;
  targetId: string;
  role: string;
  date: string;
  company?: string;
  industry?: string;
  status: "draft" | "completed";
  questions: ReviewQuestion[];
  createdAt: string;
};

export type ReviewQuestion = {
  id: string;
  text: string;
  actualAnswer?: string;
  referenceAnswer?: string;
  finalAnswer?: string;
  classification: "record" | "pending" | "focus" | "hidden";
};

export type AppData = {
  phone?: string;
  targets: Target[];
  activeTargetId?: string;
  questions: Question[];
  reviews: InterviewReview[];
};
