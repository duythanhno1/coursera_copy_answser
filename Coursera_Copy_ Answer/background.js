chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'selectAnswer') {
    const { tabId, questionNumber, answerValues } = message;
    console.log(`Background received request to select answers for question ${questionNumber}:`, answerValues);
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: selectAnswerInTab,
      args: [questionNumber, answerValues]
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Error executing script in tab:', chrome.runtime.lastError);
        chrome.tabs.sendMessage(tabId, {
          type: 'showError',
          message: `Failed to select answers: ${chrome.runtime.lastError.message}`
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error sending error message:', chrome.runtime.lastError);
            alert(`Failed to select answers: ${chrome.runtime.lastError.message}`);
          }
        });
      } else if (results && results[0]?.result === 'success') {
        console.log(`Successfully selected answers for question ${questionNumber}`);
        chrome.tabs.sendMessage(tabId, {
          type: 'showSuccess',
          message: 'Answers selected automatically from Gemini response!'
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error sending success message:', chrome.runtime.lastError);
            alert('Answers selected automatically from Gemini response!');
          }
        });
      } else {
        console.error('Failed to select answers in tab');
        chrome.tabs.sendMessage(tabId, {
          type: 'showError',
          message: 'Failed to select answers. Please check the console for details.'
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error sending error message:', chrome.runtime.lastError);
            alert('Failed to select answers. Please check the console for details.');
          }
        });
      }
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for sendResponse
  }
});

function selectAnswerInTab(questionNumber, answerValues) {
  console.log(`Attempting to select answers for question ${questionNumber} in tab:`, answerValues);

  // Tìm nhóm câu hỏi tương ứng với số câu (questionNumber)
  const radioGroups = document.querySelectorAll('[role="radiogroup"], [role="group"]'); // Hỗ trợ cả CheckboxQuestion (role="group")
  let groupIndex = questionNumber - 1; // Vì questionNumber bắt đầu từ 1
  if (groupIndex >= radioGroups.length) {
    console.error(`No radio/group found for question ${questionNumber}`);
    alert(`No radio/group found for question ${questionNumber}.`);
    return 'error';
  }

  const group = radioGroups[groupIndex];
  const labels = group.querySelectorAll('label._1oyudm1w'); // Tìm tất cả label có class "_1oyudm1w"
  if (labels.length === 0) {
    console.error(`No labels found for question ${questionNumber}`);
    alert(`No labels found for question ${questionNumber}.`);
    return 'error';
  }

  const inputs = group.querySelectorAll('input[type="radio"]._htmk7zm, input[type="checkbox"]._htmk7zm'); // Hỗ trợ cả radio và checkbox
  const inputName = inputs[0]?.name;
  if (!inputName) {
    console.error(`No input name found for question ${questionNumber}`);
    alert(`No input name found for question ${questionNumber}.`);
    return 'error';
  }

  // Xóa hết checked và class .cui-isChecked trong cùng nhóm
  document.querySelectorAll(`label._1oyudm1w input[name="${inputName}"][type="radio"], label._1oyudm1w input[name="${inputName}"][type="checkbox"]`).forEach((radio) => {
    radio.checked = false;
    radio.dispatchEvent(new Event('change'));
    const label = radio.closest('label._1oyudm1w');
    if (label) {
      label.classList.remove('cui-isChecked');
    }
  });

  // Khoanh các đáp án từ Gemini bằng cách mô phỏng click với lặp lại
  let success = false;
  answerValues.forEach(answerText => {
    const letterMatch = answerText.match(/^[a-eA-E]+/); // Hỗ trợ từ 'a' đến 'e'
    const textMatch = answerText.replace(/^[a-eA-E]+\.\s*/, '').trim(); // Lấy text sau chữ cái
    if (letterMatch) {
      const letter = letterMatch[0].toLowerCase();
      const optionIndex = letter.charCodeAt(0) - 97; // Chuyển từ 'a' -> 0, 'b' -> 1, ...
      if (optionIndex >= 0 && optionIndex < labels.length) {
        const targetLabel = labels[optionIndex];
        const targetInput = targetLabel.querySelector('input[type="radio"], input[type="checkbox"]');
        if (targetInput) {
          const optionTextElement = targetLabel.querySelector('p.css-4s48ix');
          const optionText = optionTextElement ? optionTextElement.textContent.trim() : '';
          if (optionText.toLowerCase().includes(textMatch.toLowerCase())) {
            targetInput.checked = true;
            targetLabel.classList.add('cui-isChecked');
            // Mô phỏng click chi tiết với lặp lại
            const simulateClick = (label, attempt = 0, maxAttempts = 3) => {
              if (attempt >= maxAttempts) {
                console.error(`Failed to select answer ${letter}. ${textMatch} for question ${questionNumber} after ${maxAttempts} attempts`);
                alert(`Failed to select answer ${letter}. ${textMatch} for question ${questionNumber} after ${maxAttempts} attempts.`);
                return;
              }

              const mouseEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              const focusEvent = new FocusEvent('focus', { bubbles: true, cancelable: true });
              const blurEvent = new FocusEvent('blur', { bubbles: true, cancelable: true });

              label.dispatchEvent(focusEvent);
              label.dispatchEvent(mouseEvent);
              label.dispatchEvent(blurEvent);
              targetInput.dispatchEvent(new Event('change'));

              console.log(`Attempt ${attempt + 1} to select answer ${letter}. ${textMatch} for question ${questionNumber}`);

              setTimeout(() => {
                if (label.classList.contains('cui-isChecked')) {
                  console.log(`Successfully selected answer ${letter}. ${textMatch} for question ${questionNumber} with value ${targetInput.value}`);
                  success = true;
                } else {
                  simulateClick(label, attempt + 1, maxAttempts);
                }
              }, 300);
            };

            simulateClick(targetLabel);
          } else {
            console.error(`Text mismatch for letter ${letter}: Expected "${textMatch}", found "${optionText}"`);
            alert(`Text mismatch for letter ${letter} in question ${questionNumber}.`);
          }
        }
      } else {
        console.error(`Invalid option letter ${letter} for question ${questionNumber}`);
        alert(`Invalid option letter ${letter} for question ${questionNumber}.`);
      }
    }
  });

  return success ? 'success' : 'error';
}