import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import carsRouter from "./cars";
import favoritesRouter from "./favorites";
import chatsRouter from "./chats";
import reviewsRouter from "./reviews";
import vehicleReportsRouter from "./vehicleReports";
import aiRouter from "./ai";
import adminRouter from "./admin";
import uploadRouter from "./upload";
import settingsRouter from "./settings";
import promotionsRouter from "./promotions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(carsRouter);
router.use(favoritesRouter);
router.use(chatsRouter);
router.use(reviewsRouter);
router.use(vehicleReportsRouter);
router.use(aiRouter);
router.use(adminRouter);
router.use(uploadRouter);
router.use(settingsRouter);
router.use(promotionsRouter);

export default router;
