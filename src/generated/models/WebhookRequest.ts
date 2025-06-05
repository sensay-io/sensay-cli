/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WebhookRequest = {
    type: string;
    table: string;
    schema: string;
    record: {
        id: string;
        bucket_id: string;
        path_tokens: Array<string>;
        metadata: {
            size: number;
            mimetype: string;
        };
    };
    old_record?: any;
};

