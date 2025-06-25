/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ReplicasService {
    /**
     * List replicas
     * List replicas with pagination with optional filtering. Only Replicas that are public or belong to the authenticated user are returned.
     * @param ownerUuid Filters by the owner UUID of the Replicas
     * @param ownerId The replica owner ID.
     * @param page Pagination: The page number to return
     * @param pageIndex Pagination: The page index to return
     * @param pageSize Pagination: The number of items per page
     * @param slug Filters by the replica's slug
     * @param search Search: by name of Replica, sorted in ascending order
     * @param tags Filters by tags associated to Replicas
     * @param sort Sorts by name or popularity of Replicas in ascending order
     * @param integration Filters by integration
     * @param xApiVersion
     * @returns any List of Replicas
     * @throws ApiError
     */
    public static getV1Replicas(
        ownerUuid?: string,
        ownerId?: string,
        page?: number,
        pageIndex: number = 1,
        pageSize: number = 24,
        slug?: string,
        search?: string,
        tags?: Array<'AI' | 'Academic' | 'Arts' | 'Blockchain' | 'Business' | 'Celebrity' | 'Charity' | 'Developer' | 'Educator' | 'Europe' | 'Fashion' | 'Finance' | 'Food' | 'Health & Fitness' | 'History' | 'Italian' | 'Kids' | 'Language' | 'Law' | 'Leadership' | 'Lifestyle' | 'Literature' | 'Love' | 'Military' | 'Modelling' | 'Motivation' | 'Movies' | 'Music' | 'North America' | 'Philosophy' | 'Politics' | 'Religion' | 'Science' | 'Self-Help' | 'Sensay' | 'Sports' | 'Technology' | 'Web' | 'Wisdom' | 'blockchain' | 'engage2earn' | 'female' | 'investment' | 'male' | 'meme' | 'miniapp' | 'telegram' | 'web3'>,
        sort: 'name' | 'popularity' = 'name',
        integration?: 'telegram' | 'discord',
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
        type: string;
        /**
         * Array of replica items for the current page. Will be an empty array if no items exist.
         */
        items: Array<{
            /**
             * The name of the replica.
             */
            name: string;
            /**
             * The purpose of the replica. This field is not used for training the replica.
             */
            purpose?: string;
            /**
             * A short description of your replica. This field is not used for training the replica.
             */
            shortDescription: string;
            /**
             * The first thing your replica will say when you start a conversation with them.
             */
            greeting: string;
            /**
             * The replica type.
             * `individual`: A replica of yourself.
             * `character`: A replica of a character: can be anything you want.
             * `brand`: A replica of a business persona or organization.
             *
             */
            type?: 'individual' | 'character' | 'brand';
            /**
             * The replica owner ID.
             */
            ownerID: string;
            /**
             * Visibility of the replica. When set to `true`, only the owner and users on the allowlist will be able to find the replica and chat with it.
             */
            private?: boolean;
            /**
             * Emails of users who can use the replica when the replica is private.
             */
            whitelistEmails?: Array<string>;
            /**
             * The slug of the replica. Slugs can be used by API consumers to determine the URLs where replicas can be found.
             */
            slug: string;
            /**
             * The tags associated with the replica. Tags help categorize replicas and make them easier to find.
             */
            tags?: Array<string>;
            /**
             * The URL of the profile image of the replica. The image will be downloaded, optimized and stored on our servers, so the URL in the response will be different. Supported formats: .jpg, .jpeg, .png, .bmp, .webp, .avif
             */
            profileImage?: string;
            /**
             * Suggested questions when starting a conversation.
             */
            suggestedQuestions?: Array<string>;
            llm: {
                /**
                 * The LLM model of the replica.
                 */
                model?: 'gpt-4o' | 'claude-3-5-haiku-latest' | 'claude-3-7-sonnet-latest' | 'claude-4-sonnet-20250514' | 'grok-2-latest' | 'grok-3-beta' | 'deepseek-chat' | 'o3-mini' | 'gpt-4o-mini' | 'huggingface-eva' | 'huggingface-dolphin-llama';
                /**
                 * Deprecated. The system will automatically choose the best approach.
                 * @deprecated
                 */
                memoryMode?: 'prompt-caching' | 'rag-search';
                /**
                 * Who is your replica? How do you want it to talk, respond and act.
                 */
                systemMessage?: string;
                /**
                 * The replica's tools. Tools enable agents to interact with the world. `getTokenInfo`: Allows replica to get token information
                 *
                 */
                tools?: Array<'getTokenInfo' | 'getUdaoTokenInfo' | 'getSensayTokenInfo' | 'getTokenInfoMEAI' | 'answerToLife' | 'toolhouse' | 'brightUnionGetQuoteTool' | 'brightUnionGetCoverablesTool'>;
            };
            /**
             * Text that can be used to generate a voice preview.
             */
            voicePreviewText?: string;
            /**
             * The replica UUID
             */
            uuid: string;
            /**
             * The URL of the profile image of the replica. Please use `profileImage` instead.
             * @deprecated
             */
            profile_image: string | null;
            /**
             * The description of the replica. Please use `shortDescription` instead.
             * @deprecated
             */
            short_description: string | null;
            /**
             * The introduction of the replica. Please use `greeting` instead.
             * @deprecated
             */
            introduction: string | null;
            /**
             * The date and time the replica was created.
             */
            created_at: string | null;
            /**
             * The UUID of the owner of the replica. Please migrate to the new User ID system and use `ownerID` instead.
             * @deprecated
             */
            owner_uuid: string | null;
            /**
             * Whether the replica has voice support.
             */
            voice_enabled: boolean;
            /**
             * Whether the replica has video support.
             */
            video_enabled: boolean;
            /**
             * The total number of chat history items related to this replica, for all users of the organization.
             */
            chat_history_count: number | null;
            /**
             * The replica's tone, personality and behaviour, Please use `llm.systemMessage` instead.
             * @deprecated
             */
            system_message: string;
            /**
             * The Discord integration of the replica.
             */
            discord_integration: any | null;
            /**
             * The Telegram integration of the replica.
             */
            telegram_integration: any | null;
            /**
             * The ElevenLabs voice ID associated with this replica.
             */
            elevenLabsID?: string | null;
        }>;
        /**
         * The total number of replica items available across all pages
         */
        total: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas',
            headers: {
                'X-API-Version': xApiVersion,
            },
            query: {
                'owner_uuid': ownerUuid,
                'ownerID': ownerId,
                'page': page,
                'page_index': pageIndex,
                'page_size': pageSize,
                'slug': slug,
                'search': search,
                'tags': tags,
                'sort': sort,
                'integration': integration,
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
     * Create a replica
     * Creates a new replica.
     * @param xApiVersion
     * @param requestBody
     * @returns any The created replica
     * @throws ApiError
     */
    public static postV1Replicas(
        xApiVersion: string = '2025-03-25',
        requestBody?: {
            /**
             * The name of the replica.
             */
            name: string;
            /**
             * The purpose of the replica. This field is not used for training the replica.
             */
            purpose?: string;
            /**
             * A short description of your replica. This field is not used for training the replica.
             */
            shortDescription: string;
            /**
             * The first thing your replica will say when you start a conversation with them.
             */
            greeting: string;
            /**
             * The replica type.
             * `individual`: A replica of yourself.
             * `character`: A replica of a character: can be anything you want.
             * `brand`: A replica of a business persona or organization.
             *
             */
            type?: 'individual' | 'character' | 'brand';
            /**
             * The replica owner ID.
             */
            ownerID: string;
            /**
             * Visibility of the replica. When set to `true`, only the owner and users on the allowlist will be able to find the replica and chat with it.
             */
            private?: boolean;
            /**
             * Emails of users who can use the replica when the replica is private.
             */
            whitelistEmails?: Array<string>;
            /**
             * The slug of the replica. Slugs can be used by API consumers to determine the URLs where replicas can be found.
             */
            slug: string;
            /**
             * The tags associated with the replica. Tags help categorize replicas and make them easier to find.
             */
            tags?: Array<string>;
            /**
             * The URL of the profile image of the replica. The image will be downloaded, optimized and stored on our servers, so the URL in the response will be different. Supported formats: .jpg, .jpeg, .png, .bmp, .webp, .avif
             */
            profileImage?: string;
            /**
             * Suggested questions when starting a conversation.
             */
            suggestedQuestions?: Array<string>;
            llm: {
                /**
                 * The LLM model of the replica.
                 */
                model?: 'gpt-4o' | 'claude-3-5-haiku-latest' | 'claude-3-7-sonnet-latest' | 'claude-4-sonnet-20250514' | 'grok-2-latest' | 'grok-3-beta' | 'deepseek-chat' | 'o3-mini' | 'gpt-4o-mini' | 'huggingface-eva' | 'huggingface-dolphin-llama';
                /**
                 * Deprecated. The system will automatically choose the best approach.
                 * @deprecated
                 */
                memoryMode?: 'prompt-caching' | 'rag-search';
                /**
                 * Who is your replica? How do you want it to talk, respond and act.
                 */
                systemMessage?: string;
                /**
                 * The replica's tools. Tools enable agents to interact with the world. `getTokenInfo`: Allows replica to get token information
                 *
                 */
                tools?: Array<'getTokenInfo' | 'getUdaoTokenInfo' | 'getSensayTokenInfo' | 'getTokenInfoMEAI' | 'answerToLife' | 'toolhouse' | 'brightUnionGetQuoteTool' | 'brightUnionGetCoverablesTool'>;
            };
            /**
             * Text that can be used to generate a voice preview.
             */
            voicePreviewText?: string;
        },
    ): CancelablePromise<{
        /**
         * Indicates if the replica was created successfully
         */
        success: boolean;
        /**
         * The replica UUID
         */
        uuid: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/replicas',
            headers: {
                'X-API-Version': xApiVersion,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                401: `Unauthorized`,
                404: `Not Found`,
                409: `Conflict`,
                415: `Unsupported Media Type`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get a replica
     * Get an existing replica.
     * @param replicaUuid
     * @param xApiVersion
     * @returns any The requested replica
     * @throws ApiError
     */
    public static getV1Replicas1(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * The name of the replica.
         */
        name: string;
        /**
         * The purpose of the replica. This field is not used for training the replica.
         */
        purpose?: string;
        /**
         * A short description of your replica. This field is not used for training the replica.
         */
        shortDescription: string;
        /**
         * The first thing your replica will say when you start a conversation with them.
         */
        greeting: string;
        /**
         * The replica type.
         * `individual`: A replica of yourself.
         * `character`: A replica of a character: can be anything you want.
         * `brand`: A replica of a business persona or organization.
         *
         */
        type?: 'individual' | 'character' | 'brand';
        /**
         * The replica owner ID.
         */
        ownerID: string;
        /**
         * Visibility of the replica. When set to `true`, only the owner and users on the allowlist will be able to find the replica and chat with it.
         */
        private?: boolean;
        /**
         * Emails of users who can use the replica when the replica is private.
         */
        whitelistEmails?: Array<string>;
        /**
         * The slug of the replica. Slugs can be used by API consumers to determine the URLs where replicas can be found.
         */
        slug: string;
        /**
         * The tags associated with the replica. Tags help categorize replicas and make them easier to find.
         */
        tags?: Array<string>;
        /**
         * The URL of the profile image of the replica. The image will be downloaded, optimized and stored on our servers, so the URL in the response will be different. Supported formats: .jpg, .jpeg, .png, .bmp, .webp, .avif
         */
        profileImage?: string;
        /**
         * Suggested questions when starting a conversation.
         */
        suggestedQuestions?: Array<string>;
        llm: {
            /**
             * The LLM model of the replica.
             */
            model?: 'gpt-4o' | 'claude-3-5-haiku-latest' | 'claude-3-7-sonnet-latest' | 'claude-4-sonnet-20250514' | 'grok-2-latest' | 'grok-3-beta' | 'deepseek-chat' | 'o3-mini' | 'gpt-4o-mini' | 'huggingface-eva' | 'huggingface-dolphin-llama';
            /**
             * Deprecated. The system will automatically choose the best approach.
             * @deprecated
             */
            memoryMode?: 'prompt-caching' | 'rag-search';
            /**
             * Who is your replica? How do you want it to talk, respond and act.
             */
            systemMessage?: string;
            /**
             * The replica's tools. Tools enable agents to interact with the world. `getTokenInfo`: Allows replica to get token information
             *
             */
            tools?: Array<'getTokenInfo' | 'getUdaoTokenInfo' | 'getSensayTokenInfo' | 'getTokenInfoMEAI' | 'answerToLife' | 'toolhouse' | 'brightUnionGetQuoteTool' | 'brightUnionGetCoverablesTool'>;
        };
        /**
         * Text that can be used to generate a voice preview.
         */
        voicePreviewText?: string;
        /**
         * The replica UUID
         */
        uuid: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}',
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
     * Delete a replica
     * Deletes a replica by UUID.
     * @param replicaUuid
     * @param xApiVersion
     * @returns any Replica has been deleted
     * @throws ApiError
     */
    public static deleteV1Replicas(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates if the replica was deleted successfully
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/v1/replicas/{replicaUUID}',
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
     * Updates a replica
     * Updates an existing replica.
     * @param replicaUuid
     * @param xApiVersion
     * @param requestBody
     * @returns any The request outcome
     * @throws ApiError
     */
    public static putV1Replicas(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
        requestBody?: {
            /**
             * The name of the replica.
             */
            name: string;
            /**
             * The purpose of the replica. This field is not used for training the replica.
             */
            purpose?: string;
            /**
             * A short description of your replica. This field is not used for training the replica.
             */
            shortDescription: string;
            /**
             * The first thing your replica will say when you start a conversation with them.
             */
            greeting: string;
            /**
             * The replica type.
             * `individual`: A replica of yourself.
             * `character`: A replica of a character: can be anything you want.
             * `brand`: A replica of a business persona or organization.
             *
             */
            type?: 'individual' | 'character' | 'brand';
            /**
             * The replica owner ID.
             */
            ownerID: string;
            /**
             * Visibility of the replica. When set to `true`, only the owner and users on the allowlist will be able to find the replica and chat with it.
             */
            private?: boolean;
            /**
             * Emails of users who can use the replica when the replica is private.
             */
            whitelistEmails?: Array<string>;
            /**
             * The slug of the replica. Slugs can be used by API consumers to determine the URLs where replicas can be found.
             */
            slug: string;
            /**
             * The tags associated with the replica. Tags help categorize replicas and make them easier to find.
             */
            tags?: Array<string>;
            /**
             * The URL of the profile image of the replica. The image will be downloaded, optimized and stored on our servers, so the URL in the response will be different. Supported formats: .jpg, .jpeg, .png, .bmp, .webp, .avif
             */
            profileImage?: string;
            /**
             * Suggested questions when starting a conversation.
             */
            suggestedQuestions?: Array<string>;
            llm: {
                /**
                 * The LLM model of the replica.
                 */
                model?: 'gpt-4o' | 'claude-3-5-haiku-latest' | 'claude-3-7-sonnet-latest' | 'claude-4-sonnet-20250514' | 'grok-2-latest' | 'grok-3-beta' | 'deepseek-chat' | 'o3-mini' | 'gpt-4o-mini' | 'huggingface-eva' | 'huggingface-dolphin-llama';
                /**
                 * Deprecated. The system will automatically choose the best approach.
                 * @deprecated
                 */
                memoryMode?: 'prompt-caching' | 'rag-search';
                /**
                 * Who is your replica? How do you want it to talk, respond and act.
                 */
                systemMessage?: string;
                /**
                 * The replica's tools. Tools enable agents to interact with the world. `getTokenInfo`: Allows replica to get token information
                 *
                 */
                tools?: Array<'getTokenInfo' | 'getUdaoTokenInfo' | 'getSensayTokenInfo' | 'getTokenInfoMEAI' | 'answerToLife' | 'toolhouse' | 'brightUnionGetQuoteTool' | 'brightUnionGetCoverablesTool'>;
            };
            /**
             * Text that can be used to generate a voice preview.
             */
            voicePreviewText?: string;
        },
    ): CancelablePromise<{
        /**
         * Indicates if the replica was created successfully
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/v1/replicas/{replicaUUID}',
            path: {
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                401: `Unauthorized`,
                404: `Not Found`,
                409: `Conflict`,
                415: `Unsupported Media Type`,
                500: `Internal Server Error`,
            },
        });
    }
}
