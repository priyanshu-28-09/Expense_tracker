import Device from "../models/deviceModel.js";
import { receiveMobileTransactions } from "../services/transactionService.js";

const sendMobileError = (res, error) => {
  if (error.name === "TransactionValidationError" || error.name === "ValidationError" || error.status === 400) {
    return res.status(400).json({ success: false, message: error.message, ...(error.field ? { field: error.field } : {}) });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "A transaction with this external identifier already exists." });
  }
  console.error("Mobile transaction API error:", error);
  return res.status(500).json({ success: false, message: "Mobile transactions could not be received." });
};

const upsertMobileDevice = async ({ userId, deviceId, deviceName }) => {
  if (!deviceId) return;
  if (typeof deviceId !== "string" || deviceId.length > 128) {
    throw Object.assign(new Error("x-device-id must be at most 128 characters."), { status: 400, field: "x-device-id" });
  }
  if (typeof deviceName !== "string" || deviceName.length > 120) {
    throw Object.assign(new Error("x-device-name must be at most 120 characters."), { status: 400, field: "x-device-name" });
  }

  await Device.findOneAndUpdate(
    { userId, deviceId },
    { userId, deviceId, deviceName, platform: "Android", lastSyncAt: new Date(), isActive: true },
    { upsert: true, returnDocument: "after" }
  );
};

export const uploadMobileTransactions = async (req, res) => {
  try {
    const isBatch = Array.isArray(req.body) || Array.isArray(req.body?.transactions);
    const items = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body?.transactions)
        ? req.body.transactions
        : [req.body];
    const result = await receiveMobileTransactions(req.user._id, items);
    await upsertMobileDevice({
      userId: req.user._id,
      deviceId: req.get("x-device-id"),
      deviceName: req.get("x-device-name") || "Android Device",
    });

    if (isBatch) {
      return res.status(200).json({ success: true, message: "Mobile transactions processed.", ...result });
    }

    const duplicate = result.rejectedItems.find((item) => item.reason === "duplicate");
    if (duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        transactionId: String(duplicate.transactionId),
      });
    }

    const rejected = result.rejectedItems[0];
    if (rejected) {
      return res.status(400).json({
        success: false,
        message: rejected.message || "Transaction was not valid.",
        ...(rejected.field ? { field: rejected.field } : {}),
      });
    }

    return res.status(200).json({
      success: true,
      duplicate: false,
      transactionId: String(result.data[0]._id),
    });
  } catch (error) {
    return sendMobileError(res, error);
  }
};

export const syncMobileTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const payload = Array.isArray(req.body) ? req.body : req.body?.transactions || [];
    const deviceId = req.body?.deviceId || req.get("x-device-id");
    const deviceName = req.body?.deviceName || req.get("x-device-name") || "Android Device";
    await upsertMobileDevice({ userId, deviceId, deviceName });

    const result = await receiveMobileTransactions(userId, payload);
    const duplicateCount = result.rejectedItems.filter((item) => item.reason === "duplicate").length;

    return res.status(200).json({
      success: true,
      inserted: result.received,
      duplicates: duplicateCount,
      rejected: result.rejected,
      transactionId: result.data[0]?._id || null,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Mobile sync error:", error);
    return res.status(500).json({ success: false, message: error.message || "Mobile sync failed." });
  }
};

export const getDevices = async (req, res) => {
  try {
    const userId = req.user._id;
    const devices = await Device.find({ userId }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, data: devices });
  } catch (error) {
    console.error("Get devices error:", error);
    return res.status(500).json({ success: false, message: error.message || "Could not fetch devices." });
  }
};

export const deleteDevice = async (req, res) => {
  try {
    const userId = req.user._id;
    const device = await Device.findOneAndDelete({ _id: req.params.id, userId });

    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found." });
    }

    return res.status(200).json({ success: true, message: "Device removed." });
  } catch (error) {
    console.error("Delete device error:", error);
    return res.status(500).json({ success: false, message: error.message || "Could not remove device." });
  }
};
