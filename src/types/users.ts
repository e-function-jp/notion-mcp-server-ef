import { z } from "zod";
import { LIST_USERS_SCHEMA, GET_USER_SCHEMA } from "../schema/users.js";

// Types inferred from schemas
const listUsersSchema = z.object(LIST_USERS_SCHEMA);
export type ListUsersParams = z.infer<typeof listUsersSchema>;

const getUserSchema = z.object(GET_USER_SCHEMA);
export type GetUserParams = z.infer<typeof getUserSchema>;
