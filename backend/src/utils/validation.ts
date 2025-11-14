

import { TASK_CONFIG, VALID_TIME_SLOTS, ERROR_MESSAGES } from "../config/constants";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}


export function validateTaskData(task: any): ValidationResult {
  const errors: string[] = [];

  // Validate title
  if (!task.title || task.title.trim().length === 0) {
    errors.push("Title is required");
  }

  // Validate goalId if provided
  if (
    task.goalId !== undefined &&
    task.goalId !== null &&
    typeof task.goalId !== "number"
  ) {
    errors.push("goalId must be a number if provided");
  }

  // Validate userId
  if (!task.userId || typeof task.userId !== "number") {
    errors.push("Valid userId is required");
  }

  // Validate duration
  if (task.duration !== null && task.duration !== undefined) {
    if (
      typeof task.duration !== "number" ||
      task.duration < TASK_CONFIG.MIN_DURATION ||
      task.duration > TASK_CONFIG.MAX_DURATION
    ) {
      errors.push(ERROR_MESSAGES.INVALID_DURATION);
    }
  }

  // Validate timeSlot
  if (task.timeSlot && !VALID_TIME_SLOTS.includes(task.timeSlot)) {
    errors.push(ERROR_MESSAGES.INVALID_TIME_SLOT);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}


export function validateGoalData(goal: any): ValidationResult {
  const errors: string[] = [];

  // Validate title
  if (!goal.title || goal.title.trim().length === 0) {
    errors.push("Title is required");
  }

  // Validate userId
  if (!goal.userId || typeof goal.userId !== "number") {
    errors.push("Valid userId is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}


export function validateUserRegistration(user: any): ValidationResult {
  const errors: string[] = [];

  // Validate name
  if (!user.name || user.name.trim().length === 0) {
    errors.push("Name is required");
  }

  // Validate email
  if (!user.email || user.email.trim().length === 0) {
    errors.push("Email is required");
  } else if (!isValidEmail(user.email)) {
    errors.push("Invalid email format");
  }

  // Validate password
  if (!user.password || user.password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}


export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


export function validatePhotoUpload(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.photo) {
    errors.push("Photo is required");
  }

  if (!data.taskId || typeof data.taskId !== "number") {
    errors.push("Valid taskId is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
