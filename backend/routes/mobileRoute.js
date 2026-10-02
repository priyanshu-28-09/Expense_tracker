import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  deleteDevice,
  getDevices,
  syncMobileTransactions,
  uploadMobileTransactions,
} from "../controllers/mobileController.js";

const mobileRouter = express.Router();

mobileRouter.post("/transactions", authMiddleware, uploadMobileTransactions);
mobileRouter.post("/sync", authMiddleware, syncMobileTransactions);
mobileRouter.get("/devices", authMiddleware, getDevices);
mobileRouter.delete("/devices/:id", authMiddleware, deleteDevice);

export default mobileRouter;
