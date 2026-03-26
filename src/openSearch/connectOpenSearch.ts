import { Client } from "@opensearch-project/opensearch";
import { configDotenv } from "dotenv";
configDotenv();
const openSearchClient = new Client({
    node: process.env.OPENSEARCH_URL
});
export default openSearchClient;