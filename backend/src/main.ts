/**
 * @file main.ts
 * @brief Entry point for the NestJS application.
 *
 * This file initializes the NestJS application, sets up logging,
 * configures database connections, and starts the server.
 */

// Load environment variables
import * as dotenv from "dotenv";
import * as path from "path";
import * as cookieParser from "cookie-parser";

// Load the appropriate .env file based on the environment
const envFile = path.resolve(
  __dirname,
  "../../.env." + (process.env.NODE_ENV || "development"),
);
dotenv.config({ path: envFile });
console.log(`🚀 Running in ${process.env.NODE_ENV} mode`);

// Import NestJS core dependencies
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DatabaseService } from "./database/database.service";

// Logging configuration
import * as winston from "winston";
import { WinstonModule } from "nest-winston";

/**
 * @brief Initializes and starts the NestJS application.
 *
 * This function sets up logging, enables CORS, initializes the database,
 * and starts the application server.
 */
async function bootstrap() {
  /**
   * Configures the Winston logger for logging messages and errors.
   */
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`;
          }),
        ),
      }),
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
      new winston.transports.File({
        filename: "logs/combined.log",
      }),
    ],
  });

  // Create the NestJS application with the global logger
  const app = await NestFactory.create(AppModule, { logger });

  // Middleware to parse cookies
  app.use(cookieParser());

  /**
   * Middleware to extract the JWT token from cookies and add it
   * to the Authorization header if not already set.
   */
  app.use((req, res, next) => {
    const token = req.cookies?.accessToken;
    if (token) {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        req.headers.authorization = `Bearer ${token}`;
        console.log("🔄 Token extracted from cookies and added to Authorization header");
        console.log("🔑 Token added:", token.substring(0, 20) + "...");
      } else {
        console.log("ℹ️ Authorization header already present:", req.headers.authorization.substring(0, 20) + "...");
      }
    } else {
      console.log("⚠️ No token found in cookies");
    }
    next();
  });

  /**
   * Retrieves necessary services from the application context.
   */
  const databaseService = app.get(DatabaseService);

  try {
    /**
     * Initializes the database connection and retrieves the bucket.
     */
    await databaseService.onModuleInit();
    logger.log(
      "info",
      `✅ Successfully connected to bucket: ${process.env.BUCKET_NAME} (main.ts)`,
    );
  } catch (error) {
    logger.error(`❌ Error while using the bucket (main.ts): ${error.message}`);
  }

  /**
   * Configures CORS settings with credential support.
   */
  // Configuration CORS basée strictement sur NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`🌍 Environnement détecté: ${nodeEnv}`);

  let corsOrigin;
  let corsCredentials = true;

  switch (nodeEnv) {
    case 'development':
      // Environnement de développement local
      corsOrigin = process.env.URL_FRONTEND || 'http://localhost:4200';
      console.log(`🛠️ CORS en développement: ${corsOrigin}`);
      break;

    case 'production':
      // Environnement de production locale (Docker, etc.)
      corsOrigin = process.env.URL_FRONTEND || 'http://localhost:4200';
      console.log(`🏭 CORS en production locale: ${corsOrigin}`);
      break;

    case 'deploy':
      // Environnement de déploiement (Render, Vercel, etc.)
      corsOrigin = process.env.URL_FRONTEND || true;
      console.log(`🚀 CORS en déploiement: ${corsOrigin}`);
      break;

    default:
      // Fallback sécurisé
      corsOrigin = process.env.URL_FRONTEND || true;
      console.log('⚠️ Mode CORS par défaut activé');
  }

  app.enableCors({
    origin: corsOrigin,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: corsCredentials,
    allowedHeaders: "Content-Type, Accept, Authorization",
    exposedHeaders: "Set-Cookie"
  });

  /**
   * Starts the NestJS server on the configured port.
   */
  const port = process.env.BACKEND_PORT || 3000;
  await app.listen(port, "0.0.0.0");
  logger.log("info", `🚀 Application started at http://localhost:${port}`);
}

bootstrap();
