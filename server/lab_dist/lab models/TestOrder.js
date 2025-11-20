"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const testOrderSchema = new mongoose_1.default.Schema({
    appointmentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Appointment", required: true },
    doctorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Doctor", required: true },
    testList: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Test", required: true }],
    status: { type: String, enum: ["awaiting-sample", "in-analysis", "completed"], default: "awaiting-sample" }
}, { collection: "testorders", timestamps: true });
testOrderSchema.index({ doctorId: 1 });
// Use deleteOne document middleware instead of deprecated remove
// eslint-disable-next-line @typescript-eslint/ban-types
// @ts-ignore – mongoose typings accept this overload when options provided
// We add options to clarify this is document middleware
// (see https://mongoosejs.com/docs/middleware.html)
testOrderSchema.pre("deleteOne", { document: true, query: false }, function (next) {
    // TODO: cascade deletes if needed (e.g., samples, reports)
    next();
});
exports.default = mongoose_1.default.models.TestOrder ||
    mongoose_1.default.model("TestOrder", testOrderSchema);
