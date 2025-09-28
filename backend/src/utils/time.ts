/**
 * Converts a timestamp to minutes since midnight (0-1440)
 * Uses UTC time to avoid timezone conversion issues
 */
export function timestampToMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/**
 * Determines the time slot (morning/afternoon/night) from a timestamp
 * Uses UTC time to avoid timezone conversion issues
 */
export function getTimeSlotFromTimestamp(date: Date): string {
  const minutes = timestampToMinutes(date);

  if (minutes >= 270 && minutes < 720) return "morning"; // 4:30 AM - 12:00 PM UTC
  if (minutes >= 720 && minutes < 1080) return "afternoon"; // 12:00 PM - 6:00 PM UTC
  return "night"; // 6:00 PM - 12:00 AM UTC
}

/**
 * Validates if a timestamp falls within the correct time slot
 */
export function validateTimestampInTimeSlot(
  timeSlot: string,
  timestamp: Date,
): boolean {
  if (!timeSlot || !timestamp) return true;

  const minutes = timestampToMinutes(timestamp);

  switch (timeSlot) {
    case "morning":
      return minutes >= 270 && minutes < 720;
    case "afternoon":
      return minutes >= 720 && minutes < 1080;
    case "night":
      return minutes >= 1080 && minutes < 1440;
    default:
      return false;
  }
}

/**
 * Formats a timestamp to a human-readable time string (e.g., "23:00")
 * For API responses and display purposes
 * Uses UTC time to avoid timezone conversion issues
 */
export function formatTimestampToTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
