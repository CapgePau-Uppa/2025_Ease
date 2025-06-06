﻿/**
 * @file database.service.ts
 * @brief Service for handling database operations in Couchbase.
 *
 * This service provides functionalities to interact with Couchbase, including:
 * - Connection management for multiple buckets (`products` and `users`).
 * - CRUD operations on products and users collections.
 * - Execution of N1QL queries and Full-Text Search (FTS).
 */

// Other
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  Bucket,
  Cluster,
  Collection,
  connect,
  SearchQuery,
  HighlightStyle,
  DocumentNotFoundError,
} from "couchbase";
import * as fs from "fs";
// HTTP
import { HttpService } from "@nestjs/axios";
import { UserRole } from "src/auth/enums/roles.enum";
// .env
import * as dotenv from "dotenv";
dotenv.config();
import { v4 as uuidv4 } from "uuid"; // Generate unique ID
import { AddressDto } from "src/auth/dto/auth.dto"; // Check of the address
import { CommentDto } from "src/comments/dto/comments.dto";

// Definition of expected keys for Buckets and Collections
type BucketKeys =
  | "productsBucket"
  | "usersBucket"
  | "categBucket"
  | "brandBucket"
  | "historyBucket"
  | "favoritesBucket"
  | "commentsBucket";
type CollectionKeys =
  | "productsCollection"
  | "usersCollection"
  | "categCollection"
  | "brandCollection"
  | "historyCollection"
  | "favoritesCollection"
  | "commentsCollection";

