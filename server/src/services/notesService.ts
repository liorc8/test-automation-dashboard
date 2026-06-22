import oracledb from "oracledb";
import { execute } from "../db";

export type FailureNote = {
  noteId: number;
  testName: string | null;
  failureReason: string;
  noteContent: string;
  createdAt: string | null;
};

export class NoteConflictError extends Error {
  constructor(message = "A note already exists for this test/reason.") {
    super(message);
    this.name = "NoteConflictError";
  }
}

// Oracle unique-constraint violation code.
const ORA_UNIQUE_VIOLATION = 1;

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
  const sql = `
    INSERT INTO FAILURE_NOTES (TEST_NAME, FAILURE_REASON, NOTE_CONTENT)
    VALUES (:testName, :failureReason, :content)
    RETURNING NOTE_ID INTO :noteId
  `;

  try {
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
  } catch (err: any) {
    if (err?.errorNum === ORA_UNIQUE_VIOLATION) {
      throw new NoteConflictError();
    }
    throw err;
  }
}

export async function deleteNote(id: number): Promise<boolean> {
  const sql = `DELETE FROM FAILURE_NOTES WHERE NOTE_ID = :id`;
  const res = await execute(sql, { id }, { autoCommit: true });
  return (res.rowsAffected ?? 0) > 0;
}
