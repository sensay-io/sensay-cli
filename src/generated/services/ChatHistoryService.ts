/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatHistoryService {
    /**
     * Get chat history
     * List chat history items of a Replica belonging to the logged in user.
     * @param replicaUuid
     * @param xApiVersion
     * @returns any List the chat history of the replica by the currently logged in user
     * @throws ApiError
     */
    public static getV1ReplicasChatHistory(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
        type: string;
        items?: Array<{
            /**
             * The content of the message
             */
            content: string;
            /**
             * The date and time the message was created
             */
            created_at: string;
            /**
             * The ID of the message
             */
            id: number;
            /**
             * Whether the replica is private
             */
            is_private: boolean;
            /**
             * The role of the message
             */
            role: 'user' | 'assistant';
            /**
             * From which platform is message was sent from
             */
            source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            /**
             * The sources of information used to create the response via RAG (Retrieval-Augmented Generation)
             */
            sources: Array<{
                /**
                 * The ID of the source
                 */
                id: number;
                /**
                 * Relevance score of the source
                 */
                score: number;
                /**
                 * If the source has ever been scored or not
                 */
                status: 'scored' | 'unscored';
                /**
                 * When the source was created
                 */
                created_at: string;
                /**
                 * The name of the source
                 */
                name: string;
                /**
                 * The actual content retrieved from the source
                 */
                content: string;
            }>;
            /**
             * The UUID of the user
             */
            user_uuid: string;
            /**
             * The ID of the message from the LLM. Present when role is assistant. Will be removed in the future.
             * @deprecated
             */
            original_message_id: string | null;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/chat/history',
            path: {
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            errors: {
                400: `Bad Request`,
                401: `Unauthorized`,
                404: `The replica specified could not be found or you do not have access to it`,
                415: `Unsupported Media Type`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create a chat history entry
     * Save chat history items of a Replica belonging to the logged in user.
     * @param replicaUuid
     * @param xApiVersion
     * @param requestBody
     * @returns any Saves the chat history of the replica by the currently logged in user.
     * @throws ApiError
     */
    public static postV1ReplicasChatHistory(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
        requestBody?: {
            /**
             * Content of the message
             */
            content: string;
            /**
             * The place where the conversation is happening, which informs where the message should be saved in the chat history.
             */
            source?: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            /**
             * Discord information about the message
             */
            discord_data?: {
                /**
                 * Channel ID
                 */
                channel_id: string;
                /**
                 * Channel name
                 */
                channel_name: string;
                /**
                 * Author ID
                 */
                author_id: string;
                /**
                 * Author name
                 */
                author_name: string;
                /**
                 * Message ID
                 */
                message_id: string;
                /**
                 * Message creation timestamp
                 */
                created_at?: string;
                /**
                 * Server ID
                 */
                server_id?: string;
                /**
                 * Server name
                 */
                server_name?: string;
            };
        },
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/replicas/{replicaUUID}/chat/history',
            path: {
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `The replica specified could not be found or you do not have access to it`,
            },
        });
    }
    /**
     * Get Web chat history
     * List web chat history items of a Replica belonging to the logged in user.
     * @param replicaUuid
     * @returns any List the chat history of the replica by the currently logged in user
     * @throws ApiError
     */
    public static getV1ReplicasChatHistoryWeb(
        replicaUuid: replicaUUID_parameter,
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
        type: string;
        items?: Array<{
            /**
             * The content of the message
             */
            content: string;
            /**
             * The date and time the message was created
             */
            created_at: string;
            /**
             * The ID of the message
             */
            id: number;
            /**
             * Whether the replica is private
             */
            is_private: boolean;
            /**
             * The role of the message
             */
            role: 'user' | 'assistant';
            /**
             * From which platform is message was sent from
             */
            source: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
            /**
             * The sources of information used to create the response via RAG (Retrieval-Augmented Generation)
             */
            sources: Array<{
                /**
                 * The ID of the source
                 */
                id: number;
                /**
                 * Relevance score of the source
                 */
                score: number;
                /**
                 * If the source has ever been scored or not
                 */
                status: 'scored' | 'unscored';
                /**
                 * When the source was created
                 */
                created_at: string;
                /**
                 * The name of the source
                 */
                name: string;
                /**
                 * The actual content retrieved from the source
                 */
                content: string;
            }>;
            /**
             * The UUID of the user
             */
            user_uuid: string;
            /**
             * The ID of the message from the LLM. Present when role is assistant. Will be removed in the future.
             * @deprecated
             */
            original_message_id: string | null;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/chat/history/web',
            path: {
                'replicaUUID': replicaUuid,
            },
            errors: {
                400: `Bad Request`,
                401: `Unauthorized`,
                404: `The replica specified could not be found or you do not have access to it`,
                415: `Unsupported Media Type`,
                500: `Internal Server Error`,
            },
        });
    }
}
