import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import sellersRouter from "./sellers";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import publicStoreRouter from "./publicStore";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(sellersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(dashboardRouter);
router.use(storageRouter);
router.use(publicStoreRouter);

export default router;
