import { db } from "../db";
import { tasks, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import OpenAI from "openai";

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
  static async generateDailySchedule(
    params: BulkGoalParams,
  ): Promise<GeneratedTasksType> {
    const { goals, userData } = params;

    const userContext = userData.userContext || "";
    let preferredTimeSlots = ["morning", "afternoon", "night"];

    if (userData.preferredTimeSlots) {
      try {
        const parsed = JSON.parse(userData.preferredTimeSlots);
        if (Array.isArray(parsed)) {
          preferredTimeSlots = parsed.filter((slot: string) =>
            ["morning", "afternoon", "night"].includes(slot),
          );
        }
      } catch (error) {
        console.warn("Failed to parse preferredTimeSlots, using defaults");
      }
    }

    if (goals.length === 0) {
      throw new Error("No goals provided for task generation");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found");
    }

    const openai = new OpenAI({ apiKey });

    const today = getTodayISODate();
    
    const prompt = `Create a daily schedule for a user with these goals:

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
- Duration: 15-480 minutes
- Time slots: morning/afternoon/night only
- morning: 4:30 AM - 12:00 PM
- afternoon: 12:01 PM - 6:00 PM
- night: 6:01 PM - 12:00 AM
- Specific time format: ISO 8601 timestamp for TODAY (${today}) - DO NOT use 2023, 2024, or any other year
- All tasks MUST be scheduled for today's date (${today}), not any other date
- Include breaks between important tasks
- Analyze user context carefully for scheduling constraints`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content:
              `You are a daily schedule assistant for today (${today}). Create practical daily tasks to help users achieve their goals within their time constraints. IMPORTANT: All tasks must be scheduled for today's date (${today}), not any other year or date.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "daily_schedule",
            strict: true,
            schema: {
              type: "object",
              properties: {
                reasoning: {
                  type: "string",
                  description:
                    "Explanation of the fixed/flexible decisions and scheduling logic",
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
                        description:
                          `Specific time as ISO 8601 timestamp for today (e.g., '${today}T08:00:00Z')`,
                      },
                      duration: {
                        type: ["integer", "null"],
                        minimum: 5,
                        maximum: 480,
                        description: "Duration in minutes (5-480)",
                      },
                      goalId: {
                        type: "integer",
                        description: "ID of the related goal",
                      },
                    },
                    required: [
                      "title",
                      "description",
                      "timeSlot",
                      "specificTime",
                      "duration",
                      "goalId",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["reasoning", "tasks"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from OpenAI");

      const parsed = JSON.parse(content);

      const validGoalIds = new Set(goals.map((g) => g.id));
      const tasks = (parsed.tasks || []).map((task: any) => {
        let specificTime = task.specificTime ? new Date(task.specificTime) : undefined;
        
        if (specificTime) {
          const today = new Date();
          const todayString = today.toISOString().split('T')[0];
          const taskDateString = specificTime.toISOString().split('T')[0];
          
          if (taskDateString !== todayString) {
            specificTime.setFullYear(today.getFullYear());
            specificTime.setMonth(today.getMonth());
            specificTime.setDate(today.getDate());
          }
        }
        
        return {
          title: task.title || "Task",
          description: task.description === null ? "" : task.description || "",
          timeSlot:
            task.timeSlot === null ? "morning" : task.timeSlot || "morning",
          specificTime,
          duration:
            task.duration === null
              ? 30
              : Math.min(Math.max(task.duration || 30, 5), 480),
          aiGenerated: task.aiGenerated || true,
          goalId: validGoalIds.has(task.goalId) ? task.goalId : goals[0].id,
        };
      });

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
