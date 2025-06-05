/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Get the current user
     * Returns information about the current user.
     * @param xApiVersion
     * @returns any User information
     * @throws ApiError
     */
    public static getV1UsersMe(
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * The name of the user
         */
        name?: string;
        /**
         * The email address
         */
        email?: string;
        /**
         * The ID of the user
         */
        id: string;
        /**
         * The linked accounts of the user
         */
        linkedAccounts?: Array<{
            /**
             * The account ID
             */
            accountID: string;
            /**
             * The account type
             */
            accountType: 'discord' | 'telegram' | 'embed';
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/users/me',
            headers: {
                'X-API-Version': xApiVersion,
            },
        });
    }
    /**
     * Delete the current user
     * This endpoint permanently deletes the currently authenticated user account, including all associated data. After deletion, the account cannot be recovered.
     * @param xApiVersion
     * @returns void
     * @throws ApiError
     */
    public static deleteV1UsersMe(
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/v1/users/me',
            headers: {
                'X-API-Version': xApiVersion,
            },
            errors: {
                400: `Bad Request`,
                401: `Unauthorized`,
                404: `Not Found`,
                415: `Unsupported Media Type`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Update the current user
     * Update the currently logged in user.
     * @param xApiVersion
     * @param requestBody
     * @returns any The updated User entity
     * @throws ApiError
     */
    public static putV1UsersMe(
        xApiVersion: string = '2025-03-25',
        requestBody?: {
            /**
             * The name of the user
             */
            name?: string;
            /**
             * The email address
             */
            email?: string;
            /**
             * The ID of the user
             */
            id: string;
            /**
             * The linked accounts of the user
             */
            linkedAccounts?: Array<{
                /**
                 * The account ID
                 */
                accountID: string;
                /**
                 * The account type
                 */
                accountType: 'discord' | 'telegram' | 'embed';
            }>;
        },
    ): CancelablePromise<{
        /**
         * The name of the user
         */
        name?: string;
        /**
         * The email address
         */
        email?: string;
        /**
         * The ID of the user
         */
        id: string;
        /**
         * The linked accounts of the user
         */
        linkedAccounts?: Array<{
            /**
             * The account ID
             */
            accountID: string;
            /**
             * The account type
             */
            accountType: 'discord' | 'telegram' | 'embed';
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/v1/users/me',
            headers: {
                'X-API-Version': xApiVersion,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                401: `Unauthorized`,
                404: `Not Found`,
                409: `Linked account or email already exists or is invalid`,
                415: `Unsupported Media Type`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create a user
     * Creates a new user.
     * @param xApiVersion
     * @param requestBody
     * @returns any The created User entity
     * @throws ApiError
     */
    public static postV1Users(
        xApiVersion: string = '2025-03-25',
        requestBody?: {
            /**
             * The name of the user
             */
            name?: string;
            /**
             * The email address
             */
            email?: string;
            /**
             * The ID of the user
             */
            id?: string;
            /**
             * The linked accounts of the user
             */
            linkedAccounts?: Array<{
                /**
                 * The account ID
                 */
                accountID: string;
                /**
                 * The account type
                 */
                accountType: 'discord' | 'telegram' | 'embed';
            }>;
        },
    ): CancelablePromise<{
        /**
         * The name of the user
         */
        name?: string;
        /**
         * The email address
         */
        email?: string;
        /**
         * The ID of the user
         */
        id: string;
        /**
         * The linked accounts of the user
         */
        linkedAccounts?: Array<{
            /**
             * The account ID
             */
            accountID: string;
            /**
             * The account type
             */
            accountType: 'discord' | 'telegram' | 'embed';
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/users',
            headers: {
                'X-API-Version': xApiVersion,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                409: `User, email, or linked account already exists`,
            },
        });
    }
    /**
     * Get a user by ID
     * Returns information about the user with the specified ID.
     * @param userId
     * @param xApiVersion
     * @returns any User entity
     * @throws ApiError
     */
    public static getV1Users(
        userId: string,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * The name of the user
         */
        name?: string;
        /**
         * The email address
         */
        email?: string;
        /**
         * The ID of the user
         */
        id: string;
        /**
         * The linked accounts of the user
         */
        linkedAccounts?: Array<{
            /**
             * The account ID
             */
            accountID: string;
            /**
             * The account type
             */
            accountType: 'discord' | 'telegram' | 'embed';
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/users/{userID}',
            path: {
                'userID': userId,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            errors: {
                404: `User not found`,
            },
        });
    }
}
