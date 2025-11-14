import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";
import { tasks } from "../db/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface CreateTaskData {
  userId: number;
  goalId?: number | null;
  title: string;
  description?: string;
  timeSlot?: string;
  specificTime?: Date;
  duration?: number;
  aiGenerated?: boolean;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  timeSlot?: string;
  specificTime?: Date;
  duration?: number;
  completed?: boolean;
  aiValidated?: boolean;
  aiValidationResponse?: string;
  validationTimestamp?: Date;
  photoValidationAttempts?: number;
  photoValidationStatus?: string;
  photoLastUploadAt?: Date;
}

export class TaskRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  
  async findById(id: number) {
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  
  async findByIdAndUserId(id: number, userId: number) {
    const result = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .limit(1);
    
    return result[0] || null;
  }

  async findByUserId(userId: number) {
    return await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  
  async findTodayByUserId(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          gte(tasks.createdAt, today),
          lte(tasks.createdAt, tomorrow)
        )
      )
      .orderBy(tasks.id);
  }

  
  async findByGoalId(goalId: number) {
    return await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.goalId, goalId))
      .orderBy(desc(tasks.createdAt));
  }

  
  async findOrphanedByUserId(userId: number) {
    return await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.goalId)))
      .orderBy(desc(tasks.createdAt));
  }

  
  async create(data: CreateTaskData) {
    const result = await this.db
      .insert(tasks)
      .values({
        userId: data.userId,
        goalId: data.goalId,
        title: data.title,
        description: data.description,
        timeSlot: data.timeSlot,
        specificTime: data.specificTime,
        duration: data.duration,
        aiGenerated: data.aiGenerated ?? false,
      })
      .returning();
    
    return result[0];
  }

  
  async createBulk(tasksData: CreateTaskData[]) {
    const result = await this.db
      .insert(tasks)
      .values(
        tasksData.map((data) => ({
          userId: data.userId,
          goalId: data.goalId,
          title: data.title,
          description: data.description,
          timeSlot: data.timeSlot,
          specificTime: data.specificTime,
          duration: data.duration,
          aiGenerated: data.aiGenerated ?? false,
        }))
      )
      .returning();
    
    return result;
  }

  
  async update(id: number, data: UpdateTaskData) {
    const result = await this.db
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    
    return result[0] || null;
  }

  
  async delete(id: number) {
    await this.db.delete(tasks).where(eq(tasks.id, id));
  }

  
  async deleteByGoalId(goalId: number) {
    await this.db.delete(tasks).where(eq(tasks.goalId, goalId));
  }

  
  async orphanTasksByGoalId(goalId: number) {
    await this.db
      .update(tasks)
      .set({ goalId: null, updatedAt: new Date() })
      .where(eq(tasks.goalId, goalId));
  }

 
  async belongsToUser(taskId: number, userId: number): Promise<boolean> {
    const task = await this.findByIdAndUserId(taskId, userId);
    return task !== null;
  }

  
  async countCompletedByUserId(userId: number): Promise<number> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.completed, true)));
    
    return result.length;
  }

  
  async countAiGeneratedToday(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.aiGenerated, true),
          gte(tasks.createdAt, today),
          lte(tasks.createdAt, tomorrow)
        )
      );
    
    return result.length;
  }
}
