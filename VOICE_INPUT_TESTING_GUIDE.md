# Voice Input Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing the voice input functionality in the Job Market Simulator. Voice input allows players to submit interview answers and task solutions using voice recordings instead of typing.

## Prerequisites

### Browser Requirements
- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Full support ✅
- **Mobile browsers**: Requires HTTPS ⚠️

### Permissions
- Microphone access must be granted when prompted
- HTTPS connection required for audio recording
- Ensure microphone is working and not muted

### Test Environment
- Frontend URL: https://career-rl-frontend-1086514937351.europe-west1.run.app
- Backend URL: https://career-rl-backend-1086514937351.europe-west1.run.app
- Test Session ID: `sess-1fa272f6db74` (or create a new one)

## Test 1: Voice Input in Interview

### Objective
Verify that voice recording works correctly for interview questions and that answers are transcribed and graded accurately.

### Steps

1. **Start the Application**
   - Open the frontend URL in your browser
   - Click "Start Job Search" from the graduation screen

2. **Generate and Select a Job**
   - Wait for job listings to load (5-10 jobs should appear)
   - Click on any job card to view details
   - Click "Start Interview" button

3. **Navigate to a Question**
   - You should see 3-5 interview questions
   - Navigate to the first question using the question navigation buttons

4. **Test Voice Recording**
   - Locate the "Use Voice" button next to the answer text area
   - Click the "Use Voice" button
   - **Expected**: VoiceRecorder component should appear

5. **Record Your Answer**
   - Click "Start Recording" button
   - **Expected**: 
     - Red pulsing dot appears
     - Timer starts counting (0:00, 0:01, 0:02...)
     - Animated waveform bars appear
   - Speak clearly for 20-30 seconds
   - Provide a detailed answer to the question
   - Example: "I have 5 years of experience with Swift development. I've built multiple iOS apps using UIKit and SwiftUI. I'm proficient in MVVM architecture, Combine framework, and Core Data. I've also worked with RESTful APIs and implemented complex UI animations."

6. **Stop Recording**
   - Click "Stop Recording" button
   - **Expected**:
     - Recording stops
     - Timer stops
     - Audio playback controls appear
     - "Re-record" and "Use This Recording" buttons appear

7. **Review Recording**
   - Click the play button on the audio player
   - **Expected**: Your recorded audio plays back
   - Verify audio quality is clear
   - If not satisfied, click "Re-record" and repeat steps 5-7

8. **Confirm Recording**
   - Click "Use This Recording" button
   - **Expected**:
     - VoiceRecorder component closes
     - "[Voice Answer Recorded]" text appears in the answer field
     - Audio player with your recording appears
     - "Remove" button is available

9. **Submit Interview**
   - Answer remaining questions (with text or voice)
   - Click "Submit Answers" button
   - **Expected**: Loading indicator appears with "Grading..." text

10. **Verify Results**
    - Wait for grading to complete (may take 30-60 seconds for voice)
    - **Expected**:
      - Interview result screen appears
      - Overall score is displayed (e.g., "85/100")
      - Feedback for each question is shown
      - Voice answer should have transcription in feedback
      - Pass/fail status is clear
    - **Verify**:
      - Transcription is accurate
      - Grading is fair and based on content
      - Score reflects answer quality

### Success Criteria
- ✅ Voice recording starts and stops correctly
- ✅ Waveform visualization appears during recording
- ✅ Audio playback works
- ✅ Re-record functionality works
- ✅ Voice answer is submitted successfully
- ✅ Transcription is accurate (>90% accuracy)
- ✅ Grading is fair and consistent with text answers
- ✅ Feedback mentions transcribed content

### Common Issues

**Issue**: Microphone permission denied
- **Solution**: Grant microphone permission in browser settings
- **Chrome**: Settings > Privacy and Security > Site Settings > Microphone
- **Firefox**: Preferences > Privacy & Security > Permissions > Microphone
- **Safari**: Preferences > Websites > Microphone

**Issue**: No audio recorded
- **Solution**: Check microphone is not muted, try different microphone

**Issue**: Poor transcription quality
- **Solution**: Speak clearly, reduce background noise, use better microphone

**Issue**: Recording doesn't start
- **Solution**: Refresh page, check browser console for errors

## Test 2: Voice Input in Task Submission

### Objective
Verify that voice recording works correctly for task solutions and that XP is awarded properly.

### Steps

1. **Accept Job Offer**
   - If you passed the interview in Test 1, accept the job offer
   - If not, complete a new interview with text answers and pass
   - **Expected**: Navigate to Work Dashboard

2. **View Tasks**
   - You should see 3-5 task cards in the task panel
   - Each task shows title, difficulty stars, and XP reward
   - Click on any task card

