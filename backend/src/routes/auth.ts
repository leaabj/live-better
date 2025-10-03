import { Hono } from "hono";
import { db as defaultDb } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken } from "../utils/auth";
import { authMiddleware, getAuthUser } from "../middleware/auth";
import { z } from "zod";

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

/**
 * Factory function to create auth router with dependency injection
 * @param db - Database instance (defaults to production db)
 */
export function createAuthRouter(db = defaultDb) {
  const authRouter = new Hono();

// POST /api/auth/register
authRouter.post("/register", async (c) => {
  try {
    const body = await c.req.json();

    const validatedData = registerSchema.safeParse(body);
    if (!validatedData.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          details: validatedData.error.errors,
        },
        400,
      );
    }

    const { name, email, password } = validatedData.data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return c.json(
        {
          success: false,
          error: "User with this email already exists",
        },
        409,
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    console.log("Creating user with data:", {
      name,
      email,
      hashedPassword: "***",
    });
    const now = new Date();
    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        userContext: null,
        preferredTimeSlots: '["morning", "afternoon", "night"]',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    console.log("User created successfully:", newUser[0]);

    const user = newUser[0];

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return c.json(
      {
        success: true,
        data: {
          user: userWithoutPassword,
          token,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to register user",
      },
      500,
    );
  }
});

// POST /api/auth/login
authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();

    // Validate input
    const validatedData = loginSchema.safeParse(body);
    if (!validatedData.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          details: validatedData.error.errors,
        },
        400,
      );
    }

    const { email, password } = validatedData.data;

    // Find user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        401,
      );
    }

    const user = existingUser[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return c.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        401,
      );
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return c.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to login",
      },
      500,
    );
  }
});

// GET /api/auth/profile (protected)
authRouter.get("/profile", authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    // Get user data from database
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (userData.length === 0) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const { password, ...userWithoutPassword } = userData[0];

    // Parse preferredTimeSlots if it's a string
    let parsedTimeSlots;
    try {
      parsedTimeSlots =
        typeof userWithoutPassword.preferredTimeSlots === "string"
          ? JSON.parse(userWithoutPassword.preferredTimeSlots)
          : userWithoutPassword.preferredTimeSlots;
    } catch (error) {
      // If JSON parsing fails, use default value
      parsedTimeSlots = ["morning", "afternoon", "night"];
    }

    const parsedUser = {
      ...userWithoutPassword,
      preferredTimeSlots: parsedTimeSlots,
    };

    return c.json({
      success: true,
      data: parsedUser,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// PUT /api/auth/profile (protected)
authRouter.put("/profile", authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const body = await c.req.json();

    // Validate input
    const validatedData = updateProfileSchema.safeParse(body);
    if (!validatedData.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          details: validatedData.error.errors,
        },
        400,
      );
    }

    const updateData = validatedData.data;

    // Convert preferredTimeSlots to JSON string if provided
    const updateValues: any = {
      ...updateData,
      updatedAt: new Date(),
    };

    if (updateData.preferredTimeSlots) {
      updateValues.preferredTimeSlots = JSON.stringify(
        updateData.preferredTimeSlots,
      );
    }

    // Update user
    const updatedUser = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, user.userId))
      .returning();

    if (updatedUser.length === 0) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const { password, ...userWithoutPassword } = updatedUser[0];

    // Parse preferredTimeSlots for response
    const parsedUser = {
      ...userWithoutPassword,
      preferredTimeSlots:
        typeof userWithoutPassword.preferredTimeSlots === "string"
          ? JSON.parse(userWithoutPassword.preferredTimeSlots)
          : userWithoutPassword.preferredTimeSlots,
    };

    return c.json({
      success: true,
      data: parsedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update profile",
      },
      500,
    );
  }
});

  return authRouter;
}

// Default export for production use
export default createAuthRouter();
