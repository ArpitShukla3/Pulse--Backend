import { configDotenv } from "dotenv";
import openSearchClient from "./connectOpenSearch";

configDotenv();
const indexName = process.env.OPENSEARCH_USERS_INDEX;
export async function ensureUsersIndex(): Promise<void> {
    if (!indexName) {
        throw new Error("OPENSEARCH_USERS_INDEX environment variable is not defined");
    }

    const exists = await openSearchClient.indices.exists({
        index: indexName
    });

    if (exists.body) {
        return;
    }

    await openSearchClient.indices.create({
        index: indexName,
        body: {
            mappings: {
                properties: {
                    id: { type: "integer" },
                    name: { type: "text" },
                    email: { type: "text" },
                    version: { type: "long" }
                }
            }
        }
    });
};