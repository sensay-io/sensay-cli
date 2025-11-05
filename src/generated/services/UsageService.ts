/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsageService {
    /**
     * Get usage metrics
     * Returns usage metrics including total conversations and knowledge base entries across all replicas owned by the authenticated user.
     * @param xApiVersion
     * @returns any Usage metrics
     * @throws ApiError
     */
    public static getV1UsersMeUsage(
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Conversation usage metrics
         */
        conversations: {
            /**
             * Total conversations for the current calendar month
             */
            currentMonthTotal: number;
            /**
             * Current calendar month conversations breakdown by replica
             */
            currentMonthByReplica: Record<string, number>;
        };
        /**
         * Knowledge base entries usage metrics
         */
        knowledgeBaseEntries: {
            /**
             * Total knowledge base entries across all replicas
             */
            total: number;
            /**
             * Knowledge base entries breakdown by replica
             */
            byReplica: Record<string, number>;
        };
        /**
         * Indicates the request was successful
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/users/me/usage',
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
}
