import prisma from "../config/prisma";
import { publishUserSync } from "../kafka/notifyProducers";
import { createUserPayload } from "../openSearch/syncUser";

export default async function populateOpenSearch() {
    const users = await prisma.user.findMany();
    users.forEach(user => {
        const payload = createUserPayload(user.name, user.email, user.id);
        publishUserSync(payload);
    });
    return users;
}