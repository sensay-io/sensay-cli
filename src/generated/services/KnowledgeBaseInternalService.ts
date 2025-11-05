/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class KnowledgeBaseInternalService {
    /**
     * Get latest distilled prompt
     * Retrieves the most recent distilled prompt for a replica. For internal RAG worker use only.
     * @param replicaUuid The replica unique identifier (UUID)
     * @returns any Latest distilled prompt retrieved successfully
     * @throws ApiError
     */
    public static getV1KnowledgeBaseDistilled(
        replicaUuid: replicaUUID_parameter,
    ): CancelablePromise<{
        /**
         * Indicates if the request was successful
         */
        success: boolean;
        /**
         * The most recent distilled prompt for this replica, null if none exists
         */
        latest_distilled_prompt: string | null;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/knowledge-base/distilled/{replicaUUID}',
            path: {
                'replicaUUID': replicaUuid,
            },
            errors: {
                403: `Insufficient permissions - requires internal RAG service role`,
            },
        });
    }
    /**
     * Create a new KB distilled entry
     * Inserts a new entry in the kb_distilled table with the provided prompt, kb_id, and action. For internal RAG worker use only.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param requestBody
     * @returns any KB distilled entry created successfully
     * @throws ApiError
     */
    public static postV1KnowledgeBaseDistilled(
        replicaUuid: replicaUUID_parameter,
        requestBody?: {
            /**
             * The distilled prompt to be stored
             */
            prompt: string;
            /**
             * The knowledge base ID associated with this distillation
             */
            kb_id: number;
            /**
             * The type of action performed on the knowledge base
             */
            action: 'ADDITION' | 'DELETION';
        },
    ): CancelablePromise<{
        /**
         * Indicates if the request was successful
         */
        success: boolean;
        /**
         * The ID of the created kb_distilled entry
         */
        id: number;
        /**
         * Success message
         */
        message: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/knowledge-base/distilled/{replicaUUID}',
            path: {
                'replicaUUID': replicaUuid,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request body or parameters`,
                403: `Insufficient permissions - requires internal RAG service role`,
                404: `Replica not found`,
            },
        });
    }
}
