import { Request, Response } from "express";
import { getNotes, createNote, deleteNote, NoteLimitError } from "../services/notesService";

export const getNotesHandler = async (_req: Request, res: Response) => {
  try {
    const notes = await getNotes();
    return res.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createNoteHandler = async (req: Request, res: Response) => {
  try {
    const { testName, failureReason, content } = req.body ?? {};

    // Empty / missing testName → general reason note (NULL in DB).
    const normalizedTestName =
      typeof testName === "string" && testName.trim() !== "" ? testName.trim() : null;

    if (typeof failureReason !== "string" || failureReason.trim() === "") {
      return res.status(400).json({ error: "failureReason is required" });
    }
    if (typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ error: "content is required" });
    }

    const noteId = await createNote(normalizedTestName, failureReason.trim(), content.trim());
    return res.status(201).json({
      noteId,
      testName: normalizedTestName,
      failureReason: failureReason.trim(),
      noteContent: content.trim(),
    });
  } catch (error) {
    if (error instanceof NoteLimitError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error creating note:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteNoteHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const deleted = await deleteNote(id);
    if (!deleted) return res.status(404).json({ error: `Note not found: ${id}` });

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting note:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
