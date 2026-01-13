import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';

// --- Event Types ---
export interface FoodEvent {
  eventId: string;
  type: string;
  timestamp: string;
  payload: any;
}

// --- Initial State (Projections) ---
export interface LogEntry {
  id: string;
  date: string;
  time: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  description: string;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
  imageDriveUrl?: string; // URL in Google Drive
  rawJson?: any; // Full Gemini response
}

interface DailyStats {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

interface AppState {
  events: FoodEvent[];
  log: LogEntry[];
  stats: Record<string, DailyStats>; // Keyed by YYYY-MM-DD
}

const initialState: AppState = {
  events: [],
  log: [],
  stats: {}
};

// --- Slices ---

// 1. Event Log (Source of Truth)
const eventLogSlice = createSlice({
  name: 'eventLog',
  initialState: initialState.events,
  reducers: {
    appendEvent: (state, action: PayloadAction<FoodEvent>) => {
      state.push(action.payload);
    }
  }
});

// 2. Projections (Derived State)
// Note: In a pure Event Sourcing setup, these would be derived by replaying events.
// For the MVP with Redux, we updates them incrementally as events are dispatched.
// Ideally, we'd use a meta-reducer or just derive selectors, but for UI performance:

const projectionsSlice = createSlice({
  name: 'projections',
  initialState: { log: initialState.log, stats: initialState.stats },
  reducers: {
    processEvent: (state, action: PayloadAction<FoodEvent>) => {
      const event = action.payload;
      // Idempotency Check: correct place depends on if we rely on log or projections.
      // Ideally we check if event is in log. But projections slice acts on stream.
      // If we assume sequential replay, we should check set of processed IDs?
      // Or check if event is already in `log` slice?
      // But `projections` slice has its own `log`.
      // Removed global idempotency check as it's now specific to the event type.

      switch (event.type) {
        case 'log/entryConfirmed': {
          // Payload expected: { entry: LogEntry }
          const entry = event.payload.entry as LogEntry;

          // Idempotency Check: using business ID (entry.id)
          if (state.log.some(e => e.id === entry.id)) {
            return;
          }

          state.log.push(entry);

          // Update Stats
          if (!state.stats[entry.date]) {
            state.stats[entry.date] = { date: entry.date, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 };
          }
          const stat = state.stats[entry.date];
          stat.totalCalories += Number(entry.calories || 0);
          stat.totalProtein += Number(entry.protein || 0);
          stat.totalFat += Number(entry.fat || 0);
          stat.totalCarbs += Number(entry.carbs || 0);
          break;
        }

        case 'log/entryUpdated': {
          const { entryId, changes } = event.payload;
          const index = state.log.findIndex(e => e.id === entryId);
          if (index !== -1) {
            const oldEntry = state.log[index];

            // 1. Decrement old stats
            if (state.stats[oldEntry.date]) {
              const stat = state.stats[oldEntry.date];
              stat.totalCalories -= Number(oldEntry.calories || 0);
              stat.totalProtein -= Number(oldEntry.protein || 0);
              stat.totalFat -= Number(oldEntry.fat || 0);
              stat.totalCarbs -= Number(oldEntry.carbs || 0);
            }

            // 2. Update Entry
            const newEntry = { ...oldEntry, ...changes };
            state.log[index] = newEntry;

            // 3. Increment new stats (date might have changed! but ignoring that complexity for MVP+, assuming date matches)
            // Safety: If date changed, we'd need to handle that. Assuming date stays same for simplified logic unless prompt said editable date.
            // Prompt said "dates/times... editable". Let's assume date CAN change.
            // So we should look up stat for newEntry.date.

            if (!state.stats[newEntry.date]) {
              state.stats[newEntry.date] = { date: newEntry.date, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 };
            }
            const stat = state.stats[newEntry.date];
            stat.totalCalories += Number(newEntry.calories || 0);
            stat.totalProtein += Number(newEntry.protein || 0);
            stat.totalFat += Number(newEntry.fat || 0);
            stat.totalCarbs += Number(newEntry.carbs || 0);
          }
          break;
        }
        case 'log/entryDeleted': {
          const { entryId } = event.payload;
          const index = state.log.findIndex(e => e.id === entryId);
          if (index !== -1) {
            const entry = state.log[index];

            // Decrement stats
            if (state.stats[entry.date]) {
              const stat = state.stats[entry.date];
              stat.totalCalories -= Number(entry.calories || 0);
              stat.totalProtein -= Number(entry.protein || 0);
              stat.totalFat -= Number(entry.fat || 0);
              stat.totalCarbs -= Number(entry.carbs || 0);
            }

            // Remove from log
            state.log.splice(index, 1);
          }
          break;
        }
      }
    }
  }
});

// 3. Configuration (Session State)
interface ConfigState {
  spreadsheetId: string | null;
  folderId: string | null;
}

const configSlice = createSlice({
  name: 'config',
  initialState: { spreadsheetId: null, folderId: null } as ConfigState,
  reducers: {
    setConfig: (state, action: PayloadAction<ConfigState>) => {
      state.spreadsheetId = action.payload.spreadsheetId;
      state.folderId = action.payload.folderId;
    }
  }
});

// --- Store ---
export const store = configureStore({
  reducer: {
    events: eventLogSlice.reducer,
    projections: projectionsSlice.reducer,
    config: configSlice.reducer
  }
});

export const { appendEvent } = eventLogSlice.actions;
export const { processEvent } = projectionsSlice.actions;
export const { setConfig } = configSlice.actions;

// --- Thunks / Helpers ---
export const dispatchEvent = (type: string, payload: any) => (dispatch: any) => {
  const event: FoodEvent = {
    eventId: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    payload
  };

  // 1. Append to Source of Truth
  dispatch(appendEvent(event));

  // 2. Update Projections
  dispatch(processEvent(event));

  // 3. Side Effects (Sync to Sheets) would go here or in a listener
  // syncToSheets(event);
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
