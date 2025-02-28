/**
 * @file openFoodFacts.service.ts
 * @brief Service for interacting with the Open Food Facts API.
 */

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

/**
 * @class OpenFoodFactsService
 * @brief Handles all interactions with the Open Food Facts API.
 */
@Injectable()
export class OpenFoodFactsService {
  /**
   * @constructor
   * @param httpService HTTP service injected for making external API calls.
   */
  constructor(private readonly httpService: HttpService) { }

  // ========================================================================
  // ======================== PRODUCT SEARCH FUNCTIONS ======================
  // ========================================================================

  /**
   * @brief Searches for products by name.
   * @param name The name of the product to search for.
   * @param page The page number for paginated results (default: 1).
   * @param pageSize The number of results per page (default: 20).
   * @returns {Promise<any>} The search result data from Open Food Facts.
   */
  async searchProductsByName(name: string, page: number = 1, pageSize: number = 20): Promise<any> {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&page=${page}&page_size=${pageSize}&search_simple=1&action=process&json=1`;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      throw new HttpException("Error searching products in OpenFoodFacts", HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * @brief Retrieves product details by product code.
   * @param code The barcode or product code.
   * @returns {Promise<any>} The product details if found.
   */
  async getProductByCode(code: string): Promise<any> {
    const url = `https://world.openfoodfacts.org/api/v0/product/${code}.json`;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data.product;
    } catch (error) {
      throw new HttpException("Product not found on Open Food Facts.", HttpStatus.NOT_FOUND);
    }
  }

  // ========================================================================
  // ======================== SIMILAR PRODUCTS SEARCH =======================
  // ========================================================================

  /**
   * @brief Searches for similar products based on given criteria.
   */
  async searchSimilarProducts(
    criteria: { category?: string; productSource?: string; tags?: string[]; productName?: string },
    page: number = 1,
    pageSize: number = 50
  ): Promise<any[]> {
    try {
      const { category, productSource, tags, productName } = criteria;
      if (!category) throw new HttpException("No category provided for search.", HttpStatus.BAD_REQUEST);

      const baseUrl = "https://fr.openfoodfacts.org/cgi/search.pl?";
      const categoriesToSearch = this.normalizeAndFilterTags(category.split(","), 5);
      const searchTags = this.normalizeAndFilterTags(tags, 5);

      let searchRequests = [];
      // Different research depending on productSource 
      switch (productSource) {
        case 'Internal':
          searchRequests.push(...this.createSearchRequests(searchTags, "tags", page, pageSize, baseUrl));
          break;
        default:
          searchRequests.push(...this.createSearchRequests(categoriesToSearch, "categories", page, pageSize, baseUrl));
          break;

      }

      const categoryResults = await this.executeRequestsInBatches(searchRequests, 2);
      return categoryResults.flat().slice(0, 20);
    } catch (error) {
      throw new HttpException("Error fetching similar products from Open Food Facts.", HttpStatus.BAD_GATEWAY);
    }
  }

  // ========================================================================
  // ======================== UTILITIES FUNCTIONS ===========================
  // ========================================================================

  /**
   * @brief Normalize and filter a list of tags/categories.
   */
  private normalizeAndFilterTags(tags: string[] = [], limit: number): string[] {
    const stopWords = new Set(["de", "mon", "la", "dans", "et", "le", "les", "des", "du", "au", "aux", "une", "un"]);
    return tags.slice(0, limit).map(tag => tag.toLowerCase().trim()).filter(tag => tag && !stopWords.has(tag));
  }

  /**
   * @brief Generate category or tag-based search requests.
   */
  private createSearchRequests(tags: string[], type: string, page: number, pageSize: number, baseUrl: string): (() => Promise<any[]>)[] {
    return tags.map((tag, index) => async () => {
      const query = `action=process&tagtype_${index}=${type}&tag_contains_${index}=contains&tag_${index}=${encodeURIComponent(tag)}&page=${page}&page_size=${pageSize}&json=true`;
      const url = `${baseUrl}${query}`;
      return this.fetchProducts(url);
    });
  }

  /**
   * @brief Fetch products from Open Food Facts API.
   */
  private async fetchProducts(url: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data?.products || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * @brief Executes API requests in batches to avoid rate-limiting issues.
   */
  private async executeRequestsInBatches(requests: (() => Promise<any[]>)[], batchSize: number): Promise<any[]> {
    let results: any[] = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(req => req()));
      results = results.concat(batchResults.flat());
      if (i + batchSize < requests.length) {
        await new Promise(res => setTimeout(res, 500));
      }
    }
    return results;
  }
}