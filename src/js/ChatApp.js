export default class ChatApp {
  constructor(serverUrl = "ws://localhost:8080") {
    this.ws = new WebSocket(serverUrl);
    this.nickname = null;
    this.messageQueue = [];
    this.isConnected = false;

    // Обработчики событий WebSocket
    this.ws.onopen = () => {
      console.log("WebSocket соединение установлено");
      this.isConnected = true;
      this.flushMessageQueue();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket ошибка:", error);
      document.getElementById("errorMessage").textContent =
        "Ошибка соединения с сервером";
      document.getElementById("errorMessage").style.display = "block";
    };

    this.ws.onclose = () => {
      console.log("WebSocket соединение закрыто");
      this.isConnected = false;
    };

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById("continueButton").onclick = () =>
      this.registerUser();
    document.getElementById("messageInput").onkeypress = (e) =>
      this.handleMessageInput(e);
  }

  // Отправка сообщения или добавление в очередь
  sendMessage(message) {
    if (this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  // Отправка всех сообщений из очереди
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  registerUser() {
    this.nickname = document.getElementById("nicknameInput").value.trim();

    if (!this.nickname) {
      document.getElementById("errorMessage").textContent =
        "Пожалуйста, введите никнейм";
      document.getElementById("errorMessage").style.display = "block";
      return;
    }

    this.sendMessage({
      type: "register",
      nickname: this.nickname,
    });
  }

  handleMessageInput(e) {
    if (e.key === "Enter") {
      const message = e.target.value.trim();
      if (!message) return;

      this.sendMessage({
        type: "message",
        nickname: this.nickname,
        message: message,
      });

      e.target.value = "";
    }
  }

  updateUserList(users) {
    const userList = document.getElementById("userList");
    if (!userList) return;

    userList.innerHTML = users
      .map((user) => {
        const isCurrentUser = user === this.nickname;
        return `
          <div class="user-item">
              <div class="avatar"></div>
              <div class="user-name ${isCurrentUser ? "you" : ""}">
                ${isCurrentUser ? "You" : user}
              </div>
          </div>
        `;
      })
      .join("");
  }

  // Форматирование даты и времени
  formatTimestamp(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    return {
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: date.toLocaleDateString(),
    };
  }

  appendMessage(data) {
    const messagesContainer = document.getElementById("messagesContainer");
    if (!messagesContainer) return;

    const messageElement = document.createElement("div");
    messageElement.classList.add("message");

    const { time, date } = this.formatTimestamp(data.timestamp);
    const isCurrentUser = data.nickname === this.nickname;

    if (isCurrentUser) {
      messageElement.classList.add("you");
      messageElement.innerHTML = `
        <div class="meta">You, ${time} ${date}</div>
        <div class="message-content">${data.message}</div>
      `;
    } else {
      messageElement.classList.add("other");
      messageElement.innerHTML = `
        <div class="meta">${data.nickname}, ${time} ${date}</div>
        <div class="message-content">${data.message}</div>
      `;
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  setupCustomScrollbar() {
    const chatBox = document.getElementById("messagesContainer");
    const scrollUp = document.getElementById("scrollUp");
    const scrollDown = document.getElementById("scrollDown");
    const scrollThumb = document.getElementById("customScrollThumb");
    const scrollBar = document.getElementById("customScrollBar");

    let isDragging = false;
    let startY, startScrollTop;

    const updateScrollThumb = () => {
      const chatBoxHeight = chatBox.scrollHeight;
      const chatBoxVisibleHeight = chatBox.clientHeight;
      const scrollBarHeight = scrollBar.clientHeight - 40;
      const thumbHeight = Math.max(
        (chatBoxVisibleHeight / chatBoxHeight) * scrollBarHeight,
        20,
      );
      const thumbTop =
        (chatBox.scrollTop / (chatBoxHeight - chatBoxVisibleHeight)) *
        (scrollBarHeight - thumbHeight);
      scrollThumb.style.height = `${thumbHeight}px`;
      scrollThumb.style.transform = `translateY(${thumbTop}px)`;
    };

    scrollUp.addEventListener("click", () => {
      chatBox.scrollBy({ top: -50, behavior: "smooth" });
    });

    scrollDown.addEventListener("click", () => {
      chatBox.scrollBy({ top: 50, behavior: "smooth" });
    });

    chatBox.addEventListener("scroll", updateScrollThumb);
    window.addEventListener("resize", updateScrollThumb);
    updateScrollThumb();

    scrollThumb.addEventListener("mousedown", (e) => {
      isDragging = true;
      startY = e.clientY;
      startScrollTop = chatBox.scrollTop;
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startY;
      const chatBoxHeight = chatBox.scrollHeight;
      const chatBoxVisibleHeight = chatBox.clientHeight;
      const scrollBarHeight = scrollBar.clientHeight - 40;
      const thumbHeight = scrollThumb.clientHeight;
      const maxScroll = chatBoxHeight - chatBoxVisibleHeight;
      const scrollPercent = deltaY / (scrollBarHeight - thumbHeight);
      chatBox.scrollTop = startScrollTop + scrollPercent * maxScroll;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.userSelect = "";
    });
  }

  // Метод для добавления системного сообщения
  appendSystemMessage(message) {
    const messagesContainer = document.getElementById("messagesContainer");
    if (!messagesContainer) return;

    const messageElement = document.createElement("div");
    messageElement.className = "system-message";
    messageElement.textContent = message;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  start() {
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Получено сообщение:", data);

        switch (data.type) {
          case "registered": {
            document.getElementById("nicknameModal").style.display = "none";
            document.getElementById("chatContainer").style.display = "flex";
            document.getElementById("errorMessage").style.display = "none";
            this.setupCustomScrollbar();
            break;
          }

          case "error": {
            const errorMessage =
              data.message === "Nickname is already taken"
                ? "Этот никнейм уже занят"
                : data.message;
            document.getElementById("errorMessage").textContent = errorMessage;
            document.getElementById("errorMessage").style.display = "block";
            break;
          }

          case "users": {
            this.updateUserList(data.users);
            break;
          }

          case "message": {
            this.appendMessage(data);
            break;
          }

          case "history": {
            if (data.messages && data.messages.length > 0) {
              this.appendSystemMessage("Загружена история сообщений:");

              data.messages.forEach((msg) => {
                this.appendMessage({
                  nickname: msg.nickname,
                  message: msg.message,
                  timestamp: msg.timestamp,
                });
              });
            }
            break;
          }

          default: {
            console.log("Неизвестный тип сообщения:", data.type);
          }
        }
      } catch (error) {
        console.error("Ошибка обработки сообщения:", error, event.data);
      }
    };

    // Обработка закрытия соединения
    this.ws.onclose = () => {
      console.log("Соединение с сервером закрыто");
      this.isConnected = false;
    };
  }
}
