import oracledb from "oracledb";
import { execute } from "../db";

export type FailureNote = {
  noteId: number;
  testName: string | null;
  failureReason: string;
  noteContent: string;
  createdAt: string | null;
};

export const MAX_NOTES_PER_ITEM = 5;

export class NoteLimitError extends Error {
  constructor(message = `Maximum of ${MAX_NOTES_PER_ITEM} notes per item reached.`) {
    super(message);
    this.name = "NoteLimitError";
  }
}

export async function getNotes(): Promise<FailureNote[]> {
  const sql = `
    SELECT NOTE_ID, TEST_NAME, FAILURE_REASON, NOTE_CONTENT, CREATED_AT
    FROM FAILURE_NOTES
    ORDER BY CREATED_AT DESC
  `;
  const res = await execute(sql, {});
  const rows = (res.rows ?? []) as any[];

  return rows.map((r) => ({
    noteId: Number(r.NOTE_ID),
    testName: (r.TEST_NAME ?? null) as string | null,
    failureReason: String(r.FAILURE_REASON ?? ""),
    noteContent: String(r.NOTE_CONTENT ?? ""),
    createdAt: r.CREATED_AT ? new Date(r.CREATED_AT).toISOString() : null,
  }));
}

export async function createNote(
  testName: string | null,
  failureReason: string,
  content: string
): Promise<number> {
  // Multiple notes per (TEST_NAME, FAILURE_REASON) are allowed, capped at 5.
  const countRes = await execute(
    `SELECT COUNT(*) AS CNT
     FROM FAILURE_NOTES
     WHERE FAILURE_REASON = :failureReason
       AND ((:testName IS NULL AND TEST_NAME IS NULL) OR TEST_NAME = :testName)`,
    { failureReason, testName }
  );
  const count = Number((countRes.rows?.[0] as any)?.CNT ?? 0);
  if (count >= MAX_NOTES_PER_ITEM) {
    throw new NoteLimitError();
  }

  const sql = `
    INSERT INTO FAILURE_NOTES (TEST_NAME, FAILURE_REASON, NOTE_CONTENT)
    VALUES (:testName, :failureReason, :content)
    RETURNING NOTE_ID INTO :noteId
  `;

  const res = await execute(
    sql,
    {
      testName,
      failureReason,
      content,
      noteId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    },
    { autoCommit: true }
  );

  const outBinds = res.outBinds as { noteId: number[] } | undefined;
  return Number(outBinds?.noteId?.[0]);
}

export async function deleteNote(id: number): Promise<boolean> {
  const sql = `DELETE FROM FAILURE_NOTES WHERE NOTE_ID = :id`;
  const res = await execute(sql, { id }, { autoCommit: true });
  return (res.rowsAffected ?? 0) > 0;
}
