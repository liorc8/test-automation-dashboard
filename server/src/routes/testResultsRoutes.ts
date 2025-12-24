import { Router } from 'express';
import { getTestResults } from '../controllers/testResultsController';

const router = Router();

router.get('/', getTestResults);

export default router;