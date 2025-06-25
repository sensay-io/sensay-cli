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
     * Get conversation details
     * Retrieve details for a specific conversation within a replica.
     * @param replicaUuid
     * @param conversationUuid
     * @param xApiVersion
     * @returns any Conversation details
     * @throws ApiError
     */
    public static getV1ReplicasConversations(
        replicaUuid: replicaUUID_parameter,
        conversationUuid: string,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * The conversation UUID.
         */
        uuid: string;
        /**
         * The source of the conversation.
         */
        source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
        /**
         * The total number of messages in the conversation.
         */
        messageCount: number;
        /**
         * The total number of assistant replies in the conversation.
         */
        assistantReplyCount: number;
        /**
         * The timestamp of the first message in the conversation.
         */
        firstMessageAt?: string;
        /**
         * The timestamp of the last message in the conversation.
         */
        lastMessageAt?: string;
        /**
         * The timestamp of the last assistant reply in the conversation.
         */
        lastReplicaReplyAt?: string;
        /**
         * The name of the conversation. This can be the name of the user or the name of the group.
         */
        conversationName?: string;
        /**
         * The image URL of the conversation. This can be the profile image of the user or the group.
         */
        conversationImageURL?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/conversations/{conversationUUID}',
            path: {
                'replicaUUID': replicaUuid,
                'conversationUUID': conversationUuid,
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
     * List replica's conversations
     * List of replica's conversations with pagination and sorting.
     * @param replicaUuid
     * @param pageSize
     * @param page
     * @param sortBy Sorts by count of assistant replies, time of first message, or time of the last replica reply.
     * @param sortOrder
     * @param xApiVersion
     * @returns any List of conversations
     * @throws ApiError
     */
    public static getV1ReplicasConversations1(
        replicaUuid: replicaUUID_parameter,
        pageSize?: number | null,
        page: number = 1,
        sortBy: 'replicaReplies' | 'firstMessageAt' | 'lastReplicaReplyAt' = 'lastReplicaReplyAt',
        sortOrder: 'asc' | 'desc' = 'desc',
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        items: Array<{
            /**
             * The conversation UUID.
             */
            uuid: string;
            /**
             * The source of the conversation.
             */
            source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            /**
             * The total number of messages in the conversation.
             */
            messageCount: number;
            /**
             * The total number of assistant replies in the conversation.
             */
            assistantReplyCount: number;
            /**
             * The timestamp of the first message in the conversation.
             */
            firstMessageAt?: string;
            /**
             * The timestamp of the last message in the conversation.
             */
            lastMessageAt?: string;
            /**
             * The timestamp of the last assistant reply in the conversation.
             */
            lastReplicaReplyAt?: string;
            /**
             * The name of the conversation. This can be the name of the user or the name of the group.
             */
            conversationName?: string;
            /**
             * The image URL of the conversation. This can be the profile image of the user or the group.
             */
            conversationImageURL?: string;
        }>;
        /**
         * The total number of conversations for this replica.
         */
        total: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/conversations',
            path: {
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            query: {
                'pageSize': pageSize,
                'page': page,
                'sortBy': sortBy,
                'sortOrder': sortOrder,
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
     * List mentions in a conversation
     * Retrieves mentions of a replica in a specific conversation, together with context surrounding the mention. This endpoint supports cursor-based pagination. Returns most recent mentions first.
     * @param replicaUuid
     * @param conversationUuid
     * @param limit
     * @param afterUuid
     * @param beforeUuid
     * @param xApiVersion
     * @returns any List of messages/placeholders
     * @throws ApiError
     */
    public static getV1ReplicasConversationsMentions(
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
        items: Array<({
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
             * The name of the message sender, if available.
             */
            senderName?: string;
            /**
             * The avatar URL of the message sender, if available.
             */
            senderProfileImageURL?: string;
            /**
             * The source of the message.
             */
            source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            replicaUUID: replicaUUID_parameter;
            type: 'message';
        } | {
            type: 'placeholder';
            /**
             * The number of messages collapsed into this placeholder
             */
            count: number;
        })>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/conversations/{conversationUUID}/mentions',
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
             * The name of the message sender, if available.
             */
            senderName?: string;
            /**
             * The avatar URL of the message sender, if available.
             */
            senderProfileImageURL?: string;
            /**
             * The source of the message.
             */
            source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            replicaUUID: replicaUUID_parameter;
        }>;
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
