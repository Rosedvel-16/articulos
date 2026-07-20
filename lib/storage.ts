/**
 * Mini base de datos sobre data/db.json.
 *
 * REEMPLAZO TEMPORAL DE GOOGLE SHEETS:
 * En el flujo n8n original, cada etapa hacía append/update en hojas de Google Sheets
 * (Keyword Seeds, Related Keywords, Trend Analysis, Article Briefs, Articles).
 * Aquí persistimos el mismo modelo de datos en un JSON local para pruebas.
 *
 * IMPORTANTE PARA PRODUCCIÓN (Vercel):
 * El filesystem de Vercel NO persiste entre invocaciones serverless.
 * Antes de desplegar en producción real, migrar este módulo a Vercel Postgres
 * o Vercel KV. Este archivo es solo para desarrollo local / prototipo.
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  Article,
  ArticleBrief,
  ArticleDecision,
  DatabaseSchema,
  KeywordSeed,
  RelatedKeyword,
  TrendAnalysis,
} from "@/types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

type TableName = keyof DatabaseSchema;

/** Lock en memoria para serializar lecturas/escrituras y evitar condiciones de carrera. */
let writeQueue: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function ensureDbFile(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    const empty: DatabaseSchema = {
      keywordSeeds: [],
      relatedKeywords: [],
      trendAnalyses: [],
      articleDecisions: [],
      articleBriefs: [],
      articles: [],
    };
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(empty, null, 2), "utf-8");
  }
}

async function readDb(): Promise<DatabaseSchema> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as DatabaseSchema;
}

async function writeDb(db: DatabaseSchema): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function getIdField(table: TableName): "id" | "idArticulo" {
  return table === "articleBriefs" || table === "articles" ? "idArticulo" : "id";
}

async function getAll<T extends TableName>(
  table: T
): Promise<DatabaseSchema[T]> {
  return withLock(async () => {
    const db = await readDb();
    return db[table];
  });
}

type RowWithIds = {
  id?: string;
  idArticulo?: string;
};

async function getById<T extends TableName>(
  table: T,
  id: string
): Promise<DatabaseSchema[T][number] | null> {
  return withLock(async () => {
    const db = await readDb();
    const rows = db[table] as unknown as RowWithIds[];
    const idField = getIdField(table);
    const found = rows.find((row) => row[idField] === id);
    return (found as DatabaseSchema[T][number] | undefined) ?? null;
  });
}

async function insert<T extends TableName>(
  table: T,
  row: DatabaseSchema[T][number]
): Promise<DatabaseSchema[T][number]> {
  return withLock(async () => {
    const db = await readDb();
    const rows = db[table] as unknown as DatabaseSchema[T][number][];
    rows.push(row);
    await writeDb(db);
    return row;
  });
}

async function update<T extends TableName>(
  table: T,
  id: string,
  patch: Partial<DatabaseSchema[T][number]>
): Promise<DatabaseSchema[T][number] | null> {
  return withLock(async () => {
    const db = await readDb();
    const rows = db[table] as unknown as Array<
      DatabaseSchema[T][number] & RowWithIds
    >;
    const idField = getIdField(table);
    const index = rows.findIndex((row) => row[idField] === id);
    if (index === -1) return null;

    const updated = {
      ...rows[index],
      ...patch,
    } as DatabaseSchema[T][number];
    rows[index] = updated as DatabaseSchema[T][number] & RowWithIds;
    await writeDb(db);
    return updated;
  });
}

// --- API tipada por tabla (equivalente a cada hoja de Google Sheets) ---

export const keywordSeedsStore = {
  getAll: () => getAll("keywordSeeds") as Promise<KeywordSeed[]>,
  getById: (id: string) => getById("keywordSeeds", id) as Promise<KeywordSeed | null>,
  insert: (row: KeywordSeed) => insert("keywordSeeds", row),
  update: (id: string, patch: Partial<KeywordSeed>) =>
    update("keywordSeeds", id, patch),
};

export const relatedKeywordsStore = {
  getAll: () => getAll("relatedKeywords") as Promise<RelatedKeyword[]>,
  getById: (id: string) =>
    getById("relatedKeywords", id) as Promise<RelatedKeyword | null>,
  insert: (row: RelatedKeyword) => insert("relatedKeywords", row),
  update: (id: string, patch: Partial<RelatedKeyword>) =>
    update("relatedKeywords", id, patch),
};

export const trendAnalysesStore = {
  getAll: () => getAll("trendAnalyses") as Promise<TrendAnalysis[]>,
  getById: (id: string) =>
    getById("trendAnalyses", id) as Promise<TrendAnalysis | null>,
  insert: (row: TrendAnalysis) => insert("trendAnalyses", row),
  update: (id: string, patch: Partial<TrendAnalysis>) =>
    update("trendAnalyses", id, patch),
};

export const articleDecisionsStore = {
  getAll: () => getAll("articleDecisions") as Promise<ArticleDecision[]>,
  getById: (id: string) =>
    getById("articleDecisions", id) as Promise<ArticleDecision | null>,
  insert: (row: ArticleDecision) => insert("articleDecisions", row),
  update: (id: string, patch: Partial<ArticleDecision>) =>
    update("articleDecisions", id, patch),
};

export const articleBriefsStore = {
  getAll: () => getAll("articleBriefs") as Promise<ArticleBrief[]>,
  getById: (id: string) =>
    getById("articleBriefs", id) as Promise<ArticleBrief | null>,
  insert: (row: ArticleBrief) => insert("articleBriefs", row),
  update: (id: string, patch: Partial<ArticleBrief>) =>
    update("articleBriefs", id, patch),
};

export const articlesStore = {
  getAll: () => getAll("articles") as Promise<Article[]>,
  getById: (id: string) => getById("articles", id) as Promise<Article | null>,
  insert: (row: Article) => insert("articles", row),
  update: (id: string, patch: Partial<Article>) =>
    update("articles", id, patch),
  getBySlug: async (slug: string): Promise<Article | null> => {
    const all = await getAll("articles");
    return all.find((a) => a.slug === slug) ?? null;
  },
  getPublished: async (): Promise<Article[]> => {
    const all = await getAll("articles");
    return all.filter((a) => a.estado === "publicado");
  },
};
