/**
 * @file admin.controller.ts
 * @brief Controller for administrative operations.
 * @details This controller handles various administrative operations such as 
 * user management, product request retrieval, and role management.
 * Authentication guards ensure that only authorized administrators can access these endpoints.
 * @brief Controller for administrative operations.
 * @details This controller handles various administrative operations such as 
 * user management, product request retrieval, and role management.
 * Authentication guards ensure that only authorized administrators can access these endpoints.
 */

import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  Patch,
  Delete,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  Put,
  NotFoundException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UsersService } from "../users/users.service";
import { UserRole } from "src/auth/enums/roles.enum";
import { AdminService } from "./admin.service";
import { DatabaseService } from "src/database/database.service";

/**
 * @brief Controller responsible for administrative operations.
 * @details This controller is secured with authentication and role-based authorization.
 * It provides endpoints for managing users and handling product requests.
 * @brief Controller responsible for administrative operations.
 * @details This controller is secured with authentication and role-based authorization.
 * It provides endpoints for managing users and handling product requests.
 */
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminController {


  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private adminService: AdminService,
    private readonly databaseService: DatabaseService,
  ) { }

  /**
   * @brief Retrieves all users from the database.
   * @details This endpoint fetches a list of all registered users.
   *
   * @param {any} request - The request object containing user authentication details.
   * @returns {Promise<any[]>} A list of registered users.
   * @throws {HttpException} If an error occurs while retrieving users.
   */
  @Get("users")
  async getAllUsers(@Req() request: any): Promise<any[]> {
    try {
      // Get all the users from de DB
      const users = await this.usersService.findAll();

      if (!users || users.length === 0) {
        console.warn("⚠️ No users found.");
        return [];
      }

      return users;
    } catch (error) {
      console.error(`❌ Error in getAllUsers: ${error.message}`);
      throw new HttpException(
        `Failed to retrieve users: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * @brief Updates a user's role.
   * @details This endpoint updates the role of a specific user.
   * @details This endpoint updates the role of a specific user.
   *
   * @param {string} id - The ID of the user to update.
   * @param {UserRole} role - The new role to assign to the user.
   * @returns {Promise<Object>} The updated user object.
   * @throws {HttpException} If an error occurs during role update.
   * @throws {HttpException} If an error occurs during role update.
   */
  @Put("users/:email/role")
  async updateUserRole(
    @Param("email") email: string,
    @Body("role") role: string
  ) {
    // Decode the email (convert %40 to @ and other encoded characters)
    const decodedEmail = decodeURIComponent(email);

    // Check if the email is valid
    if (!decodedEmail) {
      throw new BadRequestException("Email is required");
    }

    // Check if the role is valid
    if (!role) {
      throw new BadRequestException("Role is required");
    }

    // Validate if the role is a valid value from the UserRole enumeration
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role as UserRole)) {
      throw new BadRequestException(`Invalid role. Valid roles are: ${validRoles.join(', ')}`);
    }

    try {
      return await this.usersService.updateRole(decodedEmail, role as UserRole);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new HttpException(
        `Error updating user role: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  /**
   * @brief Deletes a user from the database.
   * @details This endpoint removes a user identified by their ID from the database.
   *
   * @param {string} id - The ID of the user to delete.
   * @returns {Promise<Object>} A success message if deletion is successful.
   * @throws {HttpException} If an error occurs during deletion.
   */
  @Delete("users/:email")
  async deleteUser(@Param("email") email: string) {
    try {
      return await this.usersService.delete(email);
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      throw new HttpException(
        "Error deleting user",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @brief Retrieves product requests requiring administrative review.
   * @details This endpoint fetches product requests that require an admin's review 
   * (e.g., product additions, edits, or deletions).
   * 
   * @returns {Promise<any[]>} A list of product requests.
   * @throws {HttpException} If an error occurs during retrieval.
   */
  @Get('getRequests')
  async getRequestsProduct() {
    try {
      const requests = await this.adminService.getRequestsProduct();

      if (!requests || requests.length === 0) {
        console.warn("⚠️ No product requests found.");
        return [];
      }

      return requests;
    } catch (error) {
      console.error('❌ Error retrieving product requests:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * @brief Updates an entity (product or brand) through an API endpoint.
   * 
   * @details This endpoint updates an entity in the database by calling the `AdminService.updateEntity()` method.
   * If the entity ID or update fields are missing, it returns a `BAD_REQUEST` error.
   * 
   * @route PATCH /updateEntity/:type/:id
   * 
   * @param {string} type - The type of entity to update ("product" or "brand"), extracted from URL parameters.
   * @param {string} id - The unique identifier of the entity, extracted from URL parameters.
   * @param {Record<string, any>} valueToUpdate - The fields to update, provided in the request body.
   * 
   * @returns {Promise<any>} - The updated entity.
   * 
   * @throws {HttpException} - If required parameters are missing (`BAD_REQUEST`) or if an internal server error occurs.
   */
  @Patch('updateEntity/:type/:id')
  async updateEntity(
    @Param("type") type: string,
    @Param("id") id: string,
    @Body() valueToUpdate: Record<string, any>
  ) {
    try {
      if (!id || Object.keys(valueToUpdate).length === 0) {
        throw new HttpException("Entity ID and at least one field to update are required", HttpStatus.BAD_REQUEST);
      }

      // Call the generic service method to update the entity
      const updatedEntity = await this.adminService.updateEntity(type, id, valueToUpdate);
      return updatedEntity;
    } catch (error) {
      console.error(`❌ Error updating ${type}:`, error);
      throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @brief Retrieves all available user roles.
   * @details This endpoint returns a list of all possible user roles in the system.
   *
   * @returns {UserRole[]} An array of all available user roles.
   */
  @Get("roles")
  getAllRoles(): string[] {
    const roles = Object.values(UserRole);
    return roles;
  }

  /**
   * @brief Retrieves the role of the currently authenticated user.
   * @details This endpoint returns the user's role based on their JWT token.
   *
   * @param[in] request The request object containing authentication details.
   * @return The user's role.
   */
  @Get("currentUserRole")
  getCurrentUserRole(@Req() request: any): { role: string } {
    const userRole = request.user?.role;
    return { role: userRole };
  }

  /**
   * @brief Route de test pour vérifier la connexion Couchbase.
   * @details Cette route contourne les gardes d'authentification pour tester directement 
   * la connexion à Couchbase et les requêtes de base.
   * ATTENTION: À utiliser uniquement pour le débogage et à retirer après résolution du problème.
   * 
   * @returns Informations sur la connexion Couchbase et les données de test.
   */
  @Get("test-connection")
  @UseGuards() // Désactive tous les gardes précédents pour cette route
  async testCouchbaseConnection() {
    try {
      // 1. Afficher les informations de connexion
      const connectionInfo = {
        host: process.env.DB_HOST,
        userBucket: process.env.USER_BUCKET_NAME,
        certPath: process.env.SSL_CERT_PATH,
      };

      // 2. Tester l'accès au bucket utilisateurs avec des données statiques
      const testUsers = [
        { id: "test1", username: "Test User 1", email: "test1@example.com", role: "User" },
        { id: "test2", username: "Test User 2", email: "test2@example.com", role: "Admin" }
      ];

      // 3. Tenter de récupérer les 3 premiers utilisateurs de Couchbase
      let realUsers: any[] = [];
      let error = null;
      try {
        // Définir un timeout pour éviter que la requête ne bloque trop longtemps
        const timeoutPromise = new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout lors de la récupération des utilisateurs")), 5000)
        );

        const usersResult = await Promise.race<any[]>([
          this.databaseService.getAllUsers(),
          timeoutPromise
        ]);

        realUsers = usersResult || [];

        // Limiter à 3 utilisateurs pour la sécurité des données
        if (realUsers.length > 3) {
          realUsers = realUsers.slice(0, 3).map(user => ({
            id: user.id,
            email: user.email,
            role: user.role
          }));
        }
      } catch (e) {
        error = {
          message: e.message,
          stack: e.stack
        };
      }

      return {
        connectionInfo,
        testUsers,
        realUsers: realUsers || [],
        error,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ Erreur lors du test de connexion:", error);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
  }
}
