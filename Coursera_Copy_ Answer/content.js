let currentQuestionIndex = 0;
let lastCopiedContent = ''; // Biến lưu nội dung đã copy để dùng cho Alt + G

// Thêm CSS để định nghĩa .bottom-55
const style = document.createElement('style');
style.textContent = `
  .bottom-55 {
    bottom: 55px !important;
  }
`;
document.head.appendChild(style);

// Hàm hiển thị thông báo thông thường (tự động tắt sau 5 giây), di chuyển xuống 55px và tối ưu responsive
function showRegularMessage(message = 'Action completed!') {
  let messageBox = document.getElementById('regular-message-box');
  if (!messageBox) {
    messageBox = document.createElement('div');
    messageBox.id = 'regular-message-box';
    messageBox.classList.add('alert', 'alert-success', 'position-fixed', 'end-0', 'bottom-55', 'm-3', 'shadow');
    messageBox.style.maxWidth = '90%';
    messageBox.style.zIndex = '9999';
    messageBox.style.wordWrap = 'break-word';
    document.body.appendChild(messageBox);
  }
  messageBox.textContent = message;
  messageBox.style.opacity = '1';

  setTimeout(() => {
    messageBox.style.opacity = '0';
    setTimeout(() => {
      if (messageBox.parentNode === document.body) {
        document.body.removeChild(messageBox);
      }
    }, 500);
  }, 5000);
}

// Hàm hiển thị thông báo lỗi hoặc success từ background
function handleMessageFromBackground(message) {
  if (message.type === 'showSuccess') {
    showRegularMessage(message.message);
  } else if (message.type === 'showError') {
    showRegularMessage(message.message);
    console.error(message.message);
  }
}

// Hàm hiển thị thông báo kết quả từ Gemini
function showGeminiResponse(message = 'Gemini Response') {
  let geminiBox = document.getElementById('gemini-response-box');
  if (!geminiBox) {
    geminiBox = document.createElement('div');
    geminiBox.id = 'gemini-response-box';
    geminiBox.classList.add('alert', 'alert-info', 'position-fixed', 'end-0', 'bottom-55', 'm-3', 'shadow');
    geminiBox.style.maxWidth = '90%';
    geminiBox.style.zIndex = '9999';
    geminiBox.style.wordWrap = 'break-word';
    geminiBox.style.overflowY = 'auto';
    geminiBox.style.maxHeight = '300px';

    geminiBox.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">${message.replace(/\n/g, '<br>')}</div>
        <button id="closeGeminiBox" class="btn-close btn-close-white" aria-label="Close"></button>
      </div>
    `;

    const closeButton = geminiBox.querySelector('#closeGeminiBox');
    closeButton.addEventListener('click', () => {
      if (geminiBox.parentNode === document.body) {
        document.body.removeChild(geminiBox);
      }
    });

    document.body.appendChild(geminiBox);
  } else {
    geminiBox.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">${message.replace(/\n/g, '<br>')}</div>
        <button id="closeGeminiBox" class="btn-close btn-close-white" aria-label="Close"></button>
      </div>
    `;
  }
}

// Hàm tự động khoanh đáp án từ Gemini
function autoSelectGeminiAnswers(geminiResponse, attempt = 0, maxAttempts = 3) {
  console.log(`Attempt ${attempt + 1} to auto-select answers from Gemini:`, geminiResponse);
  if (attempt >= maxAttempts) {
    console.error('Max attempts reached for auto-selecting answers.');
    showRegularMessage('Failed to select answers after multiple attempts. Please check the console for details.');
    return;
  }
  if (!geminiResponse) {
    console.error('No Gemini response available.');
    showRegularMessage('No Gemini response available. Please try using Alt + G first.');
    return;
  }
  const lines = geminiResponse.split('\n').filter(line => line.trim().startsWith('answer'));
  if (lines.length === 0) {
    console.error('No answers found in Gemini response!');
    showRegularMessage('No valid answers found in Gemini response.');
    return;
  }
  lines.forEach(line => {
    const match = line.match(/answer (\d+): (.*)/);
    if (match) {
      const questionNumber = parseInt(match[1], 10);
      const answersText = match[2].split('\n').map(answer => answer.trim()).filter(answer => answer);
      chrome.runtime.sendMessage({
        type: 'selectAnswer',
        tabId: chrome.devtools.inspectedWindow.tabId || chrome.runtime.lastError,
        questionNumber: questionNumber,
        answerValues: answersText
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to background:', chrome.runtime.lastError);
          showRegularMessage(`Failed to select answers: ${chrome.runtime.lastError.message}`);
          setTimeout(() => autoSelectGeminiAnswers(geminiResponse, attempt + 1, maxAttempts), 500);
        } else if (!response?.success) {
          console.error('Failed to select answers in tab');
          showRegularMessage('Failed to select answers. Please check the console for details.');
          setTimeout(() => autoSelectGeminiAnswers(geminiResponse, attempt + 1, maxAttempts), 500);
        } else {
          console.log(`Successfully requested selection for question ${questionNumber}`);
          showRegularMessage('Answers selected automatically from Gemini response!');
        }
      });
    }
  });
}

