import { eq, and, desc } from "drizzle-orm";
import { goals } from "../db/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface CreateGoalData {
  userId: number;
  title: string;
  description?: string;
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
}

export class GoalRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  
  async findById(id: number) {
    const result = await this.db
      .select()
      .from(goals)
      .where(eq(goals.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  
  async findByUserId(userId: number) {
    return await this.db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  
  async findByIdAndUserId(id: number, userId: number) {
    const result = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .limit(1);
    
    return result[0] || null;
  }

  
  async create(data: CreateGoalData) {
    const result = await this.db
      .insert(goals)
      .values({
        userId: data.userId,
        title: data.title,
        description: data.description,
      })
      .returning();
    
    return result[0];
  }

 
  async update(id: number, data: UpdateGoalData) {
    const result = await this.db
      .update(goals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, id))
      .returning();
    
    return result[0] || null;
  }

  
  async delete(id: number) {
    await this.db.delete(goals).where(eq(goals.id, id));
  }

 
  async belongsToUser(goalId: number, userId: number): Promise<boolean> {
    const goal = await this.findByIdAndUserId(goalId, userId);
    return goal !== null;
  }
}
