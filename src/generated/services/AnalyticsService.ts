/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Get replica historical conversation analytics
     * Returns cumulative conversation count for the last 30 days, up to and including today.
     * @param replicaUuid
     * @param xApiVersion
     * @returns any Historical conversation analytics data
     * @throws ApiError
     */
    public static getV1ReplicasAnalyticsConversationsHistorical(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<Array<{
        /**
         * The date in YYYY-MM-DD format.
         */
        date: string;
        /**
         * The cumulative number of conversations up to this date.
         */
        cumulativeConversations: number;
    }>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/analytics/conversations/historical',
            path: {
                'replicaUUID': replicaUuid,
            },
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
     * Get replica source analytics
     * Returns interaction counts by source for the replica.
     * @param replicaUuid
     * @param xApiVersion
     * @returns any Source analytics data
     * @throws ApiError
     */
    public static getV1ReplicasAnalyticsConversationsSources(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<Array<{
        /**
         * The source of the conversations.
         */
        source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
        /**
         * The total number of conversations from this source.
         */
        conversations: number;
    }>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/analytics/conversations/sources',
            path: {
                'replicaUUID': replicaUuid,
            },
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
