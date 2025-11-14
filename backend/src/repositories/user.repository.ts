import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  userContext?: string;
  preferredTimeSlots?: string;
}

export interface UpdateUserData {
  name?: string;
  userContext?: string;
  preferredTimeSlots?: string;
}

export class UserRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  
  async findById(id: number) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  
  async findByEmail(email: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0] || null;
  }

  async create(data: CreateUserData) {
    const result = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        password: data.password,
        userContext: data.userContext,
        preferredTimeSlots: data.preferredTimeSlots,
      })
      .returning();
    
    return result[0];
  }

  
  async update(id: number, data: UpdateUserData) {
    const result = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return result[0] || null;
  }

  
  async delete(id: number) {
    await this.db.delete(users).where(eq(users.id, id));
  }

  
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }
}
