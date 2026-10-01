function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

export const ROOM_START = positiveInteger(process.env.EXPO_PUBLIC_ROOM_START, 101, 9999);
export const ROOM_COUNT = positiveInteger(process.env.EXPO_PUBLIC_ROOM_COUNT, 14, 500);
export const PG_ROOM_CAPACITY = positiveInteger(process.env.EXPO_PUBLIC_PG_ROOM_CAPACITY, 2, 20);
