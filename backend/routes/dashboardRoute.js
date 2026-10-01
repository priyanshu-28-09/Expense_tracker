import express from 'express';
import { getDeshboardOverview } from '../controllers/dashboardController.js';
import authMiddleware from '../middleware/auth.js';

const dashboardRouter = express.Router();

//dashboardRouter = express.Router();

dashboardRouter.get("/", authMiddleware, getDeshboardOverview);

export default dashboardRouter;