3. **Open Task Detail**
   - Task detail modal should open
   - **Expected**:
     - Task title, description, requirements visible
     - "Use Voice" button appears next to solution text area
     - If task has an AI-generated image, it should be visible

4. **Test Voice Recording**
   - Click the "Use Voice" button
   - **Expected**: VoiceRecorder component appears

5. **Record Your Solution**
   - Click "Start Recording" button
   - **Expected**: Same recording UI as interview (red dot, timer, waveform)
   - Speak for 30-60 seconds
   - Provide a detailed solution to the task
   - Example: "To implement this feature, I would first create a new Swift file for the view controller. Then I'd design the UI using Auto Layout constraints. I'd implement the business logic in a separate view model following MVVM pattern. I'd add error handling for network requests and write unit tests to verify the functionality. Finally, I'd document the code and submit for code review."

6. **Stop and Review**
   - Click "Stop Recording"
   - Review the recording using audio playback
   - Re-record if needed
   - Click "Use This Recording"

7. **Submit Solution**
   - Click "Submit Solution" button
   - **Expected**: Loading indicator appears with "Submitting..." text

8. **Verify Results**
   - Wait for grading to complete (may take 30-60 seconds)
   - **Expected**:
     - Success animation appears (checkmark or level up)
     - Score is displayed (e.g., "90/100")
     - XP gained is shown (e.g., "+50 XP")
     - Feedback explains the score
     - If leveled up, level up animation plays
    - **Verify**:
      - Transcription is accurate
      - Grading reflects solution quality
      - XP is added to player stats
      - New task appears in task panel

9. **Check Player Stats**
   - Close the task modal
   - Look at the stats panel on the left
   - **Expected**:
     - XP bar has increased
     - Tasks completed count increased by 1
     - If leveled up, new level is displayed

### Success Criteria
- ✅ Voice recording works in task modal
- ✅ Solution is transcribed accurately
- ✅ Grading is fair and detailed
- ✅ XP is awarded correctly
- ✅ Level up occurs if threshold reached
- ✅ New task is generated automatically
- ✅ Stats are updated correctly

### Common Issues

**Issue**: Task submission fails
- **Solution**: Check network connection, verify session is still active

**Issue**: No XP awarded
- **Solution**: Check if task was already completed, verify backend logs

**Issue**: Transcription is incomplete
- **Solution**: Speak more slowly, ensure recording is at least 20 seconds

## Test 3: Mixed Input (Text + Voice)

### Objective
Verify that mixing text and voice answers works correctly in the same interview.

### Steps

1. **Start New Interview**
   - Create a new session or use existing one
   - Start an interview with 3+ questions

2. **Answer with Mixed Input**
   - Question 1: Use text input (type your answer)
   - Question 2: Use voice input (record your answer)
   - Question 3: Use text input (type your answer)

3. **Submit Interview**
   - Click "Submit Answers"
   - **Expected**: All answers are processed correctly

4. **Verify Results**
   - Check that all questions have feedback
   - Verify voice question has transcription
   - Verify overall score is calculated correctly
   - **Expected**: No errors, all answers graded fairly

### Success Criteria
- ✅ Can mix text and voice in same interview
- ✅ All answers are submitted successfully
- ✅ Grading works for both input types
- ✅ No errors or crashes

## Test 4: Edge Cases

### Test 4.1: Very Short Recording

1. Start voice recording
2. Speak for only 2-3 seconds
3. Stop and submit
4. **Expected**: May receive lower score or warning about answer length

### Test 4.2: Very Long Recording

1. Start voice recording
2. Speak for 2-3 minutes
3. Stop and submit
4. **Expected**: Recording works, transcription may be truncated

### Test 4.3: Background Noise

1. Start voice recording in noisy environment
2. Speak with background music or conversation
3. Stop and submit
4. **Expected**: Transcription may have errors, grading should still work

### Test 4.4: Multiple Re-records

1. Start voice recording
2. Stop and click "Re-record"
3. Repeat 3-4 times
4. Finally confirm a recording
5. **Expected**: No errors, latest recording is used

### Test 4.5: Cancel Recording

1. Start voice recording
2. Click "Cancel" button
3. **Expected**: Recording is discarded, back to text input

### Test 4.6: Remove Voice Answer

1. Record a voice answer
2. Confirm it
3. Click "Remove" button
4. **Expected**: Voice answer is removed, can type text or record again

## Test 5: Performance Testing

### Test 5.1: Recording Duration

1. Record answers of varying lengths:
   - 10 seconds
   - 30 seconds
   - 60 seconds
   - 120 seconds
2. **Expected**: All recordings work, longer ones take more time to process

### Test 5.2: Submission Time

