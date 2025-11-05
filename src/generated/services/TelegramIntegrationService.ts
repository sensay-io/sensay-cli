/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TelegramIntegrationService {
    /**
     * Get Telegram chat history
     * List telegram chat history items of a Replica belonging to the logged in user.
     * @param replicaUuid The replica unique identifier (UUID)
     * @returns any List the chat history of the replica by the currently logged in user
     * @throws ApiError
     */
    public static getV1ReplicasChatHistoryTelegram(
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
            url: '/v1/replicas/{replicaUUID}/chat/history/telegram',
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
    /**
     * Create a Telegram chat history entry
     * Save chat history items of a Replica belonging to the logged in user.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param xApiVersion
     * @param contentEncoding Content encoding for request body compression. Optional - when used, client is responsible for gzipping and sending binary data.
     * @param requestBody
     * @returns any Saves the chat history of the replica by the currently logged in user.
     * @throws ApiError
     */
    public static postV1ReplicasChatHistoryTelegram(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
        contentEncoding?: 'gzip',
        requestBody?: {
            /**
             * Content of the message
             */
            content: string;
            telegram_data: {
                /**
                 * Type of the chat, can be either `private`, `group`, `supergroup` or `channel`.
                 */
                chat_type: string;
                /**
                 * Unique identifier for this chat.
                 */
                chat_id: number;
                /**
                 * Name of the chat (group name, channel title, or user display name for private chats).
                 */
                chat_name?: string;
                /**
                 * Sender of the message's userID; may be empty for messages sent to channels. For backward compatibility, if the message was sent on behalf of a chat, the field contains a fake sender user in non-channel chats.
                 */
                user_id?: number;
                /**
                 * Sender of the message's username; may be empty for messages sent to channels. For backward compatibility, if the message was sent on behalf of a chat, the field contains a fake sender user in non-channel chats.
                 */
                username?: string;
                /**
                 * Unique message identifier inside this chat. In specific instances (e.g., message containing a video sent to a big chat).
                 */
                message_id: number;
                /**
                 * Unique identifier of a message thread or a forum topic to which the message belongs; for supergroups only.
                 */
                message_thread_id?: number;
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
            url: '/v1/replicas/{replicaUUID}/chat/history/telegram',
            path: {
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
                'Content-Encoding': contentEncoding,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `The replica specified could not be found or you do not have access to it`,
            },
        });
    }
    /**
     * Generate a Telegram completion
     *
     * Ask for a completion and stores the prompt in the chat history.
     *
     * Replica chat supports two response formats: streamed and JSON. To switch between these formats, use the 'Accept' header, specifying either 'text/event-stream' for streaming or 'application/json' for JSON.
     * The streamed response honours the [Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol), allowing the use of a number of SDKs, including [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction).
     *
     * The streamed variant is not specified in the OpenAPI Schema because it is not an OpenAPI endpoint.
     *
     * @param replicaUuid The replica unique identifier (UUID)
     * @param xApiVersion
     * @param contentEncoding Content encoding for request body compression. Optional - when used, client is responsible for gzipping and sending binary data.
     * @param requestBody
     * @returns any List of chat messages had with a replica by the current user, including the completion
     * @throws ApiError
     */
    public static postV1ReplicasChatCompletionsTelegram(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
        contentEncoding?: 'gzip',
        requestBody?: {
            /**
             * The prompt to generate completions for, encoded as a string.
             */
            content: string;
            /**
             * When set to true, historical messages are not used in the context, and the message is not appended to the conversation history, thus it is excluded from all future chat context.
             */
            skip_chat_history?: boolean;
            /**
             * The URL of the image to be used as context for the completion.
             */
            imageURL?: string;
            telegram_data: {
                /**
                 * Type of the chat, can be either `private`, `group`, `supergroup` or `channel`.
                 */
                chat_type: string;
                /**
                 * Unique identifier for this chat.
                 */
                chat_id: number;
                /**
                 * Name of the chat (group name, channel title, or user display name for private chats).
                 */
                chat_name?: string;
                /**
                 * Sender of the message's userID; may be empty for messages sent to channels. For backward compatibility, if the message was sent on behalf of a chat, the field contains a fake sender user in non-channel chats.
                 */
                user_id?: number;
                /**
                 * Sender of the message's username; may be empty for messages sent to channels. For backward compatibility, if the message was sent on behalf of a chat, the field contains a fake sender user in non-channel chats.
                 */
                username?: string;
                /**
                 * Unique message identifier inside this chat. In specific instances (e.g., message containing a video sent to a big chat).
                 */
                message_id: number;
                /**
                 * Unique identifier of a message thread or a forum topic to which the message belongs; for supergroups only.
                 */
                message_thread_id?: number;
            };
        },
    ): CancelablePromise<{
        success: boolean;
        content: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/replicas/{replicaUUID}/chat/completions/telegram',
            path: {
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
                'Content-Encoding': contentEncoding,
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
    /**
     * Create a replica Telegram integration
     * Integrates a replica to Telegram. The default Sensay Telegram integration will run a bot for you until you delete the integration.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param xApiVersion
     * @param contentEncoding Content encoding for request body compression. Optional - when used, client is responsible for gzipping and sending binary data.
     * @param requestBody
     * @returns any Telegram integration created successfully
     * @throws ApiError
     */
    public static postV1ReplicasIntegrationsTelegram(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
        contentEncoding?: 'gzip',
        requestBody?: {
            /**
             * Telegram Bot ID
             */
            telegram_token: string;
            /**
             * Telegram Bot Name
             */
            mention: string;
        },
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
        id: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/replicas/{replicaUUID}/integrations/telegram',
            path: {
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
                'Content-Encoding': contentEncoding,
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
    /**
     * Delete a replica Telegram integration
     * Removes a replica Telegram integration.
     * @param replicaUuid The replica unique identifier (UUID)
     * @param xApiVersion
     * @returns any Telegram integration deleted successfully
     * @throws ApiError
     */
    public static deleteV1ReplicasIntegrationsTelegram(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/v1/replicas/{replicaUUID}/integrations/telegram',
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
