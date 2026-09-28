import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    status: 'success',
    service: 'SmartFin AI Backend REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
