# Design Review: Event Lifecycle & "Facts on the Ground"

This PR introduces `DESIGN_REVIEW.md`, a design document auditing the application's event lifecycle.

## Changes
- Added `docs/DESIGN_REVIEW.md`

## Context
As requested, this document proposes a shift to "Flow Recording" events (e.g., `media/uploadStarted`, `ai/analysisRequested`) to ensure observability and prevent data loss during async failures (like the reported image upload bug).

## User Request Log

### Request 1
We have a bug where images aren't getting associated with their log entries, and looking at the event log I can't even see how images and log entries are associated. This ought to be being done with events —"facts on the ground"— but in fact I can find no trace of such a connection. Write an IMAGES_DESIGN.md that explains how images are implemented, and how it might be improved so that it was more obvious what is happening.

### Request 2
OK this design doc is off base. Let me remind you of the main point of event sourcing: to record "facts on the ground": things that happen, that we will need to know about later. So in this example, we should at least be recording the results of uploading the photo to google drive: that's a distinct event where we get new information (namely the URL of the uploaded image, or an error if we fail). So there should be some sort of imageUploaded event.

Now I am experiencing a bug where images aren't linked to log entries — looks like the current code can fail to upload and somehow there is a fallback where the imageDriveURL = "" at the end which should never happen. If the image upload is async with the log event, we might need an event to say the image started uploading and give it an ID; then the ID can be associated with the log entry even if the drive file doesn't exist yet, so that later when it does we can fix it up.

Now this specific case is just one of potentially many we need to review. So write a DESIGN_REVIEW.md that looks for other instances of events that are the result of a user action (an edit, a photo attachment, a voice snippet, etc.) and ensure that those things are recorded when they happen so that if things go wrong in those flows we can see what's going on. For example, probably we should have an event for every API call that records the API call being made and the result that came back.

### Request 3
The file should be on a branch and uploaded to a PR for review, followign WORKFLOW.md
