import { Request, Response } from "express";
import { UserRequest } from "../utils/types.js";
import prisma from "../config/prisma.js";
import openSearchClient from "../openSearch/connectOpenSearch.js";
import { configDotenv } from "dotenv";
configDotenv();
export async function findUsersv1(req: Request, res: Response): Promise<void> {
    const userRequest = req as UserRequest;
    const searchTerm = req.query.search as string | undefined;

    if (!searchTerm) {
        res.status(400).json({
            message: "Search term is required"
        });
        return;
    }
    const users = await prisma.user.findMany({
        where: {
            OR: [
                {
                    email: {
                        contains: searchTerm
                    }
                },
                {
                    name: {
                        contains: searchTerm
                    }
                }
            ]
        },
        take: 10,
        select: {
            id: true,
            name: true,
            email: true
        },
    });
    res.json({ users });
}

const indexName = process.env.OPENSEARCH_USERS_INDEX;
export async function findUsersv2(req: Request, res: Response): Promise<void> {
    const searchTerm = req.query.search as string | undefined;

    if (!searchTerm) {
        res.status(400).json({
            message: "Search term is required"
        });
        return;
    }
    const response = await openSearchClient.search({
        index: indexName,
        body: {
            size: 10,
            query: {
                bool: {
                    should: [
                        {
                            wildcard: {
                                name: {
                                    value: `*${searchTerm.toLowerCase()}*`,
                                    case_insensitive: true
                                }
                            }
                        },
                        {
                            wildcard: {
                                email: {
                                    value: `*${searchTerm.toLowerCase()}*`,
                                    case_insensitive: true
                                }
                            }
                        }
                    ]
                }
            }
        }
    });

    res.json({ users: response.body.hits.hits.map((hit: any) => hit._source) });
}