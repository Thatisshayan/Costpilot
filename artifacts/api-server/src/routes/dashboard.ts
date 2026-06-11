export { default as dashboardRouter } from "./dashboard-summary";
export { default as dashboardCalendarRouter } from "./dashboard-calendar";
export { default as dashboardActivityRouter } from "./dashboard-activity";
export { calcDaysUntilExpiry, getDefaultWorkspaceId } from "./dashboard-utils";

import { Router } from "express";
import summaryRouter from "./dashboard-summary";
import calendarRouter from "./dashboard-calendar";
import activityRouter from "./dashboard-activity";

const router = Router();

router.use("/", summaryRouter);
router.use("/", calendarRouter);
router.use("/", activityRouter);

export default router;
