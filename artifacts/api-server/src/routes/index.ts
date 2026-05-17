import { Router, type IRouter } from "express";
import healthRouter from "./health";
import platformsRouter from "./platforms";
import projectsRouter from "./projects";
import expensesRouter from "./expenses";
import subscriptionsRouter from "./subscriptions";
import toolsRouter from "./tools";
import dashboardRouter from "./dashboard";
import creditsRouter from "./credits";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/platforms", platformsRouter);
router.use("/projects", projectsRouter);
router.use("/expenses", expensesRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/tools", toolsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/credits", creditsRouter);

export default router;