/**
 * @brief Service responsible for database operations.
 * @details This service manages connections to Couchbase buckets and provides methods
 * for interacting with the database, including CRUD operations and search functionality.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private cluster: Cluster;
  // Buckets
  private productsBucket: Bucket;
  private usersBucket: Bucket;
  private categBucket: Bucket;
  private brandBucket: Bucket;
  private historyBucket: Bucket;
  private favoritesBucket: Bucket;
  private commentsBucket: Bucket;
  // Collections
  private productsCollection: Collection;
  private usersCollection: Collection;
  private categCollection: Collection;
  private brandCollection: Collection;
  private historyCollection: Collection;
  private favoritesCollection: Collection;
  private commentsCollection: Collection;

  /**
   * @brief Constructor for DatabaseService.
   * @param {HttpService} httpService - Service for making HTTP requests.
   */
  constructor(private readonly httpService: HttpService) {
    this.initializeConnections();
  }

  // ========================================================================
  // ======================== DATABASE INIT AND CONNECTION
  // ========================================================================
  /**
   * @brief Initializes the Couchbase connection when the module starts.
   *
   * This method loads the SSL certificate and establishes connections
   * to the Couchbase Capella cluster for products and users buckets.
   */
  async onModuleInit() {
    await this.initializeConnections();
  }

  /**
   * @brief Connects to a Couchbase bucket and initializes its collection.
   * @param {string} bucketNameEnv - The environment variable holding the bucket name.
   * @param {BucketKeys} bucketVar - The bucket property in the class.
   * @param {CollectionKeys} collectionVar - The collection property in the class.
   */
  private async connectToBucket(
    bucketNameEnv: string,
    bucketVar: BucketKeys,
    collectionVar: CollectionKeys
  ): Promise<void> {
    const bucketName = process.env[bucketNameEnv];
    if (!bucketName)
      throw new Error(
        `❌ ${bucketNameEnv} is not defined in environment variables.`
      );

    const bucket = this.cluster.bucket(bucketName); // Couchbase bucket
    this[bucketVar] = bucket as any; // Force TypeScript to accept it
    this[collectionVar] = bucket.defaultCollection() as any; // Force TypeScript to accept it
  }

  /**
   * @brief Initializes Couchbase connections for products and users buckets.
   */
  private async initializeConnections() {
    try {
      if (this.cluster) {
        console.warn("⚠️ Couchbase connection is already initialized.");
        return;
      }

      const certPath = process.env.SSL_CERT_PATH;
      if (!certPath || !fs.existsSync(certPath)) {
        throw new Error("❌ SSL certificate not found. Check SSL_CERT_PATH.");
      }

      this.cluster = await connect(
        process.env.DB_HOST || "couchbase://localhost",
        {
          username: process.env.DB_USER || "Administrator",
          password: process.env.DB_PASSWORD || "password",
          configProfile: "wanDevelopment",
        }
      );

      // Connection to all buckets and collections
      await Promise.all([
        this.connectToBucket(
          "BUCKET_NAME",
          "productsBucket",
          "productsCollection"
        ),
        this.connectToBucket(
          "USER_BUCKET_NAME",
          "usersBucket",
          "usersCollection"
        ),
        this.connectToBucket(
          "CATEGORY_BUCKET_NAME",
          "categBucket",
          "categCollection"
        ),
        this.connectToBucket(
          "BRAND_BUCKET_NAME",
          "brandBucket",
          "brandCollection"
        ),
        this.connectToBucket(
          "COMMENTS_BUCKET_NAME",
          "commentsBucket",
          "commentsCollection"
        ),
        this.connectToBucket(
          "SEARCH_HISTORY_BUCKET_NAME",
          "historyBucket",
          "historyCollection"
        ),
        this.connectToBucket(
          "FAVORITES_BUCKET_NAME",
          "favoritesBucket",
          "favoritesCollection"
        ),
      ]);

    } catch (error) {
      console.error("❌ Connection error to Couchbase:", error);
      setTimeout(() => this.initializeConnections(), 5000); // Retry after 5s
    }
  }

  /**
   * @brief Closes the Couchbase connection when the module is destroyed.
   */
  async onModuleDestroy() {
    await this.cluster?.close();
  }

  // ========================================================================
  // ======================== DATABASE GET BUCKETS AND COLLECTION
  // ========================================================================

  // ======================== GENERIC METHODS
  /**
   * @brief Validates and returns the specified Couchbase bucket.
   *
   * @details This method ensures that the provided Couchbase bucket is initialized.
   * If the bucket is undefined or uninitialized, an error is thrown.
   *
   * @param {Bucket | undefined} bucket - The Couchbase bucket instance to validate.
   * @param {string} name - The name of the bucket (for error messages).
   */
  private getBucket(bucket: Bucket | undefined, name: string): Bucket {
    if (!bucket) {
      throw new Error(`❌ Couchbase bucket '${name}' is not initialized yet.`);
    }
    return bucket;
  }

  /**
   * @brief Validates and returns the specified Couchbase collection.
   *
   * @details This method ensures that the provided Couchbase collection is initialized.
   * If the collection is undefined or uninitialized, an error is thrown.
   *
   * @param {Collection | undefined} collection - The Couchbase collection instance to validate.
   * @param {string} name - The name of the collection (for error messages).
   */
  private getCollection(
    collection: Collection | undefined,
    name: string
  ): Collection {
    if (!collection) {
      throw new Error(
        `❌ Couchbase collection '${name}' is not initialized yet.`
      );
    }
    return collection;
  }

  /**
   * @brief Retrieves the favorites collection.
   */
  getFavoritesCollection(): Collection {
    return this.getCollection(this.favoritesCollection, "favorites");
  }

  // ======================== BUCKET METHODS
  /**
   * @brief Retrieves the Couchbase bucket instance for products.
   */
  getProductsBucket(): Bucket {
    return this.getBucket(this.productsBucket, "products");
  }

  /**
   * @brief Retrieves the Couchbase bucket instance for users.
   */
  getUsersBucket(): Bucket {
    return this.getBucket(this.usersBucket, "users");
  }

  /**
   * @brief Retrieves the Couchbase bucket instance for category.
   */
  getCategBucket(): Bucket {
    return this.getBucket(this.categBucket, "category");
  }

  /**
   * @brief Retrieves the Couchbase bucket instance for brands.
   */
  getBrandBucket(): Bucket {
    return this.getBucket(this.brandBucket, "brands");
  }

  /**
   * @brief Retrieves the Couchbase bucket instance for history.
   */
  getHistoryBucket(): Bucket {
    return this.getBucket(this.historyBucket, "history");
  }

  /**
   * @brief Retrieves the Couchbase bucket instance for favorites.
   */
  getFavoritesBucket(): Bucket {
    return this.getBucket(this.favoritesBucket, "favorites");
  }

  // ======================== COLLECTION METHODS
  /**
   * @brief Retrieves the products collection.
   */
  getProductsCollection(): Collection {
    return this.getCollection(this.productsCollection, "products");
  }

  /**
   * @brief Retrieves the users collection.
   */
  getUsersCollection(): Collection {
    return this.getCollection(this.usersCollection, "users");
  }

  /**
   * @brief Retrieves the category collection.
   */
  getCategCollection(): Collection {
    return this.getCollection(this.categCollection, "categories");
  }

  /**
   * @brief Retrieves the brand collection.
   */
  getBrandCollection(): Collection {
    return this.getCollection(this.brandCollection, "brands");
  }

  /**
   * @brief Retrieves the history collection.
   */
  getHistoryCollection(): Collection {
    return this.getCollection(this.historyCollection, "history");
  }

  // ========================================================================
  // ======================== EXECUTE QUERY FUNCTIONS
  // ========================================================================
  /**
   * @brief Executes a Couchbase N1QL query with provided parameters (public method).
   *
   * @details This public method exposes query execution for other services.
   * It calls the private executeQuery method to run a given N1QL query against the Couchbase cluster.
   *
   * @param {string} query - The N1QL query string to be executed.
   * @param {any} [params={}] - An optional object containing query parameters.
   *
   * @returns {Promise<any[]>} - A promise resolving to the query result rows.
   *
   * @throws {InternalServerErrorException} If the query execution fails.
   */
  async executeN1qlQuery(query: string, params: any = {}): Promise<any[]> {
    return this.executeQuery(query, params);
  }

  /**
   * @brief Executes a Couchbase N1QL query with provided parameters.
   *
   * @details This method runs a given N1QL query against the Couchbase cluster,
   * handling errors and timeouts appropriately. It logs the execution process
   * for debugging purposes and ensures queries do not block indefinitely.
   *
   * @param {string} query - The N1QL query string to be executed.
   * @param {any} [params={}] - An optional object containing query parameters.
   *
   * @returns {Promise<any[]>} - A promise resolving to the query result rows.
   *
   * @throws {InternalServerErrorException} If the query execution fails due to syntax errors, timeouts, or other issues.
   */
  private async executeQuery(query: string, params: any = {}): Promise<any[]> {
    try {

      // Execute the Couchbase query with parameters and a timeout
      const result = await this.cluster.query(query, {
        parameters: params,
        timeout: 10000, // Timeout to prevent long-running queries
        scanConsistency: 'request_plus' as any // Ensure we get the latest data
      });

      return result.rows || [];
    } catch (error) {
      console.error("❌ Couchbase Query Error:", error.message || error);
      console.error("❌ Query that failed:", query);
      console.error("❌ Parameters used:", params);

      /**
       * Error Handling:
       * - `error.first_error_code === 5000` → Syntax error in the query.
       * - `error.cause?.code === 1080` → Query execution timed out.
       * - `error.message?.includes('timeout')` → General timeout error.
       */
      if (error?.first_error_code === 5000) {
        console.error("⚠️ Couchbase syntax error. Check your query.");
        throw new InternalServerErrorException(
          "Database query syntax error. Please check the query."
        );
      } else if (error?.cause?.code === 1080 || error.message?.includes('timeout')) {
        console.error("⚠️ Couchbase query timed out after 10 seconds.");
        throw new InternalServerErrorException(
          "Database query timed out. Please try again later."
        );
      }

      throw new InternalServerErrorException(
        "Database query execution failed."
      );
    }
  }

  // ========================================================================
  // ======================== SEARCH FUNCTIONS (SUGGESTIONS)
  // ========================================================================
  /**
   * Executes a Full Text Search (FTS) query on Couchbase Capella.
   * @param {string} searchQuery - The query string to search for.
   * @returns {Promise<any[]>} A promise that resolves to an array of search results.
   * @throws {Error} If the search query execution fails.
   */
  async searchQuery(searchQuery: string): Promise<any[]> {
    const _indexName = process.env.INDEX_NAME;
    if (!_indexName) {
      throw new InternalServerErrorException(
        "❌ Full-Text Search index name is not defined in environment variables."
      );
    }

    try {
      const queryLower = searchQuery.toLowerCase(); // Normalize only once
      const combinedQuery = SearchQuery.disjuncts(
        SearchQuery.prefix(queryLower),
        SearchQuery.match(queryLower)
      );

      const searchRes = await this.cluster.searchQuery(
        _indexName,
        combinedQuery,
        {
          fields: ["name", "description", "category", "tags", "status"],
          highlight: {
            style: HighlightStyle.HTML,
            fields: ["name", "description", "category", "tags", "status"],
          },
        }
      );

      // Exclude unwanted statuses
      const filteredResults = searchRes.rows.filter(
        (row) =>
          ![
            "add-product",
            "edit-product",
            "delete-product",
            "Rejected",
          ].includes(row.fields?.status)
      );

      return filteredResults;
    } catch (error) {
      console.error("❌ Error during FTS query:", error);
      throw new InternalServerErrorException(
        "Full-Text Search query execution failed."
      );
    }
  }

  // ========================================================================
  // ======================== SEARCH FUNCTIONS (ALTERNATIVE PRODUCTS, NOT THE SUGGESTIONS)
  // ========================================================================

  // =========== UTILITY FUNCTIONS
  /**
   * @brief Builds a SQL WHERE clause from an array of conditions with a dynamic operator.
   *
   * @param conditions An array of condition strings.
   * @param operator The SQL operator to use ("OR" or "AND"). Default is "OR".
   * @returns {string} A formatted SQL condition string or an empty string.
   */
  buildConditions(conditions: string[], operator: "OR" | "AND" = "OR"): string {
    return conditions.length ? `(${conditions.join(` ${operator} `)})` : "";
  }

  /**
   * @brief Builds similarity-based conditions using attributes of a selected product.
   *
   * @details
   * Fetches a product by its ID and constructs conditions to find similar products.
   * Similarity criteria include:
   * - Category match
   * - Shared tags
   * - Price within ±20% of the selected product's price
   * - Same brand (FK_Brands)
   *
   * @param productId The ID of the selected product for similarity comparison.
   * @returns {Promise<string>} A string containing similarity conditions or an empty string if no product is found.
   * @throws {Error} If the product is not found or the query fails.
   */
  async buildSimilarityConditions(
    this: any,
    productId: string
  ): Promise<string> {
    if (!productId) return "";

    const selectedProduct = await this.getProductById(productId);
    if (!selectedProduct)
      throw new Error(`❌ Product with ID ${productId} not found.`);

    const conditions: string[] = [];
    if (selectedProduct.category) conditions.push(`category = $category`);
    if (selectedProduct.tags?.length)
      conditions.push(`ANY tag IN tags SATISFIES tag IN $tags END`);
    if (selectedProduct.price)
      conditions.push(`price BETWEEN $minPrice AND $maxPrice`);
    if (selectedProduct.FK_Brands) conditions.push(`FK_Brands = $brandFK`);

    return this.buildConditions(conditions, "AND");
  }

  /**
   * @brief Builds similarity conditions for an external product search.
   *
   * Constructs a SQL-like condition string for filtering products based on
   * attributes such as name, brand, category, and tags. This method is used
   * when searching for similar products to an external product (e.g., from an API).
   *
   * @param filters An object containing the filtering criteria:
   *   - `name` (string, optional): Product name.
   *   - `brand` (string, optional): Product brand.
   *   - `category` (string, optional): Product category.
   *   - `tags` (array, optional): List of tags associated with the product.
   *
   * @returns {string} A dynamically constructed SQL-like condition string.
   *
   * @note Uses parameterized placeholders (e.g., `$filterName`, `$filterBrand`)
   * to prevent SQL injection when used in queries.
   */
  buildSimilarityConditionsFromExternalProduct(filters: any): string {
    const conditions: string[] = [];

    if (filters.name) conditions.push(`name = $filterName`);
    if (filters.brand) conditions.push(`FK_Brands = $brandFK`);
    if (filters.category) conditions.push(`category = $filterCategory`);
    if (filters.tags?.length)
      conditions.push(`ANY tag IN tags SATISFIES tag IN $filterTags END`);

    return this.buildConditions(conditions);
  }

  /**
   * @brief Builds filter-based conditions based on user-provided criteria.
   *
   * @details
   * Constructs query conditions using user filters for:
   * - Category
   * - Country of origin
   * - Price range
   * - Brand (via subquery to resolve foreign key reference)
   *
   * If a brand is provided without a product ID, it performs a subquery to find the corresponding `FK_Brands`.
   *
   * @param filters The filters object containing user-provided criteria.
   * @param brandBucketName Name of the Couchbase bucket containing brand documents.
   * @returns {Promise<string>} A string containing filter conditions.
   */
  async buildFilterConditions(filters: any): Promise<string> {
    const conditions: string[] = [];

    if (filters.category) conditions.push(`category = $filterCategory`);
    if (filters.country) conditions.push(`origin = $filterCountry`);
    if (filters.minPrice && filters.maxPrice) {
      conditions.push(`price BETWEEN $filterMinPrice AND $filterMaxPrice`);
    } else if (filters.minPrice) {
      conditions.push(`price >= $filterMinPrice`);
    } else if (filters.maxPrice) {
      conditions.push(`price <= $filterMaxPrice`);
    }
    if (filters.tags?.length) {
      conditions.push(`ANY tag IN tags SATISFIES tag IN $filterTags END`);
    }

    // Optimization: SQL query to find `FK_Brands`.
    if (filters.brand) {
      conditions.push(`FK_Brands = $brandFK`);
    }

    // Exclude unwanted statuses only for internal products
    if (filters.productSource === "Internal") {
      conditions.push(
        "status NOT IN ['add-product', 'edit-product', 'delete-product']"
      );
    }

    return this.buildConditions(conditions, "AND");
  }

  /**
   * @brief Builds the final SQL query based on similarity and filter conditions.
   *
   * @details
   * Combines similarity and filter conditions into a single WHERE clause.
   * - `/searched-prod`: Combines conditions with `AND` for stricter matching.
   * - `/home`: Combines conditions with `OR` for broader matching.
   *
   * @param similarityClause The similarity conditions string.
   * @param filtersClause The filter conditions string.
   * @param currentRoute The current route determining the logical operator to use.
   * @param bucketName Name of the Couchbase bucket containing product documents.
   * @returns {string} A full N1QL query string.
   * @throws {Error} If the route is unrecognized.
   */
  buildQuery(
    similarityClause: string,
    filtersClause: string,
    currentRoute: string,
    bucketName: string
  ): string {
    if (!similarityClause && !filtersClause) return "";

    let whereClause = "";
    // If the route il /searched-prod then prioritize filters
    switch (currentRoute) {
      case "/searched-prod":
        whereClause = [similarityClause, filtersClause]
          .filter(Boolean)
          .join(" AND ");
        break;
      default:
        whereClause = [similarityClause, filtersClause]
          .filter(Boolean)
          .join(" OR ");
        break;
    }
    return `SELECT * FROM \`${bucketName}\` WHERE ${whereClause}`;
  }

  /**
   * @brief Retrieves alternative products based on search criteria from Couchbase.
   *
   * This method constructs a dynamic N1QL query to fetch alternative products from Couchbase
   * based on the given search criteria. It also integrates an external API call to retrieve
   * a list of European countries, ensuring that only European-origin products are included.
   *
   * @param {any} searchCriteria - Object containing the search filters such as category, tags, and brand.
   * @returns {Promise<any[]>} A promise resolving with an array of alternative products.
   * @throws {InternalServerErrorException} If the query execution fails or no search criteria are provided.
   */
  async getAlternativeProducts(searchCriteria: any): Promise<any[]> {
    const bucketName = this.productsBucket.name;

    try {
      if (Object.keys(searchCriteria).length === 0) {
        throw new Error("❌ searchCriteria is empty");
      }

      // API call to fetch the list of European countries
      const response = await this.httpService.axiosRef.get(
        "https://restcountries.com/v3.1/region/europe"
      );
      const europeanCountries = response.data.map(
        (country) => country.name.common
      );

      // Dynamically construct the N1QL query
      let query = `SELECT * FROM \`${bucketName}\` WHERE `;
      const queryConditions: string[] = [];
      const queryParams: any[] = [];

      // Add conditions dynamically based on provided criteria
      // Exclude the product that was searched (by ID)
      if (searchCriteria.searchedProductID) {
        queryConditions.push("id != ?");
        queryParams.push(searchCriteria.searchedProductID); // Exclude the searched product
      }
      if (searchCriteria.category) {
        queryConditions.push("category = ?");
        queryParams.push(searchCriteria.category);
      }
      if (searchCriteria.tags && searchCriteria.tags.length > 0) {
        queryConditions.push("ANY tag IN tags SATISFIES tag IN ? END");
        queryParams.push(searchCriteria.tags); // Ensures at least one tag matches
      }
      if (searchCriteria.brand) {
        queryConditions.push("brand != ?");
        queryParams.push(searchCriteria.brand); // Exclude the same brand
      }

      // Filter only European products
      queryConditions.push("origin IN ?");
      queryParams.push(europeanCountries); // Verify if the origin is European

      // Finalize the query with conditions
      query += queryConditions.join(" AND ");

      // Execute the query in Couchbase
      const result = await this.cluster.query(query, {
        parameters: queryParams,
      });
      return result.rows.map((row) => row[bucketName]); // Extract product data
    } catch (error) {
      console.error(
        "❌ Error retrieving alternative products (database.service):",
        error
      );
      throw new InternalServerErrorException(
        "Error retrieving alternative products (database.service)"
      );
    }
  }

  // =========== MAIN FUNCTION
  /**
   * @brief Retrieves products based on filters and/or similarity to a selected product.
   *
   * @details
   * This function:
   * - Builds **similarity conditions** if a `productId` is provided.
   * - Builds **filter conditions** based on user inputs.
   * - **Combines conditions dynamically** based on the current route:
   *   - `/searched-prod`: Products must satisfy both similarity and filter conditions (`AND`).
   *   - `/home`: Products satisfying either condition are returned (`OR`).
   * - **Handles brand foreign keys (FK_Brands) with subqueries**.
   * - **Supports filtering by category, price range, country, brand, and tags**.
   *
   * @param filters An object containing search criteria:
   *   - `category` (string, optional): Filters products by category.
   *   - `country` (string, optional): Filters products by country of origin.
   *   - `minPrice` (number, optional): Sets the minimum price range.
   *   - `maxPrice` (number, optional): Sets the maximum price range.
   *   - `brand` (string, optional): Filters by brand name.
   *   - `tags` (array<string>, optional): Filters products containing specified tags.
   *   - `name` (string, optional): Searches for a product by name.
   *   - `productId` (string, optional): If provided, finds similar products.
   *   - `productSource` (string, optional): Specifies whether the product comes from an external API (`OpenFoodFacts`) or internal database (`Internal`).
   *   - `currentRoute` (string, required): Identifies the route context (`/home` or `/searched-prod`).
   *
   * @returns {Promise<any[]>} A promise resolving to an array of products matching the applied filters and/or similarity criteria.
   *
   * @throws {Error} If an error occurs during query construction or execution.
   *
   * @note
   * - If `productId` is provided and `productSource` is `Internal`, the function performs a **similarity search** in the database.
   * - If `productId` is provided and `productSource` is `OpenFoodFacts`, the function only applies **filter-based conditions**.
   * - Uses **parameterized placeholders** (e.g., `$filterCategory`, `$filterMinPrice`) to prevent SQL injection.
   */
  async getProductsWithFilters(filters: any): Promise<any[]> {
    const bucketName = this.productsBucket.name;
    const { currentRoute, productId, productSource } = filters;

    if (!Object.keys(filters).length) {
      throw new Error("❌ Filters are empty");
    }

    // Step 1: Get product details if productId is provided and is from Internal DB
    let selectedProduct: any = null;
    if (productId && productSource === "Internal") {
      selectedProduct = await this.getProductById(productId);
    }

    // Step 2: Build similarity conditions
    const similarityClause = selectedProduct
      ? await this.buildSimilarityConditions.call(this, productId)
      : this.buildSimilarityConditionsFromExternalProduct(filters);

    // Step 3: Build filter-based conditions, including brand subqueries
    const filtersClause = await this.buildFilterConditions.call(this, filters);

    // Step 4: Build the final query
    // Check if both conditions are identical and avoid duplicates
    if (similarityClause === filtersClause) {
      console.warn("⚠️ Duplicate conditions detected. Using only one set.");
    }
    const queryWithJoin = this.buildQuery(
      similarityClause,
      filtersClause,
      currentRoute,
      bucketName
    );
    if (!queryWithJoin) return [];

    // Retrieve FK_Brand before building parameters
    let brandFK: string;
    if (filters.brand) {
      brandFK =
        selectedProduct?.FK_Brands ?? (await this.checkBrand(filters.brand));
    }

    // Step 5: Prepare parameters for query execution
    const parameters = {
      category: selectedProduct?.category ?? filters.category,
      tags:
        selectedProduct?.tags?.map((tag) => tag.toLowerCase()) ??
        filters.tags ??
        [],
      minPrice: selectedProduct?.price
        ? selectedProduct.price * 0.8
        : filters.minPrice,
      maxPrice: selectedProduct?.price
        ? selectedProduct.price * 1.2
        : filters.maxPrice,
      brandFK,
      filterCategory: filters.category,
      filterCountry: filters.country,
      filterMinPrice: filters.minPrice,
      filterMaxPrice: filters.maxPrice,
      filterName: filters.name ?? "",
      filterBrand: filters.brand,
      filterTags: filters.tags ?? [],
    };

    // Step 6: Execute query and return results
    try {
      const result = await this.cluster.query(queryWithJoin, { parameters });
      return result.rows.map((row) => row[bucketName]);
    } catch (error) {
      console.error("❌ Error executing query:", error);
      throw new Error(
        "An error occurred while retrieving the filtered products."
      );
    }
  }

  // ========================================================================
  // ======================== USERS FUNCTIONS
  // ========================================================================
  /**
   * @brief Retrieves all users from the database.
   * @returns {Promise<any[]>} Array of users.
   * @throws {InternalServerErrorException} In case of error.
   */
  async getAllUsers(): Promise<any[]> {
    const bucketName = this.usersBucket.name;
    if (!bucketName) {
      throw new Error(
        "❌ USER_BUCKET_NAME is not defined in environment variables."
      );
    }

    const query = `
      SELECT META(u).id as id, u.*
      FROM \`${bucketName}\`._default._default u
      WHERE u.email IS NOT MISSING
      ORDER BY u.createdAt DESC
    `;

    return this.executeQuery(query);
  }

  /**
   * @brief Updates a user's role in the database.
   * @param email User email.
   * @param role New role to be assigned.
   * @returns {Promise<any>} Updated user data.
   */
  async updateUserRole(email: string, role: string): Promise<any> {
    try {
      // Check if the user exists before updating
      const userExists = await this.getUserByEmail(email);
      if (!userExists) {
        console.warn(`⚠️ No user found with email: ${email}`);
        return null;
      }

      // Use the Couchbase API directly to update the document
      const collection = this.getUsersCollection();
      const userId = userExists.id;

      try {
        // Retrieve current document
        const getResult = await collection.get(userId);
        const userDoc = getResult.content;

        // Update role
        userDoc.role = role;
        userDoc.updatedAt = new Date().toISOString();

        // Save updated document
        await collection.replace(userId, userDoc);

        // Retrieve updated user for confirmation
        return await this.getUserByEmail(email);
      } catch (err) {
        console.error(`❌ Error during Couchbase operation: ${err.message}`);
        throw new Error(`Failed to update user role: ${err.message}`);
      }
    } catch (error) {
      console.error(`❌ Error updating role for user ${email}:`, error);
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  /**
   * @brief Updates a user's information in the database.
   * @param email User email.
   * @param userData Object containing fields to update (username, password, address).
   * @returns {Promise<any>} Updated user data.
   */
  async updateUser(email: string, userData: any): Promise<any> {
    try {
      // Check if the user exists before updating
      const userExists = await this.getUserByEmail(email);
      if (!userExists) {
        console.warn(`⚠️ No user found with email: ${email}`);
        return null;
      }

      // Use the Couchbase API directly to update the document
      const collection = this.getUsersCollection();
      const userId = userExists.id;

      try {
        // Retrieve current document
        const getResult = await collection.get(userId);
        const userDoc = getResult.content;

        // Update fields if provided
        if (userData.username) {
          userDoc.username = userData.username;
        }
        if (userData.password) {
          userDoc.password = userData.password;
        }
        if (userData.address) {
          userDoc.address = userData.address;
        }

        // Always update the timestamp
        userDoc.updatedAt = new Date().toISOString();

        // Save updated document
        await collection.replace(userId, userDoc);

        // Retrieve updated user for confirmation
        return await this.getUserByEmail(email);
      } catch (err) {
        console.error(`❌ Error during Couchbase operation: ${err.message}`);
        throw new Error(`Failed to update user: ${err.message}`);
      }
    } catch (error) {
      console.error(`❌ Error updating user ${email}:`, error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * @brief Deletes a user from the database.
   * @param id User ID.
   * @returns {Promise<boolean>} True if deleted, false otherwise.
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const collection = this.getUsersCollection();
      await collection.remove(id);
      return true;
    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        return false;
      }
      console.error("❌ Error deleting user:", error);
      throw new InternalServerErrorException("Error deleting user.");
    }
  }

  /**
   * @brief Adds a new user to the Couchbase database.
   *
   * It also adds timestamps for `createdAt` and `updatedAt` fields to track when the user was created
   * and last updated.
   *
   * @param username The username of the new user.
   * @param email The email of the new user, used as the unique identifier.
   * @param password The password of the new user, stored as plain text (must be hashed before actual usage).
   * @param address The address of the user, containing `postCode`, `city`, and `country`.
   * @param role The role of the new user.
   *
   * @returns A Promise that resolves to the result of the insertion query, or null if the user already exists.
   *
   * @throws InternalServerErrorException If there is an error during the insertion process.
   */
  async addUser(
    username: string,
    email: string,
    password: string,
    address: AddressDto,
    role?: UserRole
  ): Promise<any> {
    const bucketName = this.usersBucket.name;
    const userId = uuidv4();

    const query = `
      INSERT INTO \`${bucketName}\`._default._default (KEY, VALUE)
      VALUES ($userId, {
        "username": $username,
        "email": $email,
        "password": $password,
        "role": $role,
        "createdAt": NOW_STR(),
        "updatedAt": NOW_STR(),
        "address": {
          "postCode": $postCode,
          "city": $city,
          "country": $country
        }
      })
      RETURNING *;
    `;

    const result = await this.executeQuery(query, {
      userId,
      username,
      email,
      password,
      role: role || UserRole.USER,
      postCode: address.postCode,
      city: address.city,
      country: address.country,
    });

    return result.length ? result[0] : null; // Returns `null` if already existing
  }

  /**
   * @brief Retrieves a user from Couchbase by their email.
   *
   * @param {string} email - The email of the user to retrieve.
   * @returns {Promise<any>} - The user details or `null` if not found.
   * @throws {InternalServerErrorException} If an error occurs during retrieval.
   */
  async getUserByEmail(email: string): Promise<any> {
    const query = `
      SELECT META(u).id AS id, u.*
      FROM \`${this.usersBucket.name}\`._default._default u
      WHERE u.email = $email
    `;

    const result = await this.executeQuery(query, { email });
    return result.length ? result[0] : null;
  }

  /**
   * @brief Retrieves all users from the database, excluding SuperAdmins and optionally the current user.
   *
   * @param[in] currentUserEmail (Optional) Email of the currently connected user to exclude.
   * @return Filtered array of users.
   * @throws Error if the retrieval process fails.
   */
  async getFilteredUsers(): Promise<any[]> {
    try {
      // Fetch all users
      const allUsers = await this.getAllUsers();

      // Filter superadmin and current users
      return allUsers.filter((user) => {
        // Exculude superadmin
        if (user.role === "SuperAdmin") {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.error("❌ Error in getFilteredUsers:", error);
      throw new Error("Failed to retrieve filtered users list");
    }
  }

  // ========================================================================
  // ======================== PRODUCTS FUNCTIONS
  // ========================================================================
  /**
   * @brief Adds a new product, handling validation and brand management.
   *
   * @param {any} payload - The product and brand data to be inserted.
   * @returns {Promise<any>} - Resolves if successful, throws an error otherwise.
   */
  async addProduct(payload: any): Promise<any> {
    const { product, newBrand } = payload;

    // Required field validation
    const requiredFields = [
      "name",
      "description",
      "category",
      "tags",
      "ecoscore",
      "origin",
      "source",
      "status",
    ];
    const missingFields = requiredFields.filter((field) => !product[field]);
    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(", ")}`
      );
    }

    // Type validation
    if (!Array.isArray(product.tags)) {
      throw new BadRequestException("❌ 'tags' must be an array of strings.");
    }
    if (product.source !== "Internal") {
      throw new BadRequestException("❌ Cannot add an external product");
    }

    // Check if a similar product exists
    const existingSimilarProduct = await this.findProductByNameAndCateg(
      product.name,
      product.category
    );
    if (existingSimilarProduct) {
      console.warn(
        `⚠ Product similar to '${product.name}' already exists with ID: ${existingSimilarProduct.id}`
      );
      throw new BadRequestException({
        error: `A similar product ('${existingSimilarProduct.name}') already exists with ID: ${existingSimilarProduct.id}`,
        statusCode: 400,
      });
    }

    // Generate a unique ID if necessary
    product.id = product.id || product.barcode || uuidv4();

    // Check if the product exists by ID
    const existingProduct = await this.getProductById(product.id);
    if (existingProduct) {
      throw new BadRequestException({
        error: "Product already exists.",
        statusCode: 400,
      });
    }

    // Handle brand management
    let brandId = product.brand ? await this.checkBrand(product.brand) : null;
    if (!brandId && newBrand) {
      try {
        brandId = await this.addBrand(
          newBrand.name,
          newBrand.description,
          newBrand.status
        );
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw new BadRequestException({
            error: `Brand '${newBrand.name}' already exists.`,
            statusCode: 400,
          });
        }
        throw error;
      }
    }
    product.FK_Brands = brandId || null;
    delete product.brand;

    // Create product with timestamps
    const newProduct = {
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const query = `
      INSERT INTO \`${this.productsBucket.name}\`._default._default (KEY, VALUE)
      VALUES ($productId, $newProduct)
      RETURNING *;
  `;

    const result = await this.executeQuery(query, {
      productId: product.id,
      newProduct,
    });
    return result.length ? result[0] : { error: "Failed to insert product." };
  }

  /**
   * @brief Finds a product by name and category.
   *
   * @param {string} name - The product name.
   * @param {string} category - The product category.
   * @returns {Promise<any | null>} - The product data if found, otherwise null.
   */
  async findProductByNameAndCateg(
    name: string,
    category: string
  ): Promise<any | null> {
    if (!name.trim() || !category.trim()) return null;

    const query = `
      SELECT META(p).id AS id, p.name
      FROM \`${this.productsBucket.name}\`._default._default p
      WHERE LOWER(p.name) = LOWER($name)
      AND LOWER(p.category) = LOWER($category)
      LIMIT 1;
  `;

    const result = await this.executeQuery(query, {
      name: name.trim(),
      category: category.trim(),
    });
    return result?.[0] || null;
  }

  /**
   * @brief Deletes a product by its ID.
   * @param productId The ID of the product to be deleted.
   * @return Promise<any> Resolves if successful, throws an error otherwise.
   */
  async deleteProduct(productId: string): Promise<any> {
    if (!productId) {
      throw new BadRequestException("❌ 'productId' is required.");
    }

    // Check if the product exists
    const existingProduct = await this.getProductById(productId);
    if (!existingProduct) {
      throw new NotFoundException(
        `❌ Product with ID '${productId}' not found.`
      );
    }

    // Delete the product
    const query = `
    DELETE FROM \`${this.productsBucket.name}\`._default._default
    WHERE META().id = $productId
    RETURNING *;
  `;

    const result = await this.executeQuery(query, { productId });
    return result.length ? result[0] : null;
  }

  /**
   * @brief Retrieves all products stored in the database.
   *
   * Executes an N1QL query to fetch all product documents from Couchbase.
   *
   * @returns {Promise<any[]>} An array containing all product records.
   * @throws {Error} If the query execution fails.
   */
  async getAllProductsData(): Promise<any[]> {
    const query = `SELECT * FROM \`${this.productsBucket.name}\``;
    return this.executeQuery(query);
  }

  /**
   * @brief Retrieves a specific product from Couchbase by its ID.
   *
   * @param {string} productId - The ID of the product to retrieve.
   * @returns {Promise<any>} - The product details or `null` if not found.
   * @throws {Error} If the query execution fails.
   */
  async getProductById(productId: string): Promise<any> {
    const query = `
      SELECT META(p).id AS id, p.*
      FROM \`${this.productsBucket.name}\`._default._default p
      WHERE META().id = $productId;
    `;

    const result = await this.executeQuery(query, { productId });
    return result.length ? result[0] : null;
  }

  /**
   * @brief Retrieves products associated with a specific brand.
   *
   * @param {string} brandName - The name of the brand.
   * @returns {Promise<any[]>} - List of products associated with the brand.
   */
  async getProductsByBrand(brandName: string): Promise<any[]> {
    const query = `
    SELECT META(p).id AS productId, p.name AS productName, b.name AS brandName, p.*  
    FROM \`${this.productsBucket.name}\`._default._default p
    JOIN \`${this.brandBucket.name}\`._default._default b ON KEYS p.FK_Brands
    WHERE b.name = $brandName
  `;

    return this.executeQuery(query, { brandName });
  }

  /**
   * @brief Updates a product in the database.
   *
   * @details This function updates an existing product's fields dynamically based on
   * the provided `valueToUpdate` object. It ensures that the bucket exists, required
   * parameters are provided, and the database connection is established before executing
   * the update query.
   *
   * @param {string} productId - The unique ID of the product to update.
   * @param {Record<string, any>} valueToUpdate - An object containing the fields to update.
   *
   * @returns {Promise<any>} - A promise resolving to the updated product data.
   *
   * @throws {Error} If the bucket is not available, required parameters are missing, or an error occurs during execution.
   */
  async updateProduct(
    productId: string,
    valueToUpdate: Record<string, any>
  ): Promise<any> {
    if (
      !productId ||
      !valueToUpdate ||
      Object.keys(valueToUpdate).length === 0
    ) {
      throw new BadRequestException(
        "Invalid parameters: productId and fields to update are required."
      );
    }

    const setClauses = Object.keys(valueToUpdate)
      .map((key) => `${key} = $${key}`)
      .join(", ");

    const query = `
      UPDATE \`${this.productsBucket.name}\`._default._default
      SET ${setClauses}, updatedAt = NOW_STR()
      WHERE META().id = $productId
      RETURNING *;
    `;

    const result = await this.executeQuery(query, {
      productId,
      ...valueToUpdate,
    });
    if (!result.length)
      throw new Error("No product was updated. Check the product ID.");

    return result[0];
  }

  /**
   * @brief Retrieves products based on a specified location.
   *
   * @param location The location to search for products (e.g., city or region).
   * @return A promise resolving to an array of products matching the location.
   *
   * @note If no products are found for the given location, an empty array is returned.
   * @warning Ensure the `origin` field exists in the database schema.
   */
  async getProductByLocation(location: string): Promise<any[]> {
    const lowercaseLocation = location.toLowerCase();

    const query = `
      SELECT META(p).id AS id, p.*
      FROM \`${this.productsBucket.name}\`._default._default p
      WHERE LOWER(p.origin) = $location;
    `;

    const result = await this.executeQuery(query, {
      location: lowercaseLocation,
    });

    if (result.length === 0) {
      return [];
    }

    // Add default "source" field for products without one
    return result.map((product) => {
      if (!product.source) {
        return { ...product, source: "Internal" };
      }
      return product;
    });
  }
  // ========================================================================
  // ======================== BRANDS FUNCTIONS
  // ========================================================================
  /**
   * @brief Checks if a brand exists in the database.
   *
   * @param {string} brandName - The brand name to check.
   * @returns {Promise<string | null>} - The brand ID if found, otherwise null.
   */
  async checkBrand(brandName: string): Promise<string | null> {
    if (!brandName.trim()) return null;

    const query = `
      SELECT META(b).id AS id 
      FROM \`${this.brandBucket.name}\`._default._default b 
      WHERE LOWER(b.name) = LOWER($brandName)
      LIMIT 1;
  `;

    const result = await this.executeQuery(query, {
      brandName: brandName.trim(),
    });
    return result?.[0]?.id || null;
  }

  /**
   * @brief Adds a new brand to the database if it does not already exist.
   *
   * @param {string} brandName - The brand name.
   * @param {string} brandDescription - The brand description.
   * @param {string} [status] - Optional brand status.
   *
   * @returns {Promise<string>} - The ID of the created brand.
   *
   * @throws {BadRequestException} - If the brand already exists.
   */
  async addBrand(
    brandName: string,
    brandDescription: string,
    status: string = ""
  ): Promise<string> {
    if (!brandName.trim()) {
      throw new BadRequestException("❌ Brand name is required.");
    }

    const existingBrandId = await this.checkBrand(brandName);
    if (existingBrandId) {
      console.warn(
        `⚠ Brand '${brandName}' already exists with ID: ${existingBrandId}`
      );
      throw new BadRequestException(`Brand '${brandName}' already exists.`);
    }

    const brandId = uuidv4();
    const newBrand = {
      id: brandId,
      name: brandName.trim(),
      description: brandDescription?.trim() || "",
      status: status.trim(),
      createdAt: new Date().toISOString(),
    };

    const query = `
        INSERT INTO \`${this.brandBucket.name}\`._default._default (KEY, VALUE)
        VALUES ($brandId, $newBrand)
        RETURNING META().id AS id;
    `;

    const result = await this.executeQuery(query, { brandId, newBrand });
    return result?.[0]?.id || brandId;
  }

  /**
   * @brief Retrieves all available brands.
   * @return Promise<{ id: string; name: string }[]> List of brands.
   */
  async getAllBrand(): Promise<{ id: string; name: string }[]> {
    const query = `
      SELECT META(b).id AS id, b.name AS name 
      FROM \`${this.brandBucket.name}\`._default._default b 
      ORDER BY b.name;
    `;

    return this.executeQuery(query);
  }

  /**
   * @brief Retrieves a brand by its ID.
   *
   * @details Queries the database to fetch a brand based on its unique identifier.
   *
   * @param {string} brandId - The unique ID of the brand.
   * @returns {Promise<any>} - The brand data if found, otherwise `null`.
   */
  async getBrandById(brandId: string): Promise<any> {
    const query = `
    SELECT META(b).id AS id, b.*
    FROM \`${this.brandBucket.name}\`._default._default b
    WHERE META(b).id = $brandId
  `;

    const result = await this.executeQuery(query, { brandId });
    return result.length ? result[0] : null;
  }

  /**
   * @brief Deletes a brand from the database.
   *
   * @details Ensures the brand exists before deletion. If not found, it throws an error.
   *
   * @param {string} brandId - The unique ID of the brand to delete.
   * @returns {Promise<any>} - The deleted brand data if successful.
   *
   * @throws {BadRequestException} If `brandId` is empty.
   * @throws {NotFoundException} If the brand does not exist.
   */
  async deleteBrand(brandId: string): Promise<any> {
    if (!brandId) {
      throw new BadRequestException("❌ 'brandId' is required.");
    }

    // Check if the brand exists
    const existingBrand = await this.getBrandById(brandId);
    if (!existingBrand) {
      throw new NotFoundException(`❌ Brand with ID '${brandId}' not found.`);
    }

    // Delete the brand
    const query = `
    DELETE FROM \`${this.brandBucket.name}\`._default._default
    WHERE META().id = $brandId
    RETURNING *;
  `;

    const result = await this.executeQuery(query, { brandId });
    if (!result.length) {
      throw new Error(`❌ Failed to delete brand with ID '${brandId}'.`);
    }

    return result[0];
  }

  /**
   * @brief Updates a brand in the database.
   *
   * @details Checks if the brand exists before applying updates. The update
   * dynamically modifies only the provided fields while maintaining other data.
   *
   * @param {string} brandId - The unique ID of the brand to update.
   * @param {Record<string, any>} valueToUpdate - The fields to update.
   * @returns {Promise<any>} - The updated brand data.
   *
   * @throws {BadRequestException} If `brandId` or `valueToUpdate` is empty.
   * @throws {NotFoundException} If the brand does not exist.
   */
  async updateBrand(
    brandId: string,
    valueToUpdate: Record<string, any>
  ): Promise<any> {
    if (!brandId || !valueToUpdate || Object.keys(valueToUpdate).length === 0) {
      throw new BadRequestException(
        "Invalid parameters: brandId and fields to update are required."
      );
    }

    // Check if the brand exists before updating
    const existingBrand = await this.getBrandById(brandId);
    if (!existingBrand) {
      throw new NotFoundException(`❌ Brand with ID '${brandId}' not found.`);
    }

    // Construct the dynamic update query
    const setClauses = Object.keys(valueToUpdate)
      .map((key) => `${key} = $${key}`)
      .join(", ");

    const query = `
    UPDATE \`${this.brandBucket.name}\`._default._default
    SET ${setClauses}, updatedAt = NOW_STR()
    WHERE id = $brandId
    RETURNING *;
  `;

    const result = await this.executeQuery(query, {
      brandId,
      ...valueToUpdate,
    });
    if (!result.length) {
      throw new Error(`❌ No brand was updated. Check the brand ID.`);
    }

    return result[0];
  }

  // ========================================================================
  // ======================== CATEGORY FUNCTIONS
  // ========================================================================
  /**
   * @function getAllCategoryName
   * @description Retrieves all category names from the Couchbase database
   * @details This function executes a N1QL query to fetch all category names.
   * It includes enhanced error handling and logging to diagnose connection issues.
   *
   * @returns {Promise<any[]>} A promise that resolves with an array of category names or empty array on error
   */
  async getAllCategoryName(): Promise<any[]> {
    const categBucketName = this.categBucket.name;
    if (!categBucketName) {
      throw new Error(
        "❌ CATEGORY_BUCKET_NAME not defined in environment variables"
      );
    }

    const query = `
      SELECT DISTINCT c.name
      FROM \`${categBucketName}\`._default._default c
      ORDER BY c.name
    `;

    return this.executeQuery(query);
  }

  /**
   * @brief Retrieves products by category.
   * @param category The category name to fetch products for.
   * @returns {Promise<any[]>} A promise resolving to an array of products.
   */
  getProductByCategory(category: string): Promise<any[]> {
    const query = `
      SELECT 
        META(p).id AS id,
        p.*,
        COALESCE(b.name, "Marque inconnue") AS brand
      FROM \`${this.productsBucket.name}\`._default._default p
      LEFT JOIN \`${this.brandBucket.name}\`._default._default b
      ON p.FK_Brands = META(b).id
      WHERE p.category = $category
    `;

    return this.executeQuery(query, { category });
  }

  // ========================================================================
  // ======================== COMMENTS FUNCTIONS
  // ========================================================================
  /**
   * Adds a new comment to the database.
   *
   * @param {CommentDto} comment - The comment data to be added.
   * @returns {Promise<any>} - A promise resolving with a success message and the created comment.
   * @throws {BadRequestException} - If any required field is missing.
   * @throws {InternalServerErrorException} - If there is an error accessing the database or inserting the comment.
   */
  async addComment(comment: CommentDto): Promise<any> {
    // Check that all required fields are provided
    if (
      !comment.contentCom ||
      !comment.dateCom ||
      !comment.userRatingCom ||
      !comment.userId ||
      !comment.productId ||
      !comment.source
    ) {
      throw new BadRequestException("❌ All comment fields must be filled.");
    }

    // Retrieve the comments bucket from the Couchbase cluster
    const commentsBucket = this.cluster.bucket(
      process.env.COMMENTS_BUCKET_NAME
    );
    if (!commentsBucket) {
      throw new InternalServerErrorException(
        "❌ COMMENTS_BUCKET_NAME is not defined in environment variables."
      );
    }

    // Get the default collection from the bucket
    const collection = commentsBucket.defaultCollection();

    // Create a new comment object with a unique ID
    const newComment = {
      id: uuidv4(), // Generate a unique ID
      dateCom: comment.dateCom,
      contentCom: comment.contentCom,
      userRatingCom: comment.userRatingCom,
      userId: comment.userId,
      productId: comment.productId,
      source: comment.source,
    };

    try {
      // Insert the new comment into the database
      await collection.insert(newComment.id, newComment);
      return { message: "Comment successfully added", comment: newComment };
    } catch (error) {
      console.error("❌ Error while adding the comment:", error);
      throw new InternalServerErrorException("Error while adding the comment.");
    }
  }

  /**
   * @brief Updates an existing comment in the Couchbase database.
   *
   * @param id The ID of the comment to update.
   * @param comment The updated CommentDto object to store.
   * @returns A success message and the updated comment object.
   * @throws InternalServerErrorException if the update fails.
   */
  async updateComment(id: string, comment: CommentDto): Promise<any> {
    const commentsBucket = this.cluster.bucket(
      process.env.COMMENTS_BUCKET_NAME
    );
    const collection = commentsBucket.defaultCollection();

    try {
      // Update the comment in the database
      await collection.replace(id, comment);
      return { message: "Comment successfully updated", comment };
    } catch (error) {
      console.error("❌ Error while updating the comment:", error);
      throw new InternalServerErrorException(
        "Error while updating the comment."
      );
    }
  }

  /**
   * @brief Deletes an existing comment from the Couchbase database.
   *
   * @param id The ID of the comment to delete.
   * @returns A success message indicating the comment was deleted.
   * @throws InternalServerErrorException if the deletion fails.
   */
  async deleteComment(id: string): Promise<any> {
    const commentsBucket = this.cluster.bucket(
      process.env.COMMENTS_BUCKET_NAME
    );
    const collection = commentsBucket.defaultCollection();

    try {
      // Delete the comment from the database
      await collection.remove(id);
      return { message: "Comment successfully deleted" };
    } catch (error) {
      console.error("❌ Error while deleting the comment:", error);
      throw new InternalServerErrorException(
        "Error while deleting the comment."
      );
    }
  }

  /**
   * @brief Retrieves all comments for a specific product from the database.
   *
   * This method interacts with the database to fetch all comments for a given product,
   * ordered by the comment date in descending order. It does not apply pagination.
   * If there is an error during the database query, an exception is thrown.
   *
   * @param {string} productId - The ID of the product for which comments are retrieved.
   * @returns {Promise<any[]>} A promise containing an array of comments for the specified product.
   * @throws {Error} If an error occurs while querying the database for the comments.
   */
  async getProductComments(productId: string): Promise<any[]> {
    const commentsBucketName = this.commentsBucket.name;
    if (!commentsBucketName) {
      throw new Error(
        "❌ COMMENTS_BUCKET_NAME not defined in environment variables"
      );
    }

    // Query to get all comments for this product (no pagination)
    const query = `
    SELECT META().id as id, c.* 
    FROM \`${commentsBucketName}\` c
    WHERE c.productId = $productId 
    ORDER BY c.dateCom DESC
  `;

    try {
      // Execute the query to fetch all comments for the product
      const comments = await this.executeQuery(query, { productId });
      return comments;
    } catch (error) {
      console.error(
        `❌ Error retrieving comments for product ${productId}:`,
        error
      );
      throw new Error(`Error retrieving comments for product ${productId}`);
    }
  }

  /**
   * @brief Retrieves the total count of comments for a specific product from the comments bucket.
   *
   * @param {string} productId - The ID of the product for which the comment count is retrieved.
   * @returns {Promise<number>} A promise that resolves to the total comment count for the specified product.
   * @throws {Error} If the comments bucket name is not defined in the environment variables or if an error occurs while executing the query.
   */
  async getCommentsCount(productId: string): Promise<number> {
    const commentsBucketName = this.commentsBucket.name;
    if (!commentsBucketName) {
      throw new Error(
        "❌ COMMENTS_BUCKET_NAME not defined in environment variables"
      );
    }

    // Query to count the total number of comments for the product
    const countQuery = `
    SELECT COUNT(*) AS total 
    FROM \`${commentsBucketName}\` 
    WHERE productId = "${productId}"
  `;

    try {
      // Execute the query to count the comments
      const result = await this.executeQuery(countQuery);

      // Extract the total count from the result
      const totalCount = result[0]?.total || 0;

      return totalCount;
    } catch (error) {
      console.error(
        `❌ Error retrieving comments count for product ${productId}:`,
        error
      );
      throw new Error(
        `Error retrieving comments count for product ${productId}`
      );
    }
  }

  /**
   * @brief Retrieves the average rating for a specific product from the Couchbase database.
   *
   * @param productId - The ID of the product whose average rating should be calculated.
   * @returns A promise resolving to the average rating rounded to two decimal places.
   *          Returns 0 if no comments are found.
   * @throws Error if an issue occurs during query execution or if the bucket name is missing.
   */
  async getAverageRating(productId: string): Promise<number> {
    const commentsBucketName = this.commentsBucket.name;
    if (!commentsBucketName) {
      throw new Error(
        "❌ COMMENTS_BUCKET_NAME not defined in environment variables"
      );
    }

    // Query to calculate the average score using parameterized query
    const avgQuery = `
    SELECT AVG(TO_NUMBER(userRatingCom)) AS averageRating
    FROM \`${commentsBucketName}\`
    WHERE productId = $productId
  `;

    try {
      const result = await this.executeQuery(avgQuery, { productId });

      // Extract average (may be null if no comments)
      const average = result[0]?.averageRating ?? 0;

      return Number(average.toFixed(2)); // Rounded to 2 decimal places
    } catch (error) {
      console.error(
        `❌ Error retrieving average rating for product ${productId}:`,
        error
      );

      // Check if the error is a timeout
      if (error.message?.includes('timeout')) {
        throw new Error(
          `Query timeout while retrieving average rating for product ${productId}. Please try again.`
        );
      }

      throw new Error(
        `Error retrieving average rating for product ${productId}`
      );
    }
  }

  // ========================================================================
  // ======================== REQUESTS FUNCTIONS (FOR ADMIN MANAGEMENT)
  // ========================================================================
  /**
   * @brief Retrieves product requests with associated brand names.
   *
   * This function fetches product data from the products bucket and associates
   * them with their respective brands from the brands bucket using a LEFT JOIN.
   * Only products with specific statuses ("add-product", "edit-product", "delete-product")
   * are retrieved.
   *
   * @return {Promise<any[]>} - A promise that resolves to an array of product requests.
   * @throws {InternalServerErrorException} - If an error occurs during retrieval.
   */
  async getRequests(): Promise<any[]> {
    // Fetch all the waiting products
    const productQuery = `
      SELECT 
          META(p).id AS id,
          p.*,
          COALESCE(b.name, "Unknown Brand") AS FK_Brands
      FROM \`${this.productsBucket.name}\`._default._default p
      LEFT JOIN \`${this.brandBucket.name}\`._default._default b
      ON p.FK_Brands = META(b).id
      WHERE p.status IN ["add-product", "edit-product", "delete-product"]
    `;
    // Fetch all the waiting brands
    const brandQuery = `
      SELECT 
          META(b).id AS id,
          b.* 
      FROM \`${this.brandBucket.name}\`._default._default b
      WHERE b.status = "add-brand"
    `;

    // Run both requests in parallel
    const [productRequests, brandRequests] = await Promise.all([
      this.executeQuery(productQuery),
      this.executeQuery(brandQuery),
    ]);
    // Merge results into a single array
    return [...productRequests, ...brandRequests];
  }

  /**
   * @brief Updates an entity (product or brand) using existing update functions.
   *
   * @details This method determines whether the entity is a product or brand
   * and calls the corresponding update function.
   *
   * @param {string} type - The type of entity to update ("product" or "brand").
   * @param {string} entityId - The unique identifier of the entity.
   * @param {Record<string, any>} valueToUpdate - The fields to update.
   *
   * @returns {Promise<any>} - The updated entity.
   *
   * @throws {BadRequestException} If the entity type is invalid or parameters are missing.
   */
  async updateEntity(
    type: string,
    entityId: string,
    valueToUpdate: Record<string, any>
  ): Promise<any> {
    if (
      !entityId ||
      !valueToUpdate ||
      Object.keys(valueToUpdate).length === 0
    ) {
      throw new BadRequestException(
        `❌ Invalid parameters: ${type} ID and fields to update are required.`
      );
    }

    // Determine which entity type to update
    switch (type) {
      case "product":
        return this.updateProduct(entityId, valueToUpdate);
      case "brand":
        return this.updateBrand(entityId, valueToUpdate);
      default:
        throw new BadRequestException(`❌ Invalid entity type: ${type}`);
    }
  }

  /**
   * @brief Deletes an entity (product or brand) using existing delete functions.
   *
   * @details This method determines whether the entity is a product or brand
   * and calls the corresponding delete function.
   *
   * @param {string} type - The type of entity to delete ("product" or "brand").
   * @param {string} entityId - The unique identifier of the entity.
   *
   * @returns {Promise<any>} - The deleted entity.
   *
   * @throws {BadRequestException} If the entity type is invalid or the ID is missing.
   */
  async deleteEntity(type: string, entityId: string): Promise<any> {
    if (!entityId) {
      throw new BadRequestException(
        `❌ Invalid parameters: ${type} ID is required.`
      );
    }
    // Determine which entity type to delete
    switch (type) {
      case "product":
        return this.deleteProduct(entityId);
      case "brand":
        try {
          // First get the brand to access its name
          const brand = await this.getBrandById(entityId);
          if (!brand) {
            console.warn(
              `⚠️ Brand with ID '${entityId}' not found. Nothing to delete.`
            );
            return {
              message: `Brand with ID '${entityId}' does not exist or was already deleted.`,
            };
          }

          const brandName = brand.name;
          // Get all products associated with this brand name
          const productsByBrand = await this.getProductsByBrand(brandName);
          if (productsByBrand.length > 0) {
            // Update each product's status to 'edit-product'
            let updatedCount = 0;
            for (const product of productsByBrand) {
              // Use the productId field
              const productId = product.productId;

              if (!productId) {
                console.error(`❌ Missing productId for product:`, product);
                continue;
              }
              try {
                await this.updateProduct(productId, { status: "edit-product" });
                updatedCount++;
              } catch (error) {
                console.error(
                  `❌ Failed to update product ${productId}: ${error.message}`
                );
              }
            }
          } else {
            console.warn(
              `ℹNo products found associated with brand "${brandName}"`
            );
          }

          // Now delete the brand
          return this.deleteBrand(entityId);
        } catch (error) {
          console.error(`❌ Error deleting brand: ${error.message}`, error);
          throw error;
        }
      default:
        throw new BadRequestException(`❌ Invalid entity type: ${type}`);
    }
  }

  // ========================================================================
  // ======================== FAVORITES FUNCTIONS
  // ========================================================================

  /**
   * @brief Adds a product to a user's favorites.
   *
   * @param userId The ID of the user.
   * @param productId The ID of the product to add to favorites.
   * @returns {Promise<any>} A promise resolving to the created favorite entry.
   */
  async addToFavorites(userId: string, productId: string): Promise<any> {
    try {
      const favoriteId = `favorite::${userId}::${productId}`;
      const favoritesCollection = this.getFavoritesCollection();

      // Check if the favorite already exists
      try {
        await favoritesCollection.get(favoriteId);
        return { id: favoriteId, exists: true };
      } catch (error) {
        if (!(error instanceof DocumentNotFoundError)) {
          throw error;
        }
      }

      // Check if the product already exists
      const productExists = await this.getProductById(productId);
      if (!productExists) {
        throw new NotFoundException(`Produit avec ID ${productId} non trouvé`);
      }

      // Create a simple favorite document without including all product details
      const favorite = {
        type: "favorite",
        userId,
        productId,
        createdAt: new Date().toISOString(),
      };

      await favoritesCollection.insert(favoriteId, favorite);

      return { id: favoriteId, ...favorite, exists: false };
    } catch (error) {
      console.error("❌ Error adding to favorites:", error);
      throw new InternalServerErrorException(
        "Error adding product to favorites"
      );
    }
  }

  /**
   * @brief Removes a product from a user's favorites.
   *
   * @param userId The ID of the user.
   * @param productId The ID of the product to remove from favorites.
   * @returns {Promise<boolean>} A promise resolving to true if the favorite was removed.
   */
  async removeFromFavorites(
    userId: string,
    productId: string
  ): Promise<boolean> {
    try {
      const favoriteId = `favorite::${userId}::${productId}`;
      const favoritesCollection = this.getFavoritesCollection();

      await favoritesCollection.remove(favoriteId);
      return true;
    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        return false;
      }
      console.error("❌ Error removing from favorites:", error);
      throw new InternalServerErrorException(
        "Error removing product from favorites"
      );
    }
  }

  /**
   * @brief Gets all favorites for a user.
   *
   * @param userId The ID of the user.
   * @returns {Promise<any[]>} A promise resolving to an array of favorite products.
   */
  async getUserFavorites(userId: string): Promise<any[]> {
    try {
      // Vérifier que l'ID utilisateur est défini
      if (!userId) {
        console.error(
          "❌ getUserFavorites appelé avec un ID utilisateur undefined"
        );
        return []; // Retourner un tableau vide plutôt que de lancer une erreur
      }

      // Requête optimisée avec USE KEYS pour la performance
      const query = `
        SELECT 
          f.userId, 
          f.productId, 
          f.createdAt,
          p.* 
        FROM \`${process.env.FAVORITES_BUCKET_NAME}\` f
        JOIN \`${process.env.BUCKET_NAME}\` p ON KEYS f.productId
        WHERE f.type = 'favorite' AND f.userId = $userId
        ORDER BY f.createdAt DESC
      `;

      const result = await this.executeQuery(query, { userId });
      return result;
    } catch (error) {
      console.error("❌ Error getting user favorites:", error);
      throw new InternalServerErrorException("Error retrieving user favorites");
    }
  }

  /**
   * @brief Checks if a product is in a user's favorites.
   *
   * @param userId The ID of the user.
   * @param productId The ID of the product to check.
   * @returns {Promise<boolean>} A promise resolving to true if the product is in favorites.
   */
  async isProductInFavorites(
    userId: string,
    productId: string
  ): Promise<boolean> {
    try {
      if (!userId || !productId) {
        console.error(
          "❌ isProductInFavorites appelé avec des paramètres invalides:",
          { userId, productId }
        );
        return false;
      }

      const favoriteId = `favorite::${userId}::${productId}`;

      // Efficient method with EXISTS to quickly check if the document exists
      const query = `
        SELECT EXISTS (
          SELECT 1 
          FROM \`${process.env.FAVORITES_BUCKET_NAME}\` 
          WHERE META().id = $favoriteId
        ) AS exists
      `;

      const result = await this.executeQuery(query, { favoriteId });
      return result[0]?.exists ? true : false;
    } catch (error) {
      console.error("❌ Error checking favorites status:", error);
      throw new InternalServerErrorException(
        "Error checking if product is in favorites"
      );
    }
  }
}
