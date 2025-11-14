import { TIME_SLOTS, TimeSlot } from "../config/constants";


export function timestampToMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function getTimeSlotFromTimestamp(date: Date): string {
  const minutes = timestampToMinutes(date);

  if (minutes >= TIME_SLOTS.MORNING.START && minutes < TIME_SLOTS.MORNING.END) {
    return TIME_SLOTS.MORNING.NAME;
  }
  if (minutes >= TIME_SLOTS.AFTERNOON.START && minutes < TIME_SLOTS.AFTERNOON.END) {
    return TIME_SLOTS.AFTERNOON.NAME;
  }
  return TIME_SLOTS.NIGHT.NAME;
}


export function validateTimestampInTimeSlot(
  timeSlot: string,
  timestamp: Date,
): boolean {
  if (!timeSlot || !timestamp) return true;

  const minutes = timestampToMinutes(timestamp);

  switch (timeSlot) {
    case TIME_SLOTS.MORNING.NAME:
      return minutes >= TIME_SLOTS.MORNING.START && minutes < TIME_SLOTS.MORNING.END;
    case TIME_SLOTS.AFTERNOON.NAME:
      return minutes >= TIME_SLOTS.AFTERNOON.START && minutes < TIME_SLOTS.AFTERNOON.END;
    case TIME_SLOTS.NIGHT.NAME:
      return minutes >= TIME_SLOTS.NIGHT.START && minutes < TIME_SLOTS.NIGHT.END;
    default:
      return false;
  }
}


export function formatTimestampToTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
