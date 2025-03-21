/**
 * @file products.controller.ts
 * @brief Controller for handling product-related API endpoints.
 *
 * This controller provides endpoints to select a product, retrieve a product by ID,
 * and fetch all products from the database.
 */

import {
  Controller,
  Post,
  Body,
  BadRequestException,
  InternalServerErrorException,
  Get,
  Param,
} from "@nestjs/common";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  /**
   * @brief Selects a product based on the provided product ID.
   */
  @Post("select")
  async selectProduct(@Body() body: { productId: string }) {
    if (!body.productId) {
      throw new BadRequestException("❌ Product's ID is required!");
    }

    try {
      return await this.productsService.selectProduct(body.productId);
    } catch (error) {
      console.error("❌ Error selecting product:", error);
      throw new InternalServerErrorException("Error selecting product.");
    }
  }

  /**
   * @brief Retrieves alternative European products.
   */
  @Get("alternativeProducts/:id")
  async getAlternativeProducts(@Param("id") productId: string) {
    try {
      return await this.productsService.getAlternativeProducts(productId);
    } catch (error) {
      console.error("❌ Error retrieving alternative products:", error);
      throw new InternalServerErrorException(
        "Error retrieving alternative products."
      );
    }
  }

  /**
   * @brief Retrieves a product by its ID.
   */
  @Get(":id")
  async getProductById(@Param("id") productId: string) {
    try {
      return await this.productsService.getProductById(productId);
    } catch (error) {
      console.error("❌ Error retrieving product:", error);
      throw new InternalServerErrorException("Error retrieving product.");
    }
  }

  /**
   * @brief Retrieves all products from the database.
   */
  @Get()
  async getAllProducts() {
    try {
      return await this.productsService.getAllProducts();
    } catch (error) {
      console.error("❌ Error retrieving all products:", error);
      throw new InternalServerErrorException("Error retrieving all products.");
    }
  }

  /**
   * @brief Handles the POST request to fetch products based on filters.
   * 
   * This endpoint accepts a POST request containing filter criteria in the request body,
   * then calls the `getFilteredProducts` method from the `productsService` to retrieve 
   * products that match the provided filters. If an error occurs during this process,
   * an error response is thrown with a message indicating the failure.
   * 
   * @param filters The filter criteria used to retrieve the products. This object contains various properties such as category, price range, etc.
   * 
   * @returns {Promise<any>} A promise that resolves to the list of filtered products retrieved from the database.
   * 
   * @throws {InternalServerErrorException} If an error occurs during the retrieval of filtered products, an InternalServerErrorException is thrown.
   */
  @Post("filteredProducts")
  async getFilteredProducts(@Body() filters: any) {
    try {
      return await this.productsService.getFilteredProducts(filters);
    } catch (error) {
      console.error("❌ Error retrieving filtered products:", error);
      throw new InternalServerErrorException("Error retrieving filtered products.");
    }
  }

  /**
   * @brief Adds a new product to the database.
   * 
   * This endpoint accepts a POST request containing a product object,
   * validates the necessary fields, and calls `addProduct` from `ProductsService`
   * to store the product in the database.
   * 
   * @param product The product details sent in the request body.
   * @returns {Promise<any>} The created product with its assigned ID.
   * 
   * @throws {BadRequestException} If required fields are missing.
   * @throws {InternalServerErrorException} If an error occurs during insertion.
   */
  @Post("add")
  async addProduct(@Body() product: any) {
    if (!product) {
      throw new BadRequestException("❌ Missing required product details!");
    }
    try {
      return await this.productsService.addProduct(product);
    } catch (error) {
      console.error("❌ Error adding product:", error);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException("Error adding product.");
    }
  }

  /**
   * @brief Retrieves products based on location.
   * 
   * @param location The location identifier for which to retrieve products.
   * @returns {Promise<any>} A promise that resolves to products available in the specified location.
   * 
   * @throws {InternalServerErrorException} If an error occurs during the retrieval process.
   */
  @Get("location/:location")
  async getProductByLocation(@Param("location") location: string) {
    try {
      return await this.productsService.getProductByLocation(location);
    } catch (error) {
      console.error("❌ Error retrieving products by location:", error);
      throw new InternalServerErrorException("Error retrieving products by location.");
    }
  }
}