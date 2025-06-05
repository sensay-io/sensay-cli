/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConversationsService {
    /**
     * List messages in a conversation
     * Retrieves messages in a specific conversation with cursor-based pagination. Messages are sorted chronologically from oldest to newest.
     *
     * Use the `beforeUUID` parameter to get older messages and the `afterUUID` parameter to get newer messages. Please note:
     * - When `beforeUUID` is specified, the most recent messages before `beforeUUID` are returned.
     * - When `beforeUUID` and `afterUUID` are both specified, the most recent messages before `beforeUUID` are returned.
     * - When `afterUUID` is specified on its own, the least recent messages after `afterUUID` are returned.
     * @param replicaUuid
     * @param conversationUuid
     * @param limit
     * @param afterUuid
     * @param beforeUuid
     * @param xApiVersion
     * @returns any List of messages in the conversation
     * @throws ApiError
     */
    public static getV1ReplicasConversationsMessages(
        replicaUuid: replicaUUID_parameter,
        conversationUuid: string,
        limit: number = 20,
        afterUuid?: string,
        beforeUuid?: string,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
        items: Array<{
            /**
             * The UUID of the message.
             */
            uuid: string;
            /**
             * The date and time the message was created.
             */
            createdAt: string;
            /**
             * The content of the message.
             */
            content: string;
            /**
             * The role of the message sender.
             */
            role: 'user' | 'assistant';
            /**
             * The source of the message.
             */
            source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            replicaUUID: replicaUUID_parameter;
        }>;
        total: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/conversations/{conversationUUID}/messages',
            path: {
                'replicaUUID': replicaUuid,
                'conversationUUID': conversationUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            query: {
                'limit': limit,
                'afterUUID': afterUuid,
                'beforeUUID': beforeUuid,
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
