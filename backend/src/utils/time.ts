/**
 * Converts a timestamp to minutes since midnight (0-1440)
 */
export function timestampToMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Determines the time slot (morning/afternoon/night) from a timestamp
 */
export function getTimeSlotFromTimestamp(date: Date): string {
  const minutes = timestampToMinutes(date);
  
  if (minutes >= 270 && minutes < 720) return "morning"; // 4:30 AM - 12:00 PM
  if (minutes >= 720 && minutes < 1080) return "afternoon"; // 12:00 PM - 6:00 PM
  return "night"; // 6:00 PM - 12:00 AM
}

/**
 * Validates if a timestamp falls within the correct time slot
 */
export function validateTimestampInTimeSlot(timeSlot: string, timestamp: Date): boolean {
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
 * Formats a timestamp to a human-readable time string (e.g., "8:00 AM")
 * For API responses and display purposes
 */
export function formatTimestampToTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}