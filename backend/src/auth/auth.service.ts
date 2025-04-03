/**
 * @file auth.service.ts
 * @brief Service for handling user authentication.
 *
 * This service manages user authentication, including login and registration.
 * It interacts with the UsersService to retrieve user data, hashes passwords using bcrypt,
 * and generates JWT tokens for authentication.
 */

import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "./enums/roles.enum";
import { LoginDto } from "./dto/login.dto";
import { AddressDto } from "./dto/auth.dto";

/**
 * @brief Service responsible for authentication operations.
 * @details This service handles user authentication, registration, and token generation.
 * It uses bcrypt for password hashing and JWT for token generation.
 */
@Injectable()
export class AuthService {
  /**
   * @brief Constructor for AuthService.
   * @param {UsersService} usersService - Service for handling user operations.
   * @param {JwtService} jwtService - Service for JWT token generation and validation.
   */
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  /**
   * @brief Validates a user's credentials.
   * @details This method verifies if a user exists and if the provided password is correct.
   *
   * @param {string} email - The email of the user to validate.
   * @param {string} password - The password to validate.
   * @returns {Promise<any>} The validated user object without sensitive information.
   * @throws {UnauthorizedException} If the user is not found or the password is invalid.
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.warn("⚠️ User not found");
      throw new UnauthorizedException("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.warn("⚠️ Invalid password");
      throw new UnauthorizedException("Invalid password");
    }

    return {
      email: user.email,
      username: user.username,
      address: user.address,
      role: user.role,
    };
  }

  /**
   * @brief Authenticates a user and generates a JWT token.
   * @details This method validates the user's credentials and generates an access token.
   *
   * @param {LoginDto} loginDto - The login data transfer object containing email and password.
   * @returns {Promise<{access_token: string, user: any}>} An object containing the access token and user information.
   * @throws {UnauthorizedException} If the credentials are invalid.
   */
  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      const payload = {
        email: user.email,
        role: user.role,
      };

      const access_token = this.jwtService.sign(payload);
      return {
        access_token,
        user: {
          email: user.email,
          role: user.role,
          username: user.username,
          address: user.address,
        },
      };
    } catch (error) {
      console.error("❌ Error during login:", error.message);
      throw new UnauthorizedException(error.message);
    }
  }

  /**
   * @brief Registers a new user.
   * @details This method creates a new user with the provided information.
   * The password is hashed before being stored in the database.
   *
   * @param {string} username - The username of the new user.
   * @param {string} email - The email of the new user.
   * @param {string} password - The password of the new user.
   * @param {string} address - The address for the new account (only post code, city and country)
   * @param {UserRole} role - The role of the new user, defaults to USER.
   * @returns {Promise<any>} The created user object without the password.
   * @throws {InternalServerErrorException} If an error occurs during user creation.
   */
  async register(
    username: string,
    email: string,
    password: string,
    address: AddressDto,
    role: UserRole = UserRole.USER,
  ) {
    // Create an hashed password and register with it
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const user = await this.usersService.createUser({
        username,
        email,
        password: hashedPassword,
        address,
        role,
      });

      return {
        email: user.email,
        username: user.username,
        role: user.role,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      console.error("❌ Error creating user:", error);
      throw new InternalServerErrorException(
        "Error creating user"
      );
    }
  }

  /**
   * @brief Retrieves all users from the database.
   * @details This method is restricted to admin users only and returns a list of all registered users.
   *
   * @returns {Promise<any>} A list of all users in the system.
   * @throws {InternalServerErrorException} If an error occurs while retrieving users.
   */
  async findAll(): Promise<any> {
    try {
      return await this.usersService.findAll();
    } catch (error) {
      console.error("❌ Error retrieving users:", error);
      throw new InternalServerErrorException("Error retrieving users list.");
    }
  }

  /**
   * @brief Retrieves a user from the database by email.
   * @details This method allows fetching a specific user's details by their email address.
   *          It is intended for use by authorized users (such as admins) and returns the user data.
   * 
   * @param email The email address of the user to be retrieved.
   * @returns {Promise<any>} A promise that resolves to the user data if found.
   * @throws {InternalServerErrorException} If an error occurs while retrieving the user data.
   */
  async findUserByEmail(email: string): Promise<any> {
    try {
      return await this.usersService.findByEmail(email);
    } catch (error) {
      console.error("❌ Error retrieving users:", error);
      throw new InternalServerErrorException("Error retrieving users list.");
    }
  }

}
