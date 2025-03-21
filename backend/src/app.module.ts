/**
 * @file app.module.ts
 * @brief Main module of the NestJS application.
 *
 * This module imports all necessary submodules, configures global settings,
 * applies rate limiting, and sets up environment variables validation.
 */

import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
// App component
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
// Module import
import { DatabaseModule } from "./database/database.module";
import { DataModule } from "./data/data.module";
import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";
import { OpenFoodFactsModule } from "./apiServices/openFoodFacts/openFoodFacts.module";
import { CountriesModule } from "./apiServices/countries/countries.module";
import { UnsplashModule } from "./apiServices/unsplash/unsplash.module";
// Environment variables configuration
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
// Rate limiting
import { ThrottlerModule } from "@nestjs/throttler";
// HTTP request logging
import { LoggingMiddleware } from "./logging.middleware";
import { RequestHandlerModule } from "./requestHandler/requestHandler.module";
import { AdminModule } from "./admin/admin.module";

/**
 * @class AppModule
 * @brief Main application module, responsible for importing submodules, configuring middleware, and setting up guards.
 */
@Module({
  imports: [
    DatabaseModule,
    DataModule,
    RequestHandlerModule,
    AuthModule,
    AdminModule,
    ProductsModule,
    OpenFoodFactsModule,
    CountriesModule,
    UnsplashModule,
    /**
     * @brief Loads environment variables and validates them with Joi.
     *
     * - `isGlobal: true` ensures variables are available across all modules.
     * - `envFilePath: "../.env"` specifies the location of the `.env` file.
     * - `validationSchema` ensures required environment variables are set.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../.env",
      validationSchema: Joi.object({
        BUCKET_NAME: Joi.string().required(),
        URL_FRONTEND: Joi.string().uri().required(),
        BACKEND_PORT: Joi.number().required().default(3000),
      }),
    }),
    /**
     * @brief Rate limiting to prevent brute force attacks.
     *
     * - `ttl: 60` (Time-To-Live) sets the window duration in seconds.
     * - `limit: 10` defines the maximum number of requests allowed per IP within the TTL.
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 10,
      },
    ]),
  ],
  // Controllers for handling application routes.
  controllers: [AppController],
  // Service providers, including global role-based access control.
  providers: [
    AppService,
  ],
})
export class AppModule implements NestModule {
  /**
   * @brief Configures middleware for the application.
   *
   * Applies logging middleware to all routes (`*`).
   * @param consumer MiddlewareConsumer instance.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes("*");
  }
}
