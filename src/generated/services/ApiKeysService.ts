/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ApiKeysService {
    /**
     * Redeem an API key invitation
     *
     * If you have an invitation code, you can redeem it to create an Organization and an API key associated with it.
     *
     * @param code
     * @param requestBody
     * @returns any Details about the created Organization and API Key.
     * @throws ApiError
     */
    public static postV1ApiKeysInvitesRedeem(
        code: string,
        requestBody?: {
            /**
             * The name of the organization you want to create.
             */
            organizationName: string;
            /**
             * The name of the point of contact for the API subscription.
             */
            name: string;
            /**
             * The email of the point of contact for the API subscription.
             */
            email: string;
        },
    ): CancelablePromise<{
        success: boolean;
        /**
         * The API key you will need to use to authenticate your requests. The key cannot be retrieved again after it is created: keep it safe.
         */
        apiKey: string;
        /**
         * The ID of the organization you have just created. You will need this ID to communicate with our team. Keep it safe.
         */
        organizationID: string;
        /**
         * The date until which the API subscroption is valid.
         */
        validUntil: string | null;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/api-keys/invites/{code}/redeem',
            path: {
                'code': code,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                401: `Unauthorized`,
                404: `Not Found`,
                415: `Unsupported Media Type`,
                500: `Internal Server Error`,
            },
        });
    }
}
