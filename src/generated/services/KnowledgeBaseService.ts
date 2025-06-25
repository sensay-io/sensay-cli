/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { knowledgeBaseID_parameter } from '../models/knowledgeBaseID_parameter';
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { WebhookRequest } from '../models/WebhookRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class KnowledgeBaseService {
    /**
     * Create a knowledge base entry
     * Creates a new knowledge base entry for a replica based on text, file, URL, or Youtube Videos. For YouTube playlists, the system will automatically create separate entries for each video in the playlist.
     * @param replicaUuid
     * @param xApiVersion
     * @param requestBody
     * @returns any The created knowledge base entry
     * @throws ApiError
     */
    public static postV1ReplicasKnowledgeBase(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
        requestBody?: {
            /**
             * Public URL to ingest into the knowledge-base.
             * The URL must be publicly accessible without authentication. Dynamic content (e.g. Single Page Applications) are partially supported. Only the rendered text on the web page is used for training, embedded media (image, video, audio) is not used. For training using video files, please provide YouTube links in one of the following formats:
             * https://www.youtube.com/watch?v=VIDEO_ID
             * https://www.youtube.com/shorts/SHORT_VIDEO_ID
             * https://www.youtube.com/playlist?list=PLAYLIST_ID
             */
            url?: string;
            /**
             * Whether to allow automatic content updates from the URL, handled by the system.
             */
            autoRefresh?: boolean;
            /**
             * The text content you want your replica to learn
             */
            text?: string;
            /**
             * The name of the file that you intend/will upload. Supported files types:
             *
             * - Microsoft Word: .doc, .docx, .rtf
             * - Microsoft Excel: .xls, .xlsx
             * - PDF files: .pdf, .pdfa
             * - Data text files: .csv, .tsv, .json, .yml, .yaml
             * - Text files: .txt, .md
             * - Ebooks: .epub, .mobi, .ibooks
             * - Images: .png, .jpg, .jpeg, .webp, .heic, .heif
             * - Voice (audio): .wav, .mp3, .aiff, .aac, .flac, .ogg
             * - Videos (max 90 min): .mp4, .mpeg, .mov, .avi, .flv, .webm, .wmv, .3gp, .ogg
             *
             */
            filename?: string;
        },
    ): CancelablePromise<{
        /**
         * Indicates if the knowledge base entry was created successfully
         */
        success: boolean;
        /**
         * Array of results for each knowledge base entry created
         */
        results: Array<({
            /**
             * The type of knowledge base entry
             */
            type: 'file' | 'text' | 'website' | 'youtube';
            /**
             * Indicates that the knowledge base entry creation has been enqueued for processing
             */
            enqueued: boolean;
            /**
             * The unique identifier for the newly created knowledge base entry.
             */
            knowledgeBaseID: number;
            /**
             * The temporary URL where you should upload your file using a PUT request
             */
            signedURL?: string;
        } | {
            /**
             * The type of knowledge base entry
             */
            type: 'file' | 'text' | 'website' | 'youtube';
            /**
             * Indicates that the knowledge base entry creation has not been enqueued due to an error
             */
            enqueued: boolean;
            /**
             * Error message if the knowledge base entry creation failed
             */
            error: string;
        })>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/replicas/{replicaUUID}/knowledge-base',
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
                409: `URL already exists in the knowledge base`,
                415: `Unsupported Media Type`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * List all knowledge base entries
     * Returns a list of all knowledge base entries belonging to your organization. This endpoint allows you to view all your training data in one place, with optional filtering by status or type. You can use this to monitor the overall state of your knowledge base, check which entries are still processing, and identify any that might have encountered errors. The response includes detailed information about each entry including its content, status, and metadata.
     * @param replicaUuid
     * @param status
     * @param type
     * @param page
     * @param pageSize
     * @param sortBy Sorts by creation date.
     * @param sortOrder
     * @param xApiVersion
     * @returns any List of knowledge base entries returned successfully.
     * @throws ApiError
     */
    public static getV1ReplicasKnowledgeBase(
        replicaUuid: replicaUUID_parameter,
        status?: 'NEW' | 'FILE_UPLOADED' | 'RAW_TEXT' | 'PROCESSED_TEXT' | 'VECTOR_CREATED' | 'READY' | 'UNPROCESSABLE',
        type?: 'file' | 'text' | 'website' | 'youtube',
        page: number = 1,
        pageSize?: number | null,
        sortBy: 'createdAt' = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc',
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates if the list operation was successful
         */
        success: boolean;
        /**
         * Array of knowledge base entries matching your query parameters
         */
        items: Array<{
            /**
             * The unique identifier for this knowledge base entry.
             */
            id: number;
            /**
             * The unique identifier of the replica associated to this knowledge base entry.
             */
            replicaUUID?: string;
            /**
             * The type of knowledge base entry, indicating how the content was added and how it should be processed.
             */
            type: 'file' | 'text' | 'website' | 'youtube';
            /**
             * The URL provided during entry creation, if applicable.
             */
            url?: string;
            /**
             * The current stage in the processing pipeline. Use this to track progress and identify any issues with processing.
             */
            status: 'NEW' | 'FILE_UPLOADED' | 'RAW_TEXT' | 'PROCESSED_TEXT' | 'VECTOR_CREATED' | 'READY' | 'UNPROCESSABLE';
            /**
             * The ISO 8601 timestamp indicating when this knowledge base entry was created.
             */
            createdAt: string;
            /**
             * The ISO 8601 timestamp indicating when this knowledge base entry was last updated. Useful for tracking the completion time of processing.
             */
            updatedAt: string;
            /**
             * Optional title for the knowledge base entry, to help identify the knowledge base entry in listings. This field is not used in processing or internal logic.
             */
            title?: string;
            /**
             * A concise 1-2 sentence summary of rawText, generated by the system.
             */
            summary?: string;
            /**
             * Website content related to the knowledge base entry
             */
            website?: {
                /**
                 * URL of the website related to the knowledge base entry.
                 */
                url: string;
                /**
                 * HTML content of the knowledge base entry.
                 */
                html?: string;
                /**
                 * Links related to the knowledge base entry.
                 */
                links?: Array<string>;
                /**
                 * Title of the website.
                 */
                title?: string;
                /**
                 * Text content of the website.
                 */
                text?: string;
                /**
                 * A brief description of the website content based on extracted html.
                 */
                description?: string;
                /**
                 * Whether to allow automatic content updates from the URL, handled by the system.
                 */
                autoRefresh?: boolean;
                /**
                 * Screenshot in Base64 format of the knowledge base entry.
                 */
                screenshot?: string;
            };
            /**
             * YouTube content related to the knowledge base entry
             */
            youtube?: {
                /**
                 * URL of the YouTube video related to the knowledge base entry
                 */
                url: string;
                /**
                 * Title of the YouTube video
                 */
                title?: string;
                /**
                 * Description of the YouTube video
                 */
                description?: string;
                /**
                 * URL of the YouTube video thumbnail
                 */
                thumbnailURL?: string;
                /**
                 * A concise 1-2 sentence summary of rawText.
                 */
                summary?: string;
                /**
                 * Full transcript of the YouTube video.
                 */
                transcription?: string;
                /**
                 * Visual transcription of the YouTube video
                 */
                visualTranscription?: string;
                /**
                 * ID of the YouTube playlist associated with this knowledge base entry
                 */
                playlistID?: string;
            };
            /**
             * File content related to the knowledge base entry
             */
            file?: {
                /**
                 * Name of the file associated with the knowledge base entry
                 */
                name: string;
                /**
                 * Size of the file in bytes
                 */
                size?: number | null;
                /**
                 * MIME type of the file
                 */
                mimeType?: string | null;
                /**
                 * Screenshot in Base64 format of the knowledge base entry
                 */
                screenshot?: string;
            };
            /**
             * Error information related to the knowledge base entry
             */
            error?: {
                /**
                 * A unique identifier of the error, useful for reporting
                 */
                fingerprint?: string;
                /**
                 * Error message associated with this knowledge base entry
                 */
                message?: string;
            };
        }>;
        /**
         * The total number of knowledge base entries.
         */
        total: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/knowledge-base',
            path: {
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            query: {
                'status': status,
                'type': type,
                'page': page,
                'pageSize': pageSize,
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
     * Update knowledge base entry
     * Updates a knowledge base entry with training content. This is the second step in the training process after creating an entry. You can provide "rawText" which is the content you want your replica to learn from (such as product information, company policies, or specialized knowledge). The system will automatically process this text and make it available for your replica to use when answering questions. The entry status will change to PROCESSING and then to READY once fully processed.
     * @param knowledgeBaseId
     * @param replicaUuid
     * @param requestBody
     * @returns any Knowledge base entry updated successfully.
     * @throws ApiError
     */
    public static patchV1ReplicasKnowledgeBase(
        knowledgeBaseId: knowledgeBaseID_parameter,
        replicaUuid: replicaUUID_parameter,
        requestBody?: {
            /**
             * The initial text content you want your replica to learn. This is the information you provide that will be processed and optimized for the knowledge base.
             */
            rawText?: string;
            /**
             * Pre-processed text that is ready to be added to the knowledge base. This is typically used when you have already optimized the text format.
             * @deprecated
             */
            processedText?: string;
            /**
             * Generated facts related to the knowledge base entry.
             */
            generatedFacts?: Array<string>;
            /**
             * Segments of textual content that have been extracted from the original sources and split into smaller, manageable pieces.
             */
            generatedChunks?: Array<{
                content?: string;
                chunkIndex?: number;
                chunkTokens?: number;
                chunkChars?: number;
            }>;
            /**
             * Internal field.
             */
            qdrantPoints?: Array<string>;
            /**
             * Internal field. The ID of the vector entry in the database. This indicates the information has been fully processed and is ready for retrieval.
             */
            vectorEntryID?: string;
            /**
             * The current stage in the processing pipeline.
             */
            status?: 'NEW' | 'FILE_UPLOADED' | 'RAW_TEXT' | 'PROCESSED_TEXT' | 'VECTOR_CREATED' | 'READY' | 'UNPROCESSABLE';
            /**
             * Optional title for this knowledge base entry. Helps identify the content in listings.
             */
            title?: string;
            /**
             * A concise 1-2 sentence summary of rawText.
             */
            summary?: string;
            /**
             * Website content related to the knowledge base entry
             */
            website?: {
                /**
                 * URL of the website related to the knowledge base entry.
                 */
                url?: string;
                /**
                 * HTML content of the knowledge base entry.
                 */
                html?: string;
                /**
                 * Links related to the knowledge base entry.
                 */
                links?: Array<string>;
                /**
                 * Title of the website.
                 */
                title?: string;
                /**
                 * Text content of the website.
                 */
                text?: string;
                /**
                 * A brief description of the website content based on extracted html.
                 */
                description?: string;
                /**
                 * Whether to allow automatic content updates from the URL, handled by the system.
                 */
                autoRefresh?: boolean;
                /**
                 * Screenshot in Base64 format of the knowledge base entry.
                 */
                screenshot?: string;
            };
            /**
             * YouTube content related to the knowledge base entry
             */
            youtube?: {
                /**
                 * URL of the YouTube video related to the knowledge base entry
                 */
                url?: string;
                /**
                 * Title of the YouTube video
                 */
                title?: string;
                /**
                 * Description of the YouTube video
                 */
                description?: string;
                /**
                 * URL of the YouTube video thumbnail
                 */
                thumbnailURL?: string;
                /**
                 * A concise 1-2 sentence summary of rawText.
                 */
                summary?: string;
                /**
                 * Full transcript of the YouTube video.
                 */
                transcription?: string;
                /**
                 * Visual transcription of the YouTube video
                 */
                visualTranscription?: string;
            };
            /**
             * File content related to the knowledge base entry
             */
            file?: {
                /**
                 * Name of the file associated with the knowledge base entry
                 */
                name?: string;
                /**
                 * Size of the file in bytes
                 */
                size?: number | null;
                /**
                 * MIME type of the file
                 */
                mimeType?: string | null;
                /**
                 * Screenshot in Base64 format of the knowledge base entry
                 */
                screenshot?: string;
            };
            /**
             * Error information related to the knowledge base entry
             */
            error?: {
                /**
                 * A unique identifier of the error, useful for reporting
                 */
                fingerprint: string;
                /**
                 * Error message associated with this knowledge base entry
                 */
                message: string;
            };
        },
    ): CancelablePromise<{
        /**
         * Indicates if the knowledge base update was successful
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/v1/replicas/{replicaUUID}/knowledge-base/{knowledgeBaseID}',
            path: {
                'knowledgeBaseID': knowledgeBaseId,
                'replicaUUID': replicaUuid,
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
     * Delete knowledge base entry by ID
     * Permanently removes a specific knowledge base entry and its associated vector database entry. Use this endpoint when you need to remove outdated or incorrect training data from your replica's knowledge base. This operation cannot be undone, and the entry will no longer be available for retrieval during conversations with your replica. In most cases, the deletion is completed immediately. However, in some scenarios, part of the deletion process may be delayed. This means that while the request has been accepted and the deletion process has started, some associated data may remain temporarily available and will be removed within 24 hours.
     * @param knowledgeBaseId
     * @param replicaUuid
     * @param xApiVersion
     * @returns any The knowledge base entry was deleted successfully.
     * @throws ApiError
     */
    public static deleteV1ReplicasKnowledgeBase(
        knowledgeBaseId: knowledgeBaseID_parameter,
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
            url: '/v1/replicas/{replicaUUID}/knowledge-base/{knowledgeBaseID}',
            path: {
                'knowledgeBaseID': knowledgeBaseId,
                'replicaUUID': replicaUuid,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            errors: {
                404: `Knowledge base entry not found.`,
            },
        });
    }
    /**
     * Get knowledge base entry by ID
     * Retrieves detailed information about a specific knowledge base entry using its ID. This endpoint returns the complete entry data including its type, status, content, and metadata. You can use this to check the processing status of your training content, view the raw and processed text, and see when it was created and last updated. This is useful for monitoring the progress of your training data as it moves through the processing pipeline.
     * @param knowledgeBaseId
     * @param replicaUuid
     * @param xApiVersion
     * @returns any The requested knowledge base entry.
     * @throws ApiError
     */
    public static getV1ReplicasKnowledgeBase1(
        knowledgeBaseId: knowledgeBaseID_parameter,
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * The unique identifier for this knowledge base entry.
         */
        id: number;
        /**
         * The unique identifier of the replica associated to this knowledge base entry.
         */
        replicaUUID?: string;
        /**
         * The type of knowledge base entry, indicating how the content was added and how it should be processed.
         */
        type: 'file' | 'text' | 'website' | 'youtube';
        /**
         * The URL provided during entry creation, if applicable.
         */
        url?: string;
        /**
         * The current stage in the processing pipeline. Use this to track progress and identify any issues with processing.
         */
        status: 'NEW' | 'FILE_UPLOADED' | 'RAW_TEXT' | 'PROCESSED_TEXT' | 'VECTOR_CREATED' | 'READY' | 'UNPROCESSABLE';
        /**
         * The ISO 8601 timestamp indicating when this knowledge base entry was created.
         */
        createdAt: string;
        /**
         * The ISO 8601 timestamp indicating when this knowledge base entry was last updated. Useful for tracking the completion time of processing.
         */
        updatedAt: string;
        /**
         * Optional title for the knowledge base entry, to help identify the knowledge base entry in listings. This field is not used in processing or internal logic.
         */
        title?: string;
        /**
         * A concise 1-2 sentence summary of rawText, generated by the system.
         */
        summary?: string;
        /**
         * Website content related to the knowledge base entry
         */
        website?: {
            /**
             * URL of the website related to the knowledge base entry.
             */
            url: string;
            /**
             * HTML content of the knowledge base entry.
             */
            html?: string;
            /**
             * Links related to the knowledge base entry.
             */
            links?: Array<string>;
            /**
             * Title of the website.
             */
            title?: string;
            /**
             * Text content of the website.
             */
            text?: string;
            /**
             * A brief description of the website content based on extracted html.
             */
            description?: string;
            /**
             * Whether to allow automatic content updates from the URL, handled by the system.
             */
            autoRefresh?: boolean;
            /**
             * Screenshot in Base64 format of the knowledge base entry.
             */
            screenshot?: string;
        };
        /**
         * YouTube content related to the knowledge base entry
         */
        youtube?: {
            /**
             * URL of the YouTube video related to the knowledge base entry
             */
            url: string;
            /**
             * Title of the YouTube video
             */
            title?: string;
            /**
             * Description of the YouTube video
             */
            description?: string;
            /**
             * URL of the YouTube video thumbnail
             */
            thumbnailURL?: string;
            /**
             * A concise 1-2 sentence summary of rawText.
             */
            summary?: string;
            /**
             * Full transcript of the YouTube video.
             */
            transcription?: string;
            /**
             * Visual transcription of the YouTube video
             */
            visualTranscription?: string;
            /**
             * ID of the YouTube playlist associated with this knowledge base entry
             */
            playlistID?: string;
        };
        /**
         * File content related to the knowledge base entry
         */
        file?: {
            /**
             * Name of the file associated with the knowledge base entry
             */
            name: string;
            /**
             * Size of the file in bytes
             */
            size?: number | null;
            /**
             * MIME type of the file
             */
            mimeType?: string | null;
            /**
             * Screenshot in Base64 format of the knowledge base entry
             */
            screenshot?: string;
        };
        /**
         * Error information related to the knowledge base entry
         */
        error?: {
            /**
             * A unique identifier of the error, useful for reporting
             */
            fingerprint?: string;
            /**
             * Error message associated with this knowledge base entry
             */
            message?: string;
        };
        /**
         * The original, unmodified text content that was submitted for training. May be truncated for large entries.
         */
        rawText?: string;
        /**
         * The optimized version of the text after system processing. This is what gets converted to vectors for retrieval.
         * @deprecated
         */
        processedText?: string;
        /**
         * Generated facts related to the knowledge base entry.
         */
        generatedFacts?: Array<string>;
        /**
         * Segments of textual content that have been extracted from the original sources and split into smaller, manageable pieces.
         */
        generatedChunks?: Array<{
            content?: string;
            chunkIndex?: number;
            chunkTokens?: number;
            chunkChars?: number;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/knowledge-base/{knowledgeBaseID}',
            path: {
                'knowledgeBaseID': knowledgeBaseId,
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
     * Update knowledge base entry
     * Updates a knowledge base entry with training content. This is the second step in the training process after creating an entry. You can provide "rawText" which is the content you want your replica to learn from (such as product information, company policies, or specialized knowledge). The system will automatically process this text and make it available for your replica to use when answering questions. The entry status will change to PROCESSING and then to READY once fully processed.
     * @param knowledgeBaseId
     * @param requestBody
     * @returns any Knowledge base entry updated successfully.
     * @throws ApiError
     */
    public static patchV1KnowledgeBase(
        knowledgeBaseId: knowledgeBaseID_parameter,
        requestBody?: {
            /**
             * The initial text content you want your replica to learn. This is the information you provide that will be processed and optimized for the knowledge base.
             */
            rawText?: string;
            /**
             * Pre-processed text that is ready to be added to the knowledge base. This is typically used when you have already optimized the text format.
             * @deprecated
             */
            processedText?: string;
            /**
             * Generated facts related to the knowledge base entry.
             */
            generatedFacts?: Array<string>;
            /**
             * Segments of textual content that have been extracted from the original sources and split into smaller, manageable pieces.
             */
            generatedChunks?: Array<{
                content?: string;
                chunkIndex?: number;
                chunkTokens?: number;
                chunkChars?: number;
            }>;
            /**
             * Internal field.
             */
            qdrantPoints?: Array<string>;
            /**
             * Internal field. The ID of the vector entry in the database. This indicates the information has been fully processed and is ready for retrieval.
             */
            vectorEntryID?: string;
            /**
             * The current stage in the processing pipeline.
             */
            status?: 'NEW' | 'FILE_UPLOADED' | 'RAW_TEXT' | 'PROCESSED_TEXT' | 'VECTOR_CREATED' | 'READY' | 'UNPROCESSABLE';
            /**
             * Optional title for this knowledge base entry. Helps identify the content in listings.
             */
            title?: string;
            /**
             * A concise 1-2 sentence summary of rawText.
             */
            summary?: string;
            /**
             * Website content related to the knowledge base entry
             */
            website?: {
                /**
                 * URL of the website related to the knowledge base entry.
                 */
                url?: string;
                /**
                 * HTML content of the knowledge base entry.
                 */
                html?: string;
                /**
                 * Links related to the knowledge base entry.
                 */
                links?: Array<string>;
                /**
                 * Title of the website.
                 */
                title?: string;
                /**
                 * Text content of the website.
                 */
                text?: string;
                /**
                 * A brief description of the website content based on extracted html.
                 */
                description?: string;
                /**
                 * Whether to allow automatic content updates from the URL, handled by the system.
                 */
                autoRefresh?: boolean;
                /**
                 * Screenshot in Base64 format of the knowledge base entry.
                 */
                screenshot?: string;
            };
            /**
             * YouTube content related to the knowledge base entry
             */
            youtube?: {
                /**
                 * URL of the YouTube video related to the knowledge base entry
                 */
                url?: string;
                /**
                 * Title of the YouTube video
                 */
                title?: string;
                /**
                 * Description of the YouTube video
                 */
                description?: string;
                /**
                 * URL of the YouTube video thumbnail
                 */
                thumbnailURL?: string;
                /**
                 * A concise 1-2 sentence summary of rawText.
                 */
                summary?: string;
                /**
                 * Full transcript of the YouTube video.
                 */
                transcription?: string;
                /**
                 * Visual transcription of the YouTube video
                 */
                visualTranscription?: string;
            };
            /**
             * File content related to the knowledge base entry
             */
            file?: {
                /**
                 * Name of the file associated with the knowledge base entry
                 */
                name?: string;
                /**
                 * Size of the file in bytes
                 */
                size?: number | null;
                /**
                 * MIME type of the file
                 */
                mimeType?: string | null;
                /**
                 * Screenshot in Base64 format of the knowledge base entry
                 */
                screenshot?: string;
            };
            /**
             * Error information related to the knowledge base entry
             */
            error?: {
                /**
                 * A unique identifier of the error, useful for reporting
                 */
                fingerprint: string;
                /**
                 * Error message associated with this knowledge base entry
                 */
                message: string;
            };
        },
    ): CancelablePromise<{
        /**
         * Indicates if the knowledge base update was successful
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/v1/knowledge-base/{knowledgeBaseID}',
            path: {
                'knowledgeBaseID': knowledgeBaseId,
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
     * Delete knowledge base entry by ID
     * Permanently removes a specific knowledge base entry and its associated vector database entry. Use this endpoint when you need to remove outdated or incorrect training data from your replica's knowledge base. This operation cannot be undone, and the entry will no longer be available for retrieval during conversations with your replica. In most cases, the deletion is completed immediately. However, in some scenarios, part of the deletion process may be delayed. This means that while the request has been accepted and the deletion process has started, some associated data may remain temporarily available and will be removed within 24 hours.
     * @param knowledgeBaseId
     * @param xApiVersion
     * @returns any The knowledge base entry was deleted successfully.
     * @throws ApiError
     */
    public static deleteV1KnowledgeBase(
        knowledgeBaseId: knowledgeBaseID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/v1/knowledge-base/{knowledgeBaseID}',
            path: {
                'knowledgeBaseID': knowledgeBaseId,
            },
            headers: {
                'X-API-Version': xApiVersion,
            },
            errors: {
                404: `Knowledge base entry not found.`,
            },
        });
    }
    /**
     * Get knowledge base entry by ID
     * Retrieves detailed information about a specific knowledge base entry using its ID. This endpoint returns the complete entry data including its type, status, content, and metadata. You can use this to check the processing status of your training content, view the raw and processed text, and see when it was created and last updated. This is useful for monitoring the progress of your training data as it moves through the processing pipeline.
     * @param knowledgeBaseId
     * @param xApiVersion
     * @returns any The requested knowledge base entry.
     * @throws ApiError
     */
    public static getV1KnowledgeBase(
        knowledgeBaseId: knowledgeBaseID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * The unique identifier for this knowledge base entry.
         */
        id: number;
        /**
         * The unique identifier of the replica associated to this knowledge base entry.
         */
        replicaUUID?: string;
        /**
         * The type of knowledge base entry, indicating how the content was added and how it should be processed.
         */
        type: 'file' | 'text' | 'website' | 'youtube';
        /**
         * The URL provided during entry creation, if applicable.
         */
        url?: string;
        /**
         * The current stage in the processing pipeline. Use this to track progress and identify any issues with processing.
         */
        status: 'NEW' | 'FILE_UPLOADED' | 'RAW_TEXT' | 'PROCESSED_TEXT' | 'VECTOR_CREATED' | 'READY' | 'UNPROCESSABLE';
        /**
         * The ISO 8601 timestamp indicating when this knowledge base entry was created.
         */
        createdAt: string;
        /**
         * The ISO 8601 timestamp indicating when this knowledge base entry was last updated. Useful for tracking the completion time of processing.
         */
        updatedAt: string;
        /**
         * Optional title for the knowledge base entry, to help identify the knowledge base entry in listings. This field is not used in processing or internal logic.
         */
        title?: string;
        /**
         * A concise 1-2 sentence summary of rawText, generated by the system.
         */
        summary?: string;
        /**
         * Website content related to the knowledge base entry
         */
        website?: {
            /**
             * URL of the website related to the knowledge base entry.
             */
            url: string;
            /**
             * HTML content of the knowledge base entry.
             */
            html?: string;
            /**
             * Links related to the knowledge base entry.
             */
            links?: Array<string>;
            /**
             * Title of the website.
             */
            title?: string;
            /**
             * Text content of the website.
             */
            text?: string;
            /**
             * A brief description of the website content based on extracted html.
             */
            description?: string;
            /**
             * Whether to allow automatic content updates from the URL, handled by the system.
             */
            autoRefresh?: boolean;
            /**
             * Screenshot in Base64 format of the knowledge base entry.
             */
            screenshot?: string;
        };
        /**
         * YouTube content related to the knowledge base entry
         */
        youtube?: {
            /**
             * URL of the YouTube video related to the knowledge base entry
             */
            url: string;
            /**
             * Title of the YouTube video
             */
            title?: string;
            /**
             * Description of the YouTube video
             */
            description?: string;
            /**
             * URL of the YouTube video thumbnail
             */
            thumbnailURL?: string;
            /**
             * A concise 1-2 sentence summary of rawText.
             */
            summary?: string;
            /**
             * Full transcript of the YouTube video.
             */
            transcription?: string;
            /**
             * Visual transcription of the YouTube video
             */
            visualTranscription?: string;
            /**
             * ID of the YouTube playlist associated with this knowledge base entry
             */
            playlistID?: string;
        };
        /**
         * File content related to the knowledge base entry
         */
        file?: {
            /**
             * Name of the file associated with the knowledge base entry
             */
            name: string;
            /**
             * Size of the file in bytes
             */
            size?: number | null;
            /**
             * MIME type of the file
             */
            mimeType?: string | null;
            /**
             * Screenshot in Base64 format of the knowledge base entry
             */
            screenshot?: string;
        };
        /**
         * Error information related to the knowledge base entry
         */
        error?: {
            /**
             * A unique identifier of the error, useful for reporting
             */
            fingerprint?: string;
            /**
             * Error message associated with this knowledge base entry
             */
            message?: string;
        };
        /**
         * The original, unmodified text content that was submitted for training. May be truncated for large entries.
         */
        rawText?: string;
        /**
         * The optimized version of the text after system processing. This is what gets converted to vectors for retrieval.
         * @deprecated
         */
        processedText?: string;
        /**
         * Generated facts related to the knowledge base entry.
         */
        generatedFacts?: Array<string>;
        /**
         * Segments of textual content that have been extracted from the original sources and split into smaller, manageable pieces.
         */
        generatedChunks?: Array<{
            content?: string;
            chunkIndex?: number;
            chunkTokens?: number;
            chunkChars?: number;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/knowledge-base/{knowledgeBaseID}',
            path: {
                'knowledgeBaseID': knowledgeBaseId,
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
     * List all knowledge base entries
     * Returns a list of all knowledge base entries belonging to your organization. This endpoint allows you to view all your training data in one place, with optional filtering by status or type. You can use this to monitor the overall state of your knowledge base, check which entries are still processing, and identify any that might have encountered errors. The response includes detailed information about each entry including its content, status, and metadata.
     * @param status
     * @param type
     * @param page
     * @param pageSize
     * @param sortBy Sorts by creation date.
     * @param sortOrder
     * @param xApiVersion
     * @returns any List of knowledge base entries returned successfully.
     * @throws ApiError
     */
    public static getV1KnowledgeBase1(
        status?: 'NEW' | 'FILE_UPLOADED' | 'RAW_TEXT' | 'PROCESSED_TEXT' | 'VECTOR_CREATED' | 'READY' | 'UNPROCESSABLE',
        type?: 'file' | 'text' | 'website' | 'youtube',
        page: number = 1,
        pageSize?: number | null,
        sortBy: 'createdAt' = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc',
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates if the list operation was successful
         */
        success: boolean;
        /**
         * Array of knowledge base entries matching your query parameters
         */
        items: Array<{
            /**
             * The unique identifier for this knowledge base entry.
             */
            id: number;
            /**
             * The unique identifier of the replica associated to this knowledge base entry.
             */
            replicaUUID?: string;
            /**
             * The type of knowledge base entry, indicating how the content was added and how it should be processed.
             */
            type: 'file' | 'text' | 'website' | 'youtube';
            /**
             * The URL provided during entry creation, if applicable.
             */
            url?: string;
            /**
             * The current stage in the processing pipeline. Use this to track progress and identify any issues with processing.
             */
            status: 'NEW' | 'FILE_UPLOADED' | 'RAW_TEXT' | 'PROCESSED_TEXT' | 'VECTOR_CREATED' | 'READY' | 'UNPROCESSABLE';
            /**
             * The ISO 8601 timestamp indicating when this knowledge base entry was created.
             */
            createdAt: string;
            /**
             * The ISO 8601 timestamp indicating when this knowledge base entry was last updated. Useful for tracking the completion time of processing.
             */
            updatedAt: string;
            /**
             * Optional title for the knowledge base entry, to help identify the knowledge base entry in listings. This field is not used in processing or internal logic.
             */
            title?: string;
            /**
             * A concise 1-2 sentence summary of rawText, generated by the system.
             */
            summary?: string;
            /**
             * Website content related to the knowledge base entry
             */
            website?: {
                /**
                 * URL of the website related to the knowledge base entry.
                 */
                url: string;
                /**
                 * HTML content of the knowledge base entry.
                 */
                html?: string;
                /**
                 * Links related to the knowledge base entry.
                 */
                links?: Array<string>;
                /**
                 * Title of the website.
                 */
                title?: string;
                /**
                 * Text content of the website.
                 */
                text?: string;
                /**
                 * A brief description of the website content based on extracted html.
                 */
                description?: string;
                /**
                 * Whether to allow automatic content updates from the URL, handled by the system.
                 */
                autoRefresh?: boolean;
                /**
                 * Screenshot in Base64 format of the knowledge base entry.
                 */
                screenshot?: string;
            };
            /**
             * YouTube content related to the knowledge base entry
             */
            youtube?: {
                /**
                 * URL of the YouTube video related to the knowledge base entry
                 */
                url: string;
                /**
                 * Title of the YouTube video
                 */
                title?: string;
                /**
                 * Description of the YouTube video
                 */
                description?: string;
                /**
                 * URL of the YouTube video thumbnail
                 */
                thumbnailURL?: string;
                /**
                 * A concise 1-2 sentence summary of rawText.
                 */
                summary?: string;
                /**
                 * Full transcript of the YouTube video.
                 */
                transcription?: string;
                /**
                 * Visual transcription of the YouTube video
                 */
                visualTranscription?: string;
                /**
                 * ID of the YouTube playlist associated with this knowledge base entry
                 */
                playlistID?: string;
            };
            /**
             * File content related to the knowledge base entry
             */
            file?: {
                /**
                 * Name of the file associated with the knowledge base entry
                 */
                name: string;
                /**
                 * Size of the file in bytes
                 */
                size?: number | null;
                /**
                 * MIME type of the file
                 */
                mimeType?: string | null;
                /**
                 * Screenshot in Base64 format of the knowledge base entry
                 */
                screenshot?: string;
            };
            /**
             * Error information related to the knowledge base entry
             */
            error?: {
                /**
                 * A unique identifier of the error, useful for reporting
                 */
                fingerprint?: string;
                /**
                 * Error message associated with this knowledge base entry
                 */
                message?: string;
            };
        }>;
        /**
         * The total number of knowledge base entries.
         */
        total: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/knowledge-base',
            headers: {
                'X-API-Version': xApiVersion,
            },
            query: {
                'status': status,
                'type': type,
                'page': page,
                'pageSize': pageSize,
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
     * Receive webhook notifications from the storage system
     * Processes file upload notifications from the storage system and queues them for processing.
     * @param requestBody
     * @returns any Success
     * @throws ApiError
     */
    public static postV1WebhooksSupabaseKnowledgeBase(
        requestBody?: WebhookRequest,
    ): CancelablePromise<{
        /**
         * Indicates if the webhook was processed successfully
         */
        success: boolean;
        /**
         * Optional message with details about the webhook processing
         */
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/webhooks/supabase/knowledge-base',
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
