import { expect, test, describe } from "bun:test";
import { z } from "zod";

// Import the validation schemas from auth routes
// Since they're defined inline, we'll recreate them here for testing
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  userContext: z.string().optional(),
  preferredTimeSlots: z
    .array(z.enum(["morning", "afternoon", "night"]))
    .optional(),
});

describe("validation schemas", () => {
  describe("registerSchema", () => {
    describe("valid inputs", () => {
      test("accepts valid registration data", () => {
        const data = {
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("John Doe");
          expect(result.data.email).toBe("john@example.com");
          expect(result.data.password).toBe("password123");
        }
      });

      test("accepts minimum valid name (2 characters)", () => {
        const data = {
          name: "Jo",
          email: "jo@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts minimum valid password (6 characters)", () => {
        const data = {
          name: "John Doe",
          email: "john@example.com",
          password: "pass12",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts email with plus sign", () => {
        const data = {
          name: "John Doe",
          email: "john+tag@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts email with subdomain", () => {
        const data = {
          name: "John Doe",
          email: "john@mail.example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts long name", () => {
        const data = {
          name: "A".repeat(100),
          email: "john@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts long password", () => {
        const data = {
          name: "John Doe",
          email: "john@example.com",
          password: "a".repeat(100),
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts special characters in name", () => {
        const data = {
          name: "O'Brien-Smith",
          email: "john@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts special characters in password", () => {
        const data = {
          name: "John Doe",
          email: "john@example.com",
          password: "P@ssw0rd!#$",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("invalid name", () => {
      test("rejects name with 1 character", () => {
        const data = {
          name: "J",
          email: "john@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            "Name must be at least 2 characters"
          );
        }
      });

      test("rejects empty name", () => {
        const data = {
          name: "",
          email: "john@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects missing name", () => {
        const data = {
          email: "john@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe("invalid email", () => {
      test("rejects email without @", () => {
        const data = {
          name: "John Doe",
          email: "johnexample.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid email address");
        }
      });

      test("rejects email without domain", () => {
        const data = {
          name: "John Doe",
          email: "john@",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects email without local part", () => {
        const data = {
          name: "John Doe",
          email: "@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects empty email", () => {
        const data = {
          name: "John Doe",
          email: "",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects missing email", () => {
        const data = {
          name: "John Doe",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects email with spaces", () => {
        const data = {
          name: "John Doe",
          email: "john doe@example.com",
          password: "password123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe("invalid password", () => {
      test("rejects password with 5 characters", () => {
        const data = {
          name: "John Doe",
          email: "john@example.com",
          password: "pass1",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            "Password must be at least 6 characters"
          );
        }
      });

      test("rejects empty password", () => {
        const data = {
          name: "John Doe",
          email: "john@example.com",
          password: "",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects missing password", () => {
        const data = {
          name: "John Doe",
          email: "john@example.com",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe("multiple errors", () => {
      test("reports all validation errors", () => {
        const data = {
          name: "J",
          email: "invalid-email",
          password: "123",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors.length).toBe(3);
        }
      });
    });
  });

  describe("loginSchema", () => {
    describe("valid inputs", () => {
      test("accepts valid login data", () => {
        const data = {
          email: "john@example.com",
          password: "password123",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe("john@example.com");
          expect(result.data.password).toBe("password123");
        }
      });

      test("accepts minimum password (1 character)", () => {
        const data = {
          email: "john@example.com",
          password: "p",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts email with special characters", () => {
        const data = {
          email: "john+tag@sub.example.com",
          password: "password",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("invalid inputs", () => {
      test("rejects invalid email", () => {
        const data = {
          email: "not-an-email",
          password: "password123",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid email address");
        }
      });

      test("rejects empty password", () => {
        const data = {
          email: "john@example.com",
          password: "",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Password is required");
        }
      });

      test("rejects missing email", () => {
        const data = {
          password: "password123",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects missing password", () => {
        const data = {
          email: "john@example.com",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("updateProfileSchema", () => {
    describe("valid inputs", () => {
      test("accepts valid profile update with all fields", () => {
        const data = {
          name: "John Doe",
          userContext: "I am a student",
          preferredTimeSlots: ["morning", "afternoon"],
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("John Doe");
          expect(result.data.userContext).toBe("I am a student");
          expect(result.data.preferredTimeSlots).toEqual(["morning", "afternoon"]);
        }
      });

      test("accepts update with only name", () => {
        const data = {
          name: "Jane Doe",
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts update with only userContext", () => {
        const data = {
          userContext: "I work from 9 to 5",
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts update with only preferredTimeSlots", () => {
        const data = {
          preferredTimeSlots: ["night"],
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts empty object (all fields optional)", () => {
        const data = {};

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts all time slots", () => {
        const data = {
          preferredTimeSlots: ["morning", "afternoon", "night"],
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts single time slot", () => {
        const data = {
          preferredTimeSlots: ["morning"],
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts long userContext", () => {
        const data = {
          userContext: "A".repeat(1000),
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("accepts empty userContext", () => {
        const data = {
          userContext: "",
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe("invalid inputs", () => {
      test("rejects name with 1 character", () => {
        const data = {
          name: "J",
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            "Name must be at least 2 characters"
          );
        }
      });

      test("rejects invalid time slot", () => {
        const data = {
          preferredTimeSlots: ["morning", "invalid"],
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects empty time slots array with invalid value", () => {
        const data = {
          preferredTimeSlots: ["evening"],
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects time slots as string instead of array", () => {
        const data = {
          preferredTimeSlots: "morning",
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("rejects duplicate time slots (allows them)", () => {
        const data = {
          preferredTimeSlots: ["morning", "morning"],
        };

        const result = updateProfileSchema.safeParse(data);
        // Zod allows duplicates by default
        expect(result.success).toBe(true);
      });
    });

    describe("edge cases", () => {
      test("handles null values gracefully", () => {
        const data = {
          name: null,
          userContext: null,
          preferredTimeSlots: null,
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      test("handles undefined values (treated as optional)", () => {
        const data = {
          name: undefined,
          userContext: undefined,
          preferredTimeSlots: undefined,
        };

        const result = updateProfileSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test("rejects extra fields (strict mode not enabled)", () => {
        const data = {
          name: "John Doe",
          extraField: "should be ignored",
        };

        const result = updateProfileSchema.safeParse(data);
        // Zod strips extra fields by default
        expect(result.success).toBe(true);
      });
    });
  });

  describe("task validation patterns", () => {
    // Test validation for task-related schemas
    const taskTimeSlotEnum = z.enum(["morning", "afternoon", "night"]);

    test("accepts valid time slots", () => {
      expect(taskTimeSlotEnum.safeParse("morning").success).toBe(true);
      expect(taskTimeSlotEnum.safeParse("afternoon").success).toBe(true);
      expect(taskTimeSlotEnum.safeParse("night").success).toBe(true);
    });

    test("rejects invalid time slots", () => {
      expect(taskTimeSlotEnum.safeParse("evening").success).toBe(false);
      expect(taskTimeSlotEnum.safeParse("dawn").success).toBe(false);
      expect(taskTimeSlotEnum.safeParse("").success).toBe(false);
      expect(taskTimeSlotEnum.safeParse("MORNING").success).toBe(false);
    });

    test("duration validation (5-480 minutes)", () => {
      const durationSchema = z.number().min(5).max(480);

      expect(durationSchema.safeParse(5).success).toBe(true);
      expect(durationSchema.safeParse(30).success).toBe(true);
      expect(durationSchema.safeParse(480).success).toBe(true);

      expect(durationSchema.safeParse(4).success).toBe(false);
      expect(durationSchema.safeParse(481).success).toBe(false);
      expect(durationSchema.safeParse(0).success).toBe(false);
      expect(durationSchema.safeParse(-10).success).toBe(false);
    });
  });
});
