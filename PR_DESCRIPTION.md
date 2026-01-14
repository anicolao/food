Implement Voice and Text Logging
The user's main goal is to implement voice and text logging functionalities within the food tracking application. This involves:
- Reading and understanding the requirements from `DEVELOPMENT.md`, `WORKFLOW.md`, and `UI_TEXT_VOICE_LOGGING.md`.
- Implementing the UI components for grid selection, text input, and voice recording.
- Refactoring the existing log page to integrate these new input methods and manage their states.
- Updating the backend logic (Gemini integration) to support text-based analysis and image search.
- Creating a mock image search service.
- Implementing end-to-end tests to verify the new functionalities.
- Adhering strictly to the workflow defined in `WORKFLOW.md` for pull request submission.

## Changes
- **New Input Hub**: A 2x2 grid (`InputGrid`) now greets users on the Log page, offering Camera, Library, Voice, and Text options.
- **Text Logging**: A modal (`TextInputModal`) allowing users to describe their meal (e.g., "A large iced latte"). The system estimates nutrition and fetches a representative image.
- **Voice Logging**: A voice recorder (`VoiceRecorder`) with real-time visualization and transcription.
- **Backend Updates**: `analyzeFood` matches text input to Gemini prompts and generates search queries for food images.

## Verification
### Automated Tests
- Created `tests/e2e/009-text-voice-log.spec.ts` covering:
  - Text input flow (typing "Apple", verify analysis & mockup image).
  - Voice input flow (mocked `getUserMedia` & `SpeechRecognition`).
- Updated `tests/e2e/002-log-food/002-log-food.spec.ts` to align with the new UI ("Library" button).
- **Status**: All tests passed.

### Screenshots
See `docs/voice-text-logging/walkthrough.md` for details.
