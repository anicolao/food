
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { store, processEvent, type FoodEvent } from '../../src/lib/store';

describe('AI Feedback Projection', () => {
    it('should correctly update aiFeedback in DailyStats when ai/feedbackGenerated event is processed', () => {
        const date = '2026-04-26';
        const feedback = '<h4>Positive Feedback</h4><p>You did great today!</p><h4>Focus</h4><p>Eat more greens.</p>';

        const event: FoodEvent = {
            eventId: crypto.randomUUID(),
            type: 'ai/feedbackGenerated',
            timestamp: new Date().toISOString(),
            payload: {
                date,
                feedback
            }
        };

        store.dispatch(processEvent(event));

        const state = store.getState().projections;
        const stat = state.stats[date];

        assert.ok(stat, "Daily stats for the date should exist");
        assert.strictEqual(stat.aiFeedback, feedback, "aiFeedback should be updated with the provided feedback");
    });

    it('should create a DailyStats object if it does not exist when ai/feedbackGenerated is processed', () => {
        const date = '2026-04-27'; // Different date to ensure it doesn't exist
        const feedback = 'New day feedback';

        const event: FoodEvent = {
            eventId: crypto.randomUUID(),
            type: 'ai/feedbackGenerated',
            timestamp: new Date().toISOString(),
            payload: {
                date,
                feedback
            }
        };

        store.dispatch(processEvent(event));

        const state = store.getState().projections;
        const stat = state.stats[date];

        assert.ok(stat, "Daily stats for the date should be created");
        assert.strictEqual(stat.date, date);
        assert.strictEqual(stat.aiFeedback, feedback);
        assert.strictEqual(stat.totalCalories, 0, "Initial calories should be 0");
    });
});
