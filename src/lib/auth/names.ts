import { z } from "zod";

/** The name fields, as asked for at signup and in Settings. */
export const nameFields = {
  firstName: z.string().trim().min(1, "Please enter your first name.").max(40),
  lastName: z.string().trim().min(1, "Please enter your last name.").max(40),
};

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
