**Installation**
Clone or Download the Repository:
  bash
  Wrap
  Copy
  git clone (https://github.com/duythanhno1/coursera_copy_answser.git
Load in Chrome:
  Open Chrome: chrome://extensions/.
  Enable "Developer mode" (top-right).
  Click "Load unpacked" and select the coursera-copy folder.
Configure Settings:
  Click the extension icon in Chrome’s toolbar.
  Enter your legal name and Gemini API key, then click "Save" for each.
**Usage**
Keyboard Shortcuts (on Coursera quiz pages):
  **Alt + Z**: Copy the current question and options (cycles through questions).
  **Alt + C**: Copy all questions and options.
  **Alt + G**: Send copied content to Gemini API for answers.
  **Alt + Q**: Auto-select answers based on the Gemini response.
**File Structure**
  manifest.json: Extension metadata.
  content.js: Handles quiz interactions and shortcuts.
  background.js: Manages answer selection.
  popup.html/.js: Settings interface.
  bootstrap.min.css: Styling for notifications.
**Support**
  For issues, open a GitHub issue or contact .....
