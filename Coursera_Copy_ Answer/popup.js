document.addEventListener('DOMContentLoaded', () => {
  const legalNameInput = document.getElementById('legalName');
  const saveButton = document.getElementById('saveButton');
  const editButton = document.getElementById('editButton');
  const savedMessage = document.getElementById('savedMessage');
  const editMessage = document.getElementById('editMessage');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const saveApiButton = document.getElementById('saveApiButton');
  const apiSavedMessage = document.getElementById('apiSavedMessage');

  console.log('Popup loaded');

  // Load tên và API key đã lưu
  chrome.storage.sync.get(['legalName', 'geminiApiKey'], (result) => {
    console.log('Loaded from storage:', result);
    if (result.legalName) {
      legalNameInput.value = result.legalName;
      saveButton.style.display = 'none';
      editButton.style.display = 'inline-block';
      savedMessage.classList.remove('d-none');
    }
    if (result.geminiApiKey) {
      geminiApiKeyInput.value = result.geminiApiKey; // Không hiển thị rõ key trong input (dùng type="password")
    }
  });

  // Xử lý nút Save (tên)
  saveButton.addEventListener('click', () => {
    const name = legalNameInput.value.trim();
    if (name) {
      chrome.storage.sync.set({ legalName: name }, () => {
        console.log('Saved legal name:', name);
        saveButton.style.display = 'none';
        editButton.style.display = 'inline-block';
        savedMessage.classList.remove('d-none');
        editMessage.classList.add('d-none');
      });
    } else {
      console.log('No name entered');
    }
  });

  // Xử lý nút Edit (tên)
  editButton.addEventListener('click', () => {
    saveButton.style.display = 'inline-block';
    editButton.style.display = 'none';
    savedMessage.classList.add('d-none');
    editMessage.classList.add('d-none');
    legalNameInput.focus(); // Focus vào ô input để chỉnh sửa
  });

  // Xử lý khi nhấn Enter trong ô input (tên)
  legalNameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      const name = legalNameInput.value.trim();
      if (name) {
        chrome.storage.sync.set({ legalName: name }, () => {
          console.log('Updated legal name:', name);
          saveButton.style.display = 'none';
          editButton.style.display = 'inline-block';
          savedMessage.classList.add('d-none');
          editMessage.classList.remove('d-none');
        });
      }
    }
  });

  // Xử lý nút Save API Key
  saveApiButton.addEventListener('click', () => {
    const apiKey = geminiApiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        console.log('Saved Gemini API Key:', apiKey);
        apiSavedMessage.classList.remove('d-none');
        setTimeout(() => apiSavedMessage.classList.add('d-none'), 3000); // Ẩn thông báo sau 3 giây
      });
    } else {
      console.log('No API key entered');
    }
  });
});