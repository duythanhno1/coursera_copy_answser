# Coursera Copy Extension
_**On March 3, the full source code was published**_
A Chrome extension to assist with Coursera quizzes by copying questions, retrieving answers via the Gemini API, and auto-selecting responses.

## Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/duythanhno1/coursera_copy_answser.git
2. **Load in browser**
   - Open browser and navigate to: chrome://extensions/.
   - Enable Developer mode (toggle in the top-right corner).
   - Click Load unpacked and select the coursera-copy folder from the cloned repository.
3. **Configure Settings**
   - Click the extension icon in Chrome’s toolbar.
   - Enter your legal name and Gemini API key.
   - Click Save for each field.
4. **Usage**
   - Keyboard Shortcuts (on Coursera quiz pages)<br>
        **Alt + Z**: Copy the current question and options (cycles through questions).<br>
        **Alt + C**: Copy all questions and options on the page.<br>
        **Alt + G**: Send copied content to the Gemini API for answers.<br>
        **Alt + Q**: Auto-select answers based on the Gemini API response.<br>
