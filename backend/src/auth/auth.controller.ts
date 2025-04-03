/**
 * @file auth.controller.ts
 * @brief Controller for handling authentication requests.
 *
 * This controller provides endpoints for user authentication,
 * including registration, login, and retrieving the authenticated user's profile.
 * It interacts with the AuthService to perform authentication operations.
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { Roles } from "./decorators/roles.decorator";
import { UserRole } from "./enums/roles.enum";
import { RolesGuard } from "./guards/roles.guard";

/**
 * @brief Controller for authentication-related endpoints.
 */
@Controller("auth")
export class AuthController {
  /**
   * @brief Constructor for AuthController.
   * @param {AuthService} authService - Service for handling authentication operations.
   */
  constructor(private authService: AuthService) { }

  /**
   * @brief Registers a new user.
   *
   * This endpoint allows a user to create an account by providing an email, a username and password.
   * The password is securely hashed before being stored in the database.
   *
   * @param {RegisterDto} body - The request body containing user credentials.
   * @returns {Promise<any>} The created user object.
   * @throws {UnauthorizedException} If the user already exists.
   * @throws {InternalServerErrorException} If an error occurs during registration.
   */
  @Post("register")
  async register(@Body() body: RegisterDto): Promise<any> {
    return this.authService.register(body.username, body.email, body.password, body.address);
  }

  /**
   * @brief Logs in a user.
   *
   * This endpoint authenticates a user by verifying their email and password.
   * Upon successful authentication, it generates an access token and a refresh token.
   *
   * @param {LoginDto} body - The request body containing user credentials.
   * @param {Response} response - Express response object for setting cookies.
   * @returns {Promise<any>} An object containing an access token and the authenticated user.
   * @throws {UnauthorizedException} If the credentials are invalid.
   */
  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    const result = await this.authService.login(body);
    // Set the cookie with more permissive options for development
    response.cookie("accessToken", result.access_token, {
      httpOnly: false, // Temporarily set to false for debugging
      secure: false, // Temporarily set to false for local development
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: undefined, // Let the browser handle the domain
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    return result;
  }

  /**
   * @brief Retrieves the authenticated user's profile.
   *
   * This endpoint is protected and requires a valid JWT token.
   * It returns the currently authenticated user's details.
   *
   * @param {Request} req - The request object containing user details.
   * @returns {Promise<any>} The authenticated user's profile information.
   * @throws {UnauthorizedException} If the user is not authenticated.
   */
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@Req() req): Promise<any> {
    // Get the full user
    const fullUser = await this.authService.findUserByEmail(req.user.email);
    return {
      email: fullUser.email,
      role: fullUser.role,
      username: fullUser.username,
      address: fullUser.address
    };
  }

  /**
   * @brief Logs out a user by clearing their authentication cookie.
   *
   * @param {Response} response - Express response object for clearing cookies.
   * @returns {Promise<{message: string}>} Success message.
   */
  @Post("logout")
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie("accessToken");
    return { message: "Logout successful" };
  }

  /**
   * @brief Admin-only endpoint to list all users.
   *
   * This endpoint is protected and requires both JWT authentication and Admin role.
   *
   * @returns {Promise<any>} List of all users in the system.
   * @throws {UnauthorizedException} If the user is not authenticated or not an admin.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("users")
  async getAllUsers(): Promise<any> {
    return this.authService.findAll();
  }
}
