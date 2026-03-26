import { configDotenv } from "dotenv";
import openSearchClient from "./connectOpenSearch";
configDotenv();
const indexName = process.env.OPENSEARCH_USERS_INDEX;

export const indexUserDocument = async (user: {
    id: number;
    name: string;
    email: string;
    version: number;
}): Promise<void> => {
    if(!indexName) {
        throw new Error("OPENSEARCH_USERS_INDEX environment variable is not defined");
    }
    await openSearchClient.index({
        index: indexName,
        id: String(user.id),
        body: user,
        refresh: true
    });
};

export const deleteUserDocument = async (userId:
    number): Promise<void> => {
    if(!indexName) {
        throw new Error("OPENSEARCH_USERS_INDEX environment variable is not defined");
    }
    await openSearchClient.delete({
        index: indexName,
        id: String(userId),
        refresh: true
    });
};
export const searchUsers = async (search: string) => {
    const response = await openSearchClient.search({
        index: indexName,
        body: {
            size: 10,
            query: {
                multi_match: {
                    query: search,
                    fields: ["name", "email"]
                }
            }
        }
    });

    return response.body.hits.hits.map((hit: any) =>
        hit._source);
};

export const createUserPayload = (name: string, email: string, id: number) => {
    return {
        name,
        email,
        id,
        version: Date.now()
    };
}
export const extractUserPayload = (payload: any) => {
    const { name, email, id , version} = payload;
    if (typeof name !== "string" || typeof email !== "string" || typeof id !== "number") {
        throw new Error("Invalid payload structure");
    }
    return { name, email, id, version };
}
