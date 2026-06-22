import { Router } from "express";
import { getNotesHandler, createNoteHandler, deleteNoteHandler } from "../controllers/notesController";

const router = Router();

router.get("/", getNotesHandler);
router.post("/", createNoteHandler);
router.delete("/:id", deleteNoteHandler);

export default router;
