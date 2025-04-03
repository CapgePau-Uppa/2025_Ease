/**
 * @file auth.dto.ts
 * @brief Data Transfer Objects (DTO) for authentication requests.
 *
 * This file defines the DTOs used for user authentication,
 * including registration and login requests.
 */

import { IsNotEmpty, MinLength, IsEmail, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
/**
 * @class AddressDto
 * @brief DTO for user registration.
 *
 * This class defines the structure and validation rules for user's address.
 */
export class AddressDto {
  /**
   * @property postCode
   * @brief The postal code of the user.
   * @details Must not be empty.
   */
  @IsNotEmpty()
  postCode: string;

  /**
   * @property city
   * @brief The city of the user.
   * @details Must not be empty.
   */
  @IsNotEmpty()
  city: string;

  /**
   * @property country
   * @brief The country of the user.
   * @details Must not be empty.
   */
  @IsNotEmpty()
  country: string;
}

/**
 * @class RegisterDto
 * @brief DTO for user registration.
 *
 * This class defines the structure and validation rules for user registration requests.
 */
export class RegisterDto {

  /**
  * @property username
  * @brief The username of the user.
  * @details Must not be empty and have a minimum length of 1 character.
  */
  @IsNotEmpty()
  @MinLength(1)
  username: string;
  /**
   * @property email
   * @brief The email of the user.
   * @details Must be a valid email format.
   */
  @IsEmail()
  email: string;

  /**
   * @property password
   * @brief The password of the user.
   * @details Must not be empty and have a minimum length of 6 characters.
   */
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  /**
   * @property address
   * @brief The address of the user.
   * @details Must be a valid address object.
   */
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

/**
 * @class LoginDto
 * @brief DTO for user login.
 *
 * This class defines the structure and validation rules for user login requests.
 */
export class LoginDto {
  /**
   * @property email
   * @brief The email of the user.
   * @details Must be a valid email format.
   */
  @IsEmail()
  email: string;

  /**
   * @property password
   * @brief The password of the user.
   * @details Must not be empty.
   */
  @IsNotEmpty()
  password: string;
}