1. Submit voice answer
2. Measure time from submission to result
3. **Expected**: 
   - Text answers: 5-10 seconds
   - Voice answers: 30-60 seconds
   - Acceptable delay for voice processing

### Test 5.3: Multiple Voice Answers

1. Answer all interview questions with voice (3-5 questions)
2. Submit interview
3. **Expected**: All answers processed, may take 1-2 minutes total

## Test 6: Browser Compatibility

### Test on Chrome
- Follow Test 1 and Test 2
- **Expected**: Full functionality, smooth experience

### Test on Firefox
- Follow Test 1 and Test 2
- **Expected**: Full functionality, may have different audio player UI

### Test on Safari
- Follow Test 1 and Test 2
- **Expected**: Full functionality, may require additional permissions

### Test on Mobile (Optional)
- Open frontend on mobile device (iOS/Android)
- Follow Test 1 and Test 2
- **Expected**: Works on HTTPS, may have different UI layout

## Test 7: Error Handling

### Test 7.1: Network Interruption

1. Start voice recording
2. Disconnect internet
3. Try to submit
4. **Expected**: Error message, can retry when connection restored

### Test 7.2: Session Expiry

1. Start voice recording
2. Wait for session to expire (if applicable)
3. Try to submit
4. **Expected**: Error message about expired session

### Test 7.3: Invalid Audio Format

1. (Advanced) Try to upload non-audio file
2. **Expected**: Error message about invalid format

## Requirements Verification

### Requirement 21.1: Microphone Button
- ✅ "Use Voice" button appears on interview answer fields
- ✅ "Use Voice" button appears on task solution fields
- ✅ Button is clearly visible and accessible

### Requirement 21.2: Audio Recording
- ✅ Uses Web Audio API (via react-media-recorder)
- ✅ Recording starts and stops correctly
- ✅ Audio is captured in WebM format

### Requirement 21.3: Audio Upload
- ✅ Audio data sent to backend as multipart/form-data
- ✅ Supported formats: WebM, MP3, WAV
- ✅ File upload works reliably

### Requirement 21.4: Gemini Multimodal
- ✅ Backend uses Gemini API for transcription
- ✅ Audio is processed and understood correctly
- ✅ Transcription is accurate (>90%)

### Requirement 21.5: Same Grading
- ✅ Voice answers graded with same criteria as text
- ✅ No special treatment for voice vs text
- ✅ Fair and consistent evaluation

### Requirement 21.6: Recording Indicator
- ✅ Red pulsing dot during recording
- ✅ Timer shows recording duration
- ✅ Waveform visualization animates

### Requirement 21.7: Review and Re-record
- ✅ Audio playback after recording
- ✅ "Re-record" button available
- ✅ Can record multiple times before submitting

## Test Results Template

Use this template to document your test results:

```
## Test Session: [Date/Time]
**Tester**: [Your Name]
**Browser**: [Chrome/Firefox/Safari]
**Session ID**: [Session ID]

### Test 1: Voice Input in Interview
- Recording: ✅ / ❌
- Waveform: ✅ / ❌
- Playback: ✅ / ❌
- Transcription: ✅ / ❌
- Grading: ✅ / ❌
- Notes: [Any observations]

### Test 2: Voice Input in Task
- Recording: ✅ / ❌
- Submission: ✅ / ❌
- XP Award: ✅ / ❌
- Notes: [Any observations]

### Test 3: Mixed Input
- Text + Voice: ✅ / ❌
- Notes: [Any observations]

### Overall Assessment
- All requirements met: ✅ / ❌
- Issues found: [List any issues]
- Recommendations: [Any suggestions]
```

## Troubleshooting

### Recording Issues
1. Check microphone permissions
2. Verify microphone is not muted
3. Try different browser
4. Check browser console for errors

### Transcription Issues
1. Speak more clearly
2. Reduce background noise
3. Use better microphone
4. Check internet connection

### Grading Issues
1. Verify answer is relevant to question
2. Ensure recording is at least 20 seconds
3. Check that transcription is accurate
4. Review grading feedback for details

### Performance Issues
1. Close other browser tabs
2. Check internet speed
3. Try during off-peak hours
4. Clear browser cache

## Conclusion

After completing all tests, you should have verified that:
- Voice recording works reliably across browsers
- Transcription is accurate and useful
- Grading is fair and consistent
- User experience is smooth and intuitive
- All requirements (21.1-21.7) are satisfied

If any issues are found, document them clearly with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and environment details
- Screenshots or recordings if possible

## Next Steps

After successful testing:
1. Document any bugs found
2. Create tickets for improvements
3. Update user documentation
4. Consider additional features (real-time transcription, language support, etc.)
5. Monitor production usage and gather user feedback
