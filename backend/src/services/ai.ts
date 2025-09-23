import { use } from "hono/jsx";
import OpenAI from "openai";

export interface GeneratedTaskType {
  title: string;
  description?: string;
  timeSlot?: "morning" | "afternoon" | "night";
  specificTime?: string;
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

    const prompt = `Create a daily schedule for a user with these goals:

GOALS:
${goals.map((g) => `${g.id}: ${g.title} - ${g.description || ""}`).join("\n")}

USER CONTEXT:
${userContext}

CONSTRAINTS:
- Available time slots: ${preferredTimeSlots.join(", ")} , are the only available time slots.
- Classes or work: ${userContext} user is unavailable during class and/or work time.
- Sleep: ${userContext}
- Commute: ${userContext}


Return JSON with:
- reasoning: brief explanation
- tasks: array of 5-10 tasks with title, description, timeSlot, specificTime, duration, goalId

Requirements:
- Each task must be unique (no duplicates) and atomic
- Each task must be an actionable action
- Duration must be between 15-480 minutes
- timeSlot must be exactly "morning", "afternoon", or "night"
- specificTime should be in format like "7:00 AM", "2:30 PM"
- Each task must be assigned to one of the provided goal IDs
- Include 10-15 minutes breaks between important tasks
- Include essential activities: morning routine, classes, meals, commute, sleep, and goal-specific activities`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content:
              "You are a daily schedule assistant. Create practical daily tasks to help users achieve their goals within their time constraints.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from OpenAI");

      const parsed = JSON.parse(content);

      const validGoalIds = new Set(goals.map((g) => g.id));
      const tasks = (parsed.tasks || []).map((task: any) => ({
        title: task.title || "Task",
        description: task.description || "",
        timeSlot: task.timeSlot || "morning",
        specificTime: task.specificTime || "",
        duration: Math.min(Math.max(task.duration || 30, 5), 480),
        aiGenerated: task.aiGenerated || true,
        fixed: task.fixed || false,
        goalId: validGoalIds.has(task.goalId) ? task.goalId : goals[0].id,
      }));

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
