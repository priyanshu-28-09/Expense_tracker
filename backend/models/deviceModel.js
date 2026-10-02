import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: "Android Device",
    },
    platform: {
      type: String,
      default: "Android",
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true, name: "user_device_unique" });

const deviceModel = mongoose.models.Device || mongoose.model("Device", deviceSchema);

export default deviceModel;
