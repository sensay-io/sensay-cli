/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatCompletionsService {
    /**
     * Generate a completion
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
    public static postV1ReplicasChatCompletions(
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
             * The place where the conversation is happening, which informs where the message should be saved in the chat history.
             */
            source?: 'discord' | 'telegram' | 'embed' | 'web' | 'telegram_autopilot';
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
            /**
             * Usage policies and quotas to enforce for this completion request
             */
            usageLimits?: {
                conversations?: {
                    /**
                     * The number of conversations allowed for this account in the current calendar month.
                     */
                    monthlyQuota: number;
                };
            };
        },
    ): CancelablePromise<{
        success: boolean;
        content: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/replicas/{replicaUUID}/chat/completions',
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
                429: `The monthly conversation quota specified in the request has been exceeded.`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Test chat completions
     *
     * Testing endpoint for evaluating RAG (Retrieval-Augmented Generation) quality. This endpoint allows to test how effectively the system retrieves relevant knowledge base entries and generates responses based on them. It returns not only the generated response but also the search queries used and the knowledge base entries that matched those queries. This is a simplified version that doesn't persist data to the database or chat history.
     *
     * Note: This endpoint is restricted to internal RAG workers and is not intended for general API users.
     *
     * @param replicaUuid The replica unique identifier (UUID)
     * @param xApiVersion
     * @param contentEncoding Content encoding for request body compression. Optional - when used, client is responsible for gzipping and sending binary data.
     * @param requestBody
     * @returns any Test endpoint for RAG Worker to check RAG retrieval and generation quality
     * @throws ApiError
     */
    public static postV1ReplicasChatCompletionsTest(
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
        },
    ): CancelablePromise<{
        /**
         * Indicates if the test chat completion was processed successfully
         */
        success: boolean;
        /**
         * The complete response text generated by the replica based on the retrieved knowledge base entries
         */
        content: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/replicas/{replicaUUID}/chat/completions/test',
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
     * Generate a completion (OpenAI-compatible, non-streaming)
     *
     * > warn
     * > Limited [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create) compatibility.
     * > Supports basic chat completion with standard message roles and JSON responses.
     * > Not supported: OpenAI-style streaming, tool calls, stop sequences, logprobs, and most request parameters.
     *
     * Creates a chat completion response from a list of messages comprising a conversation.
     *
     * @param replicaUuid The replica unique identifier (UUID)
     * @param xApiVersion
     * @param contentEncoding Content encoding for request body compression. Optional - when used, client is responsible for gzipping and sending binary data.
     * @param requestBody
     * @returns any Chat completion response in OpenAI compatible format
     * @throws ApiError
     */
    public static postV1ExperimentalReplicasChatCompletions(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
        contentEncoding?: 'gzip',
        requestBody?: {
            /**
             * A list of messages that make up the conversation context. Only the last message is used for completion.
             */
            messages: Array<{
                /**
                 * The role of the message author. Can be "assistant", "developer", "system", "tool", or "user".
                 */
                role: 'assistant' | 'developer' | 'system' | 'tool' | 'user';
                /**
                 * The content of the message.
                 */
                content: string;
                /**
                 * An optional name for the participant. Provides the model information to differentiate between participants of the same role.
                 */
                name?: string;
            }>;
            /**
             * When set to false, historical messages are not used in the context, and the message is not appended to the conversation history.
             */
            store?: boolean;
            /**
             * The place where the conversation is happening, which informs where the message should be saved in the chat history if `store` is true.
             */
            source?: 'discord' | 'embed' | 'web';
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
         * A unique identifier for the chat completion.
         */
        id: string;
        /**
         * The Unix timestamp (in seconds) of when the chat completion was created.
         */
        created: number;
        /**
         * The object type, which is always "chat.completion"
         */
        object: 'chat.completion';
        /**
         * The model used for the chat completion.
         */
        model: string;
        /**
         * An array of chat completion choices.
         */
        choices: Array<{
            /**
             * The index of the choice in the array.
             */
            index: number;
            /**
             * The message generated by the model.
             */
            message: {
                /**
                 * The role of the message author, which is always "assistant" for completions.
                 */
                role: 'assistant';
                /**
                 * The content of the message.
                 */
                content: string;
                /**
                 * The tool calls generated by the model, such as function calls.
                 */
                tool_calls?: Array<any>;
            };
            /**
             * Log probabilities for token generation if requested.
             */
            logprobs?: any;
            /**
             * The reason the model stopped generating tokens.
             */
            finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call';
        }>;
        /**
         * Usage statistics for the completion request.
         */
        usage: {
            /**
             * Number of tokens in the prompt.
             */
            prompt_tokens: number;
            /**
             * Number of tokens in the generated completion.
             */
            completion_tokens: number;
            /**
             * Total number of tokens used (prompt + completion).
             */
            total_tokens: number;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/experimental/replicas/{replicaUUID}/chat/completions',
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
}
