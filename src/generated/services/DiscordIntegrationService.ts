/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DiscordIntegrationService {
    /**
     * Get Discord chat history
     * List discord chat history items of a Replica belonging to the logged in user.
     * @param replicaUuid
     * @returns any List the chat history of the replica by the currently logged in user
     * @throws ApiError
     */
    public static getV1ReplicasChatHistoryDiscord(
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
            url: '/v1/replicas/{replicaUUID}/chat/history/discord',
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
