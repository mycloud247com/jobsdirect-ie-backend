import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import compression from "compression";
import DB from "./config/database.js";
import initRouter from "./routes/router.js";
import { getRedis } from "./src/services/redisClient.js";
import ViewService from "./src/services/viewService.js";
import SocketService from "./src/services/socketService.js";
import ErrorManager from "./src/utils/errorManager.js";
import cron from "node-cron";

dotenv.config();

const PORT = 3001;
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3001",
  "https://jobsdirect-frontend.vercel.app",
  "https://jobsdirect-ie-frontend.vercel.app",
  "https://jobsdirect.ie",
  "https://www.jobsdirect.ie",
  "https://jobsdirect-frontend-v9l1.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

const app = express();

app.set("trust proxy", 1);

app.use(compression());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["X-New-Access-Token"],
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

async function start() {
  try {
    const db = new DB();
    await db.initiate();
    console.log("Database connected");

    // Initialize Redis for view tracking
    getRedis();

    // Flush view counts to DB every 1 hour
    const viewService = new ViewService(db);
    setInterval(() => viewService.flushViewsToDB(), 60 * 60 * 1000);

    // Check for expiring jobs every 6 hours — notify employers 3 days before
    const { notify } = await import("./src/services/notifier.js");
    const { Op } = db.Sequelize;
    setInterval(async () => {
      try {
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        const expiringJobs = await db.Job.findAll({
          where: {
            status: "approved",
            expires_at: { [Op.between]: [twoDaysFromNow, threeDaysFromNow] },
          },
        });
        for (const job of expiringJobs) {
          if (job.created_by) {
            const empUser = await db.User.findOne({ where: { email: job.created_by } });
            if (empUser) {
              notify("JOB_EXPIRING", { employer: { email: empUser.email, first_name: empUser.first_name }, job: { title: job.title } });
            }
          }
        }
      } catch { }
    }, 6 * 60 * 60 * 1000);

    // Expire old credits every 12 hours
    const errorMgr = new ErrorManager();
    const CreditService = (await import("./src/services/creditService.js")).default;
    const creditCron = new CreditService({ db, errorManager: errorMgr });
    setInterval(() => creditCron.expireOldCredits(), 12 * 60 * 60 * 1000);

    // Process job alerts every 10 seconds (TESTING)
    const JobAlertService = (await import("./src/services/jobAlertService.js")).default;
    const alertCron = new JobAlertService({ db, errorManager: errorMgr });
    setInterval(() => alertCron.processAlerts(), 10 * 1000);

    // Auto-reject employers not approved within 7 days — runs every 6 hours
    cron.schedule("0 */6 * * *", async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const expired = await db.Employer.findAll({
          where: {
            verification_status: { [Op.in]: ["pending", "submitted", "under_review"] },
            approval_submitted_at: { [Op.lt]: sevenDaysAgo, [Op.ne]: null },
          },
        });
        for (const employer of expired) {
          await employer.update({
            verification_status: "rejected",
            admin_review_note: "Auto-rejected: No admin decision was made within the 7-day review period. Please contact support or resubmit for verification.",
          });
          console.log(`[AutoReject] Employer ${employer.id} (${employer.company_name}) auto-rejected after 7-day timeout`);
          // Notify employer
          const empUser = await db.User.findByPk(employer.user_id);
          if (empUser) {
            notify("EMPLOYER_REJECTED", {
              employer: { email: empUser.email, first_name: empUser.first_name },
              reason: "Your verification was not reviewed within the 7-day review window and has been automatically closed. You may resubmit for verification at any time.",
            });
          }
        }
        if (expired.length > 0) console.log(`[AutoReject] ${expired.length} employer(s) auto-rejected`);
      } catch (err) {
        console.error("[AutoReject] Error:", err.message);
      }
    });

    const router = await initRouter(db);
    app.use("/api", router);

    // Global error handler
    app.use((err, req, res, next) => {
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({
        message,
        status,
        success: false,
        error: err.errorCode || "Error",
      });
    });

    // Create HTTP server and attach Socket.io
    const server = http.createServer(app);
    const socketService = new SocketService({
      server,
      allowedOrigins,
      db,
      errorManager: new ErrorManager(),
    });
    socketService.listen();

    server.listen(PORT, () => {
      console.log(`JobsDirect API running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
