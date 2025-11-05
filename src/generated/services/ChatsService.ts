/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatsService {
    /**
     * List replica's chats
     * List of replica's chats with pagination and sorting. Chats are groups of user+replica+platform conversations.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param pageSize The number of items per page.
     * @param page The page number.
     * @param sortBy Sort criteria.
     * @param sortOrder The order of the sort.
     * @param xApiVersion
     * @returns any List of chats
     * @throws ApiError
     */
    public static getV1ReplicasChats(
        replicaUuid: replicaUUID_parameter,
        pageSize: number | null = 24,
        page: number = 1,
        sortBy: 'replicaReplies' | 'firstMessageAt' | 'lastReplicaReplyAt' = 'replicaReplies',
        sortOrder: 'asc' | 'desc' = 'desc',
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        success?: boolean;
        items: Array<{
            /**
             * The chat UUID.
             */
            uuid: string;
            /**
             * The source of the chat.
             */
            source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            /**
             * Total messages in this chat.
             */
            messageCount: number;
            /**
             * The total number of assistant replies in this chat.
             */
            replicaReplyCount: number;
            /**
             * The timestamp of the first message in the chat.
             */
            firstMessageAt: string;
            /**
             * The timestamp of the last message in the chat.
             */
            lastMessageAt: string;
            /**
             * The timestamp of the last assistant reply in the chat.
             */
            lastReplicaReplyAt?: string;
            /**
             * The name of the chat. This can be the name of the user or the name of the group.
             */
            chatName?: string;
            /**
             * The image URL of the chat. This can be the profile image of the user or the group.
             */
            chatImageURL?: string;
            /**
             * The type of chat.
             */
            chatType: 'individual' | 'group';
        }>;
        /**
         * The total number of chats for this replica.
         */
        total: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/chats',
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
     * Get chat details
     * Retrieve details of a specific chat by UUID.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param chatUuid The chat UUID.
     * @param xApiVersion
     * @returns any Chat details
     * @throws ApiError
     */
    public static getV1ReplicasChats1(
        replicaUuid: replicaUUID_parameter,
        chatUuid: string,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        success?: boolean;
        chat: {
            /**
             * The chat UUID.
             */
            uuid: string;
            /**
             * The source of the chat.
             */
            source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            /**
             * Total messages in this chat.
             */
            messageCount: number;
            /**
             * The total number of assistant replies in this chat.
             */
            replicaReplyCount: number;
            /**
             * The timestamp of the first message in the chat.
             */
            firstMessageAt: string;
            /**
             * The timestamp of the last message in the chat.
             */
            lastMessageAt: string;
            /**
             * The timestamp of the last assistant reply in the chat.
             */
            lastReplicaReplyAt?: string;
            /**
             * The name of the chat. This can be the name of the user or the name of the group.
             */
            chatName?: string;
            /**
             * The image URL of the chat. This can be the profile image of the user or the group.
             */
            chatImageURL?: string;
            /**
             * The type of chat.
             */
            chatType: 'individual' | 'group';
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/chats/{chatUUID}',
            path: {
                'replicaUUID': replicaUuid,
                'chatUUID': chatUuid,
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
     * List conversations in a specific chat
     * List of conversations within a specific chat with pagination and sorting.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param chatUuid The chat UUID.
     * @param pageSize The number of items per page.
     * @param page The page number.
     * @param sortBy Sort criteria.
     * @param sortOrder The order of the sort.
     * @param xApiVersion
     * @returns any List of conversations for the chat
     * @throws ApiError
     */
    public static getV1ReplicasChatsConversations(
        replicaUuid: replicaUUID_parameter,
        chatUuid: string,
        pageSize: number | null = 24,
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
             * The chat UUID to which this conversation belongs.
             */
            chatUUID: string;
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
            replicaReplyCount: number;
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
            /**
             * A summary of the conversation.
             */
            summary?: string;
            /**
             * Common questions asked in this conversation.
             */
            commonQuestions?: Array<string>;
            /**
             * Common topics discussed in this conversation.
             */
            commonTopics?: Array<string>;
            /**
             * The type of conversation.
             */
            conversationType: 'individual' | 'group';
        }>;
        /**
         * The total number of conversations for this replica.
         */
        total: number;
        /**
         * Indicates the request was successful
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/chats/{chatUUID}/conversations',
            path: {
                'replicaUUID': replicaUuid,
                'chatUUID': chatUuid,
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
     * Get a chat conversation details
     * Retrieve details for a specific conversation within a chat.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param chatUuid The chat UUID.
     * @param conversationUuid The conversation UUID.
     * @param xApiVersion
     * @returns any Conversation details
     * @throws ApiError
     */
    public static getV1ReplicasChatsConversations1(
        replicaUuid: replicaUUID_parameter,
        chatUuid: string,
        conversationUuid: string,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * The conversation UUID.
         */
        uuid: string;
        /**
         * The chat UUID to which this conversation belongs.
         */
        chatUUID: string;
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
        replicaReplyCount: number;
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
        /**
         * A summary of the conversation.
         */
        summary?: string;
        /**
         * Common questions asked in this conversation.
         */
        commonQuestions?: Array<string>;
        /**
         * Common topics discussed in this conversation.
         */
        commonTopics?: Array<string>;
        /**
         * The type of conversation.
         */
        conversationType: 'individual' | 'group';
        /**
         * Indicates the request was successful
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/chats/{chatUUID}/conversations/{conversationUUID}',
            path: {
                'replicaUUID': replicaUuid,
                'chatUUID': chatUuid,
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
     * List messages in a chat conversation
     * Retrieves messages in a specific conversation within a chat with cursor-based pagination. Messages are sorted chronologically from oldest to newest.
     *
     * Use the `beforeUUID` parameter to get older messages and the `afterUUID` parameter to get newer messages. Please note:
     * - When `beforeUUID` is specified, the most recent messages before `beforeUUID` are returned.
     * - When `beforeUUID` and `afterUUID` are both specified, the most recent messages before `beforeUUID` are returned.
     * - When `afterUUID` is specified on its own, the least recent messages after `afterUUID` are returned.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param chatUuid The chat UUID.
     * @param conversationUuid The conversation UUID.
     * @param limit The number of messages to fetch.
     * @param afterUuid Only show messages after given message UUID. Excludes given message UUID.
     * @param beforeUuid Only show messages before given message UUID. Excludes given message UUID.
     * @param xApiVersion
     * @returns any List of messages in the chat conversation
     * @throws ApiError
     */
    public static getV1ReplicasChatsConversationsMessages(
        replicaUuid: replicaUUID_parameter,
        chatUuid: string,
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
            url: '/v1/replicas/{replicaUUID}/chats/{chatUUID}/conversations/{conversationUUID}/messages',
            path: {
                'replicaUUID': replicaUuid,
                'chatUUID': chatUuid,
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
     * List messages in a chat conversation
     * Retrieves messages in a specific conversation within a chat with cursor-based pagination. Messages are sorted chronologically from oldest to newest.
     *
     * Use the `beforeUUID` parameter to get older messages and the `afterUUID` parameter to get newer messages. Please note:
     * - When `beforeUUID` is specified, the most recent messages before `beforeUUID` are returned.
     * - When `beforeUUID` and `afterUUID` are both specified, the most recent messages before `beforeUUID` are returned.
     * - When `afterUUID` is specified on its own, the least recent messages after `afterUUID` are returned.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param chatUuid The chat UUID.
     * @param limit The number of messages to fetch.
     * @param afterUuid Only show messages after given message UUID. Excludes given message UUID.
     * @param beforeUuid Only show messages before given message UUID. Excludes given message UUID.
     * @param xApiVersion
     * @returns any List of messages in the conversation
     * @throws ApiError
     */
    public static getV1ReplicasChatsMessages(
        replicaUuid: replicaUUID_parameter,
        chatUuid: string,
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
            url: '/v1/replicas/{replicaUUID}/chats/{chatUUID}/messages',
            path: {
                'replicaUUID': replicaUuid,
                'chatUUID': chatUuid,
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
