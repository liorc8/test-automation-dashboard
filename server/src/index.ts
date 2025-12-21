import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkConnection } from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

checkConnection();

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', system: 'Automation Dashboard Backend' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});