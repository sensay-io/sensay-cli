/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { replicaUUID_parameter } from '../models/replicaUUID_parameter';
import type { trainingID_parameter } from '../models/trainingID_parameter';
import type { WebhookRequest } from '../models/WebhookRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TrainingService {
    /**
     * Create a knowledge base entry
     * Creates a new empty knowledge base entry for a replica. This is the first step in the text-based training process. After creating the entry, you'll receive a knowledgeBaseID that you'll need to use in the next step to add your training content using the Update endpoint. The entry starts with a BLANK status and will be processed automatically once you add content.
     * @param replicaUuid
     * @param xApiVersion
     * @returns any The created knowledge base entry
     * @throws ApiError
     */
    public static postV1ReplicasTraining(
        replicaUuid: replicaUUID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates if the knowledge base entry was created successfully
         */
        success: boolean;
        /**
         * The unique identifier for the newly created knowledge base entry.
         */
        knowledgeBaseID: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/v1/replicas/{replicaUUID}/training',
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
     * Update knowledge base entry
     * Updates a knowledge base entry with training content. This is the second step in the training process after creating an entry. You can provide "rawText" which is the content you want your replica to learn from (such as product information, company policies, or specialized knowledge). The system will automatically process this text and make it available for your replica to use when answering questions. The entry status will change to PROCESSING and then to READY once fully processed.
     * @param replicaUuid
     * @param trainingId
     * @param requestBody
     * @returns any Knowledge base entry updated successfully.
     * @throws ApiError
     */
    public static putV1ReplicasTraining(
        replicaUuid: replicaUUID_parameter,
        trainingId: trainingID_parameter,
        requestBody?: {
            /**
             * The text content you want your replica to learn
             */
            rawText?: string;
            /**
             * Pre-processed text ready for the knowledge base
             */
            processedText?: string;
            /**
             * ID of the vector entry in the database
             */
            vectorEntryId?: string;
            /**
             * Additional information about the knowledge base entry (only used with vectorEntryId)
             */
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<{
        /**
         * Indicates the status of the request
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/v1/replicas/{replicaUUID}/training/{trainingID}',
            path: {
                'replicaUUID': replicaUuid,
                'trainingID': trainingId,
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
     * Permanently removes a specific knowledge base entry and its associated vector database entry. Use this endpoint when you need to remove outdated or incorrect training data from your replica's knowledge base. This operation cannot be undone, and the entry will no longer be available for retrieval during conversations with your replica. This endpoint handles the complete cleanup process, removing both the database record and any associated vector embeddings.
     * @param trainingId
     * @param xApiVersion
     * @returns any The knowledge base entry was deleted successfully.
     * @throws ApiError
     */
    public static deleteV1Training(
        trainingId: trainingID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * Indicates whether the knowledge base entry and its associated vector embeddings were successfully deleted from the system
         */
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/v1/training/{trainingID}',
            path: {
                'trainingID': trainingId,
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
     * @param trainingId
     * @param xApiVersion
     * @returns any The knowledge base entry returned successfully.
     * @throws ApiError
     */
    public static getV1Training(
        trainingId: trainingID_parameter,
        xApiVersion: string = '2025-03-25',
    ): CancelablePromise<{
        /**
         * The unique identifier for this knowledge base entry. Use this ID in subsequent API calls to update or delete this entry.
         */
        id: number;
        /**
         * The unique identifier of the replica that owns this knowledge base entry. This links the training data to a specific replica.
         */
        replica_uuid: string | null;
        /**
         * The type of knowledge base entry, indicating how the content was added and how it should be processed.
         */
        type: 'file_upload' | 'url' | 'training_history' | 'text';
        /**
         * For file_upload entries, the original filename that was uploaded. This helps identify the source of the content.
         */
        filename: string | null;
        /**
         * For url entries, the original url
         */
        url?: string;
        /**
         * The current stage in the processing pipeline. Use this to track progress and identify any issues with processing.
         */
        status: 'AWAITING_UPLOAD' | 'SUPABASE_ONLY' | 'PROCESSING' | 'READY' | 'SYNC_ERROR' | 'ERR_FILE_PROCESSING' | 'ERR_TEXT_PROCESSING' | 'ERR_TEXT_TO_VECTOR' | 'BLANK';
        /**
         * The original, unmodified text content that was submitted for training. May be truncated for large entries.
         */
        raw_text: string | null;
        /**
         * The optimized version of the text after system processing. This is what gets converted to vectors for retrieval.
         */
        processed_text: string | null;
        /**
         * ISO 8601 timestamp when this knowledge base entry was first created.
         */
        created_at: string;
        /**
         * ISO 8601 timestamp when this knowledge base entry was last modified. Use this to track when processing completed.
         */
        updated_at: string;
        /**
         * Optional title for this knowledge base entry. Helps identify the content in listings.
         */
        title: string | null;
        /**
         * Optional description providing more details about this knowledge base entry.
         */
        description: string | null;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/training/{trainingID}',
            path: {
                'trainingID': trainingId,
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
     * @param status Filter to show only knowledge base entries with a specific processing status (e.g., READY, PROCESSING, ERR_FILE_PROCESSING)
     * @param type Filter to show only knowledge base entries of a specific type (e.g., text, file_upload, url, training_history)
     * @param page The page number for paginated results (starts at 1). Use this to navigate through large result sets.
     * @param limit The maximum number of knowledge base entries to return per page (up to 100). Use this to control result set size.
     * @param xApiVersion
     * @returns any List of knowledge base entries returned successfully.
     * @throws ApiError
     */
    public static getV1Training1(
        status?: 'AWAITING_UPLOAD' | 'SUPABASE_ONLY' | 'PROCESSING' | 'READY' | 'SYNC_ERROR' | 'ERR_FILE_PROCESSING' | 'ERR_TEXT_PROCESSING' | 'ERR_TEXT_TO_VECTOR' | 'BLANK',
        type?: 'file_upload' | 'url' | 'training_history' | 'text',
        page: string = '1',
        limit: string = '100',
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
             * The unique identifier for this knowledge base entry. Use this ID in subsequent API calls to update or delete this entry.
             */
            id: number;
            /**
             * The unique identifier of the replica that owns this knowledge base entry. This links the training data to a specific replica.
             */
            replica_uuid: string | null;
            /**
             * The type of knowledge base entry, indicating how the content was added and how it should be processed.
             */
            type: 'file_upload' | 'url' | 'training_history' | 'text';
            /**
             * For file_upload entries, the original filename that was uploaded. This helps identify the source of the content.
             */
            filename: string | null;
            /**
             * For url entries, the original url
             */
            url?: string;
            /**
             * The current stage in the processing pipeline. Use this to track progress and identify any issues with processing.
             */
            status: 'AWAITING_UPLOAD' | 'SUPABASE_ONLY' | 'PROCESSING' | 'READY' | 'SYNC_ERROR' | 'ERR_FILE_PROCESSING' | 'ERR_TEXT_PROCESSING' | 'ERR_TEXT_TO_VECTOR' | 'BLANK';
            /**
             * The original, unmodified text content that was submitted for training. May be truncated for large entries.
             */
            raw_text: string | null;
            /**
             * The optimized version of the text after system processing. This is what gets converted to vectors for retrieval.
             */
            processed_text: string | null;
            /**
             * ISO 8601 timestamp when this knowledge base entry was first created.
             */
            created_at: string;
            /**
             * ISO 8601 timestamp when this knowledge base entry was last modified. Use this to track when processing completed.
             */
            updated_at: string;
            /**
             * Optional title for this knowledge base entry. Helps identify the content in listings.
             */
            title: string | null;
            /**
             * Optional description providing more details about this knowledge base entry.
             */
            description: string | null;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/training',
            headers: {
                'X-API-Version': xApiVersion,
            },
            query: {
                'status': status,
                'type': type,
                'page': page,
                'limit': limit,
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
     * Generate a signed URL for file upload
     * Creates a signed URL for uploading a file to the knowledge base. This is the first step in the file-based training process. The response includes both a signedURL where you can upload your file and a knowledgeBaseID for tracking. After receiving these, use a PUT request to the signedURL to upload your file (with Content-Type: application/octet-stream). The system will automatically extract text from your file, process it, and make it available for your replica to use. Supported file types include PDF, DOCX, and other text-based formats. Files up to 50MB are supported.
     * @param replicaUuid
     * @param filename The name of the file you want to upload to the knowledge base. This helps identify the file in your knowledge base. Files up to 50MB are supported.
     * @returns any The generated signed URL
     * @throws ApiError
     */
    public static getV1ReplicasTrainingFilesUpload(
        replicaUuid: replicaUUID_parameter,
        filename: string,
    ): CancelablePromise<{
        /**
         * Indicates if the signed URL was generated successfully
         */
        success: boolean;
        /**
         * The temporary URL where you should upload your file using a PUT request with Content-Type: application/octet-stream
         */
        signedURL?: string;
        /**
         * The unique identifier for the newly created knowledge base entry. Use this to track the processing status of your file.
         */
        knowledgeBaseID?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v1/replicas/{replicaUUID}/training/files/upload',
            path: {
                'replicaUUID': replicaUuid,
            },
            query: {
                'filename': filename,
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
    public static postV1ReplicasTrainingFilesWebhook(
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
            url: '/v1/replicas/training/files/webhook',
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