// Hàm gửi dữ liệu đến API Gemini
async function sendToGemini(content) {
  try {
    const apiKey = await new Promise((resolve) => {
      chrome.storage.sync.get(['geminiApiKey'], (result) => resolve(result.geminiApiKey || ''));
    });
    if (!apiKey) {
      showRegularMessage('Please save your Gemini API Key in the popup!');
      return;
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Analyze the following quiz questions and answers, and return the answers in this exact format:\n\n${content}\n\nReturn only the answers in the format:\nanswer 1: [letter(s)]. [answer text]\n[letter(s)]. [answer text] (for multiple answers per question, separate with new line)\nanswer 2: [letter(s)]. [answer text]\n... (continue for each question, only include the answers, no additional text or explanation)` }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
      })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini API.';
    const formattedResponse = geminiResponse.split('\n').map(line => line.trim()).filter(line => line && line.startsWith('answer'))
      .map(line => {
        const parts = line.split(': ');
        if (parts.length > 1) {
          const answers = parts[1].split('\n').map(answer => answer.trim()).filter(answer => answer);
          return `answer ${parts[0].replace('answer ', '')}:\n${answers.join('\n')}`;
        }
        return line;
      }).join('\n');
    showGeminiResponse(formattedResponse);
    lastCopiedContent = formattedResponse;
    navigator.clipboard.writeText(formattedResponse.trim()).then(() => showRegularMessage('Copied Gemini response to clipboard!'));
  } catch (error) {
    console.error('Error sending to Gemini API:', error);
    showRegularMessage(`Error: ${error.message}`);
  }
}

// Xử lý các phím tắt
document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  // Alt + Z: Copy one by one (Cập nhật cho trang mới)
  if (event.altKey && key === 'z') {
    event.preventDefault();
    const questions = document.querySelectorAll('.css-gri5r8');
    if (questions.length === 0) {
      showRegularMessage('No questions found on the page.');
      return;
    }
    if (currentQuestionIndex >= questions.length) {
      currentQuestionIndex = 0;
    }
    const question = questions[currentQuestionIndex];
    const questionContent = question.querySelector('.rc-CML');
    const questionText = questionContent ? Array.from(questionContent.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .join('\n') : 'Question text not found';
    let result = `${currentQuestionIndex + 1}. ${questionText}\n`;
    const optionsContainer = question.nextElementSibling;
    const options = optionsContainer ? optionsContainer.querySelectorAll('.rc-Option') : [];
    options.forEach((option, optIndex) => {
      const optionTextElement = option.querySelector('.rc-CML p');
      const optionText = optionTextElement ? optionTextElement.textContent.trim() : '';
      result += `${String.fromCharCode(97 + optIndex)}. ${optionText}\n`;
    });
    const currentQuestionNumber = currentQuestionIndex + 1;
    navigator.clipboard.writeText(result.trim()).then(() => {
      showRegularMessage(`Copied question ${currentQuestionNumber} of ${questions.length}!`);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      showRegularMessage('Failed to copy question to clipboard.');
    });
    currentQuestionIndex++;
  }

  // Alt + C: Copy all questions (Cập nhật cho trang mới)
  if (event.altKey && key === 'c') {
    event.preventDefault();
    const questions = document.querySelectorAll('.css-gri5r8');
    if (questions.length === 0) {
      showRegularMessage('No questions found on the page.');
      return;
    }
    let result = '';
    questions.forEach((question, index) => {
      const questionContent = question.querySelector('.rc-CML');
      const questionText = questionContent ? Array.from(questionContent.querySelectorAll('p'))
        .map(p => p.textContent.trim())
        .join('\n') : 'Question text not found';
      result += `${index + 1}. ${questionText}\n`;
      const optionsContainer = question.nextElementSibling;
      const options = optionsContainer ? optionsContainer.querySelectorAll('.rc-Option') : [];
      options.forEach((option, optIndex) => {
        const optionTextElement = option.querySelector('.rc-CML p');
        const optionText = optionTextElement ? optionTextElement.textContent.trim() : '';
        result += `${String.fromCharCode(97 + optIndex)}. ${optionText}\n`;
      });
      result += '\n';
    });
    navigator.clipboard.writeText(result.trim()).then(() => {
      showRegularMessage('Copied all questions to clipboard!');
      lastCopiedContent = result.trim();
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      showRegularMessage('Failed to copy questions to clipboard.');
    });
  }

  // Alt + G: Gửi nội dung đã copy đến API Gemini
  if (event.altKey && key === 'g') {
    event.preventDefault();
    if (!lastCopiedContent) {
      showRegularMessage('No content copied yet. Use Alt + C or Alt + Z first.');
      return;
    }
    showRegularMessage('Sending to Gemini API...');
    sendToGemini(lastCopiedContent);
  }

  // Alt + Q: Auto-fill answers based on the last Gemini response
  if (event.altKey && key === 'q') {
    event.preventDefault();
    if (!lastCopiedContent) {
      showRegularMessage('No Gemini response available. Use Alt + G first.');
      return;
    }
    autoSelectGeminiAnswers(lastCopiedContent);
  }
});

// Lắng nghe thông báo từ background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessageFromBackground(message);
});

const bootstrapCSS = document.createElement('link');
bootstrapCSS.rel = 'stylesheet';
bootstrapCSS.href = './bootstrap.min.css';
document.head.appendChild(bootstrapCSS);