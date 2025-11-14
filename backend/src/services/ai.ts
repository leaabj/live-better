import { db } from "../db";
import { tasks, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import OpenAI from "openai";
import { AI_CONFIG, VALID_TIME_SLOTS, TASK_CONFIG, TIME_SLOTS } from "../config/constants";
import { env } from "../config/env";


function getTodayISODate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export interface GeneratedTaskType {
  title: string;
  description?: string;
  timeSlot?: "morning" | "afternoon" | "night";
  specificTime?: Date;
  duration?: number;
  goalId: number;
}

export interface GeneratedTasksType {
  tasks: GeneratedTaskType[];
  reasoning: string;
}

export interface BulkGoalParams {
  goals: Array<{
    id: number;
    title: string;
    description?: string;
  }>;
  userData: {
    userContext?: string | null;
    preferredTimeSlots?: string | null;
  };
}

export class AIService {

  private static parsePreferredTimeSlots(preferredTimeSlotsJson?: string | null): string[] {
    const defaultSlots = [TIME_SLOTS.MORNING.NAME, TIME_SLOTS.AFTERNOON.NAME, TIME_SLOTS.NIGHT.NAME];
    
    if (!preferredTimeSlotsJson) {
      return defaultSlots;
    }

    try {
      const parsed = JSON.parse(preferredTimeSlotsJson);
      if (Array.isArray(parsed)) {
        const validSlots = parsed.filter((slot: string) => 
          VALID_TIME_SLOTS.includes(slot as any)
        );
        return validSlots.length > 0 ? validSlots : defaultSlots;
      }
    } catch (error) {
      console.warn("Failed to parse preferredTimeSlots, using defaults");
    }
    
    return defaultSlots;
  }


  private static buildPrompt(
    goals: BulkGoalParams["goals"],
    userContext: string,
    today: string
  ): string {
    return `Create a daily schedule for a user with these goals:

GOALS:
${goals.map((g) => `${g.id}: ${g.title} - ${g.description || ""}`).join("\n")}

USER CONTEXT:
${userContext}

JSON FORMAT REQUIREMENTS:
{
  "reasoning": "Explain your scheduling logic",
  "tasks": [
    {
      "title": "Task name",
      "description": "Task description",
      "timeSlot": "morning|afternoon|night",
      "specificTime": "${today}T08:00:00Z", // ISO 8601 timestamp format for today
      "duration": 30,
      "goalId": 1
    }
  ]
}

REQUIREMENTS:
- Each task must be unique and actionable
- Duration: ${TASK_CONFIG.MIN_DURATION}-${TASK_CONFIG.MAX_DURATION} minutes
- Time slots: morning/afternoon/night only
- morning: ${TIME_SLOTS.MORNING.START / 60}:${(TIME_SLOTS.MORNING.START % 60).toString().padStart(2, '0')} - ${TIME_SLOTS.MORNING.END / 60}:00
- afternoon: ${TIME_SLOTS.AFTERNOON.START / 60}:01 - ${TIME_SLOTS.AFTERNOON.END / 60}:00
- night: ${TIME_SLOTS.NIGHT.START / 60}:01 - ${TIME_SLOTS.NIGHT.END / 60}:00
- Specific time format: ISO 8601 timestamp for TODAY (${today}) - DO NOT use 2023, 2024, or any other year
- All tasks MUST be scheduled for today's date (${today}), not any other date
- Include breaks between important tasks
- Analyze user context carefully for scheduling constraints`;
  }

  
  private static buildJsonSchema(today: string) {
    return {
      name: "daily_schedule",
      strict: true,
      schema: {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Explanation of the fixed/flexible decisions and scheduling logic",
          },
          tasks: {
            type: "array",
            description: "List of daily tasks",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Task name",
                },
                description: {
                  type: ["string", "null"],
                  description: "Task description",
                },
                timeSlot: {
                  type: ["string", "null"],
                  enum: ["morning", "afternoon", "night"],
                  description: "Time slot for the task",
                },
                specificTime: {
                  type: ["string", "null"],
                  format: "date-time",
                  description: `Specific time as ISO 8601 timestamp for today (e.g., '${today}T08:00:00Z')`,
                },
                duration: {
                  type: ["integer", "null"],
                  minimum: TASK_CONFIG.MIN_DURATION,
                  maximum: TASK_CONFIG.MAX_DURATION,
                  description: `Duration in minutes (${TASK_CONFIG.MIN_DURATION}-${TASK_CONFIG.MAX_DURATION})`,
                },
                goalId: {
                  type: "integer",
                  description: "ID of the related goal",
                },
              },
              required: ["title", "description", "timeSlot", "specificTime", "duration", "goalId"],
              additionalProperties: false,
            },
          },
        },
        required: ["reasoning", "tasks"],
        additionalProperties: false,
      },
    };
  }

  /**
   * Normalizes task dates to ensure they're set to today
   */
  private static normalizeTaskDate(specificTime?: Date): Date | undefined {
    if (!specificTime) return undefined;

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const taskDateString = specificTime.toISOString().split('T')[0];
    
    if (taskDateString !== todayString) {
      specificTime.setFullYear(today.getFullYear());
      specificTime.setMonth(today.getMonth());
      specificTime.setDate(today.getDate());
    }
    
    return specificTime;
  }

  
  private static sanitizeTask(task: any, validGoalIds: Set<number>, fallbackGoalId: number): GeneratedTaskType {
    const specificTime = task.specificTime ? new Date(task.specificTime) : undefined;
    const normalizedTime = AIService.normalizeTaskDate(specificTime);
    
    return {
      title: task.title || "Task",
      description: task.description === null ? "" : task.description || "",
      timeSlot: task.timeSlot === null ? "morning" : task.timeSlot || "morning",
      specificTime: normalizedTime,
      duration: task.duration === null 
        ? 30 
        : Math.min(Math.max(task.duration || 30, TASK_CONFIG.MIN_DURATION), TASK_CONFIG.MAX_DURATION),
      goalId: validGoalIds.has(task.goalId) ? task.goalId : fallbackGoalId,
    };
  }

  
  private static async callOpenAI(
    openai: OpenAI,
    prompt: string,
    today: string
  ): Promise<any> {
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.MODEL,
      messages: [
        {
          role: "system",
          content: `You are a daily schedule assistant for today (${today}). Create practical daily tasks to help users achieve their goals within their time constraints. IMPORTANT: All tasks must be scheduled for today's date (${today}), not any other year or date.`,
        },
        { role: "user", content: prompt },
      ],
      temperature: AI_CONFIG.TEMPERATURE,
      max_tokens: AI_CONFIG.MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: AIService.buildJsonSchema(today),
      },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  }

  
  static async generateDailySchedule(
    params: BulkGoalParams,
    apiKey?: string,
  ): Promise<GeneratedTasksType> {
    const { goals, userData } = params;

    // Validate inputs
    if (goals.length === 0) {
      throw new Error("No goals provided for task generation");
    }

    // Get API key (use provided key for testing, or env for production)
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not found");
    }

    // Parse user preferences
    const userContext = userData.userContext || "";
    const preferredTimeSlots = AIService.parsePreferredTimeSlots(userData.preferredTimeSlots);

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const today = getTodayISODate();
    
    // Build prompt and call OpenAI
    const prompt = AIService.buildPrompt(goals, userContext, today);

    try {
      const parsed = await AIService.callOpenAI(openai, prompt, today);

      // Validate and sanitize tasks
      const validGoalIds = new Set(goals.map((g) => g.id));
      const tasks = (parsed.tasks || []).map((task: any) => 
        AIService.sanitizeTask(task, validGoalIds, goals[0].id)
      );

      return {
        tasks,
        reasoning: parsed.reasoning || "Generated daily schedule",
      };
    } catch (error) {
      console.error("AI generation error:", error);
      throw new Error("Failed to generate daily schedule");
    }
  }
}
