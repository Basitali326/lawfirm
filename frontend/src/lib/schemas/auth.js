import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    firm_name: z.string().min(2).max(120),
    first_name: z.string().min(2).max(120),
    last_name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/\d/, "Include a digit")
      .regex(/[^A-Za-z0-9]/, "Include a special character"),
    password2: z.string(),
  })
  .refine((data) => data.password === data.password2, {
    message: "Passwords do not match",
    path: ["password2"],
  });
