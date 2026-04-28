import express, { type Express, type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { pgPool } from "./pgPool";
import { WebhookHandlers } from "./webhookHandlers";

const app: Express = express();

// Trust proxy for secure cookies behind Replit's proxy
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));

// Register Stripe webhook route BEFORE express.json() so we get raw Buffer
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        logger.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        res.status(500).json({ error: "Webhook processing error" });
        return;
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, "Webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session store configuration
const PgSession = connectPgSimple(session);
let sessionStore: session.Store | undefined;

if (pgPool) {
  sessionStore = new PgSession({
    pool: pgPool,
    tableName: "session",
    createTableIfMissing: true,
  });

  logger.info("Using PostgreSQL session store");
} else {
  logger.info("Using MemoryStore (development only)");
}

// Session configuration
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "church-dance-music-checker-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Health check router (at /api)
app.use("/api", router);

// Initialize passport and register app routes asynchronously
async function initPassportAndRoutes() {
  const { default: passport } = await import("./auth");
  app.use(passport.initialize());
  app.use(passport.session());

  const { registerRoutes } = await import("./routes/routes");
  await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logger.error({ err, status }, "Request error");
    res.status(status).json({ message });
  });

  // Initialize Stripe schema and sync (non-blocking)
  if (process.env.STRIPE_SECRET_KEY && process.env.DATABASE_URL) {
    Promise.resolve().then(async () => {
      try {
        const { runMigrations } = await import("stripe-replit-sync");
        await runMigrations({ databaseUrl: process.env.DATABASE_URL! });
        logger.info("Stripe schema ready");

        const { getStripeSync } = await import("./stripeClient");
        const stripeSync = await getStripeSync();
        const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
        try {
          const result = await stripeSync.findOrCreateManagedWebhook(
            `${webhookBaseUrl}/api/stripe/webhook`
          );
          if (result?.webhook?.url) {
            logger.info({ url: result.webhook.url }, "Webhook configured");
          }
        } catch (webhookError: any) {
          logger.warn({ err: webhookError }, "Webhook setup error (non-fatal)");
        }

        stripeSync
          .syncBackfill()
          .then(() => logger.info("Stripe data synced"))
          .catch((err: any) => logger.error({ err }, "Error syncing Stripe data"));
      } catch (error: any) {
        logger.warn({ err: error }, "Failed to initialize Stripe (non-fatal)");
      }
    });
  }
}

initPassportAndRoutes().catch((err) =>
  logger.error({ err }, "Failed to init passport and routes")
);

export default app;
