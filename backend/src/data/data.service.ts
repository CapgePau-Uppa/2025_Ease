/**
 * @file data.service.ts
 * @brief Service for handling data operations.
 *
 * This service provides functionalities for managing product data,
 * including adding, retrieving, and checking for duplicates before insertion.
 */

import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class DataService {
  constructor(private readonly databaseService: DatabaseService) { }

  async onApplicationBootstrap() {
    await this.insertProductsToDatabase();
  }

  /**
   * Inserts products from the products.json file into the Couchbase database.
   * Ensures that duplicate products are not inserted.
   */
  async insertProductsToDatabase() {
    const collection = await this.databaseService.getProductsCollection();

    try {
      // Determine environment and construct file path
      const basePath = path.resolve(__dirname, "..", "..");
      const filePath = path.join(basePath, "src", "products.json");

      // Load JSON file
      const fileData = fs.readFileSync(filePath, "utf-8");
      const products = JSON.parse(fileData);

      for (const product of products) {
        try {
          // Check if product already exists
          const existingProduct = await collection
            .get(product.id)
            .catch(() => null);
          if (existingProduct) {
            continue;
          }

          await collection.upsert(product.id, product);
        } catch (error) {
          console.error(`Error inserting product ${product.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error reading or inserting products:", error.message);
    }
  }
}