import { z } from "zod";

// Schema for listing users with pagination
export const LIST_USERS_SCHEMA = {
  start_cursor: z.string().optional().describe("Pagination cursor"),
  page_size: z
    .number()
    .optional()
    .describe("Number of users to return per page"),
};

// Schema for getting a single user
export const GET_USER_SCHEMA = {
  user_id: z.string().describe("The ID of the user to retrieve"),
};
