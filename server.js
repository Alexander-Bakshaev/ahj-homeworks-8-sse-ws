const WebSocket = require("ws");
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server is running on port ${port}`);

// Константы для типов сообщений
const MESSAGE_TYPES = {
  REGISTER: 'register',
  REGISTERED: 'registered',
  USERS: 'users',
  MESSAGE: 'message',
  ERROR: 'error',
  SYSTEM: 'system',
  HISTORY: 'history'
};

const MAX_HISTORY = 10; // Максимальное количество хранимых сообщений

let users = {};
let messageHistory = []; // Массив для хранения истории сообщений

wss.on("connection", function connection(ws) {
  // Функция отправки истории сообщений новому пользователю
  const sendMessageHistory = () => {
    if (messageHistory.length > 0) {
      ws.send(JSON.stringify({
        type: MESSAGE_TYPES.HISTORY,
        messages: messageHistory
      }));
    }
  };

  ws.on("message", function incoming(message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case MESSAGE_TYPES.REGISTER:
          if (users[data.nickname]) {
            ws.send(JSON.stringify({
              type: MESSAGE_TYPES.ERROR,
              message: "Этот никнейм уже занят"
            }));
          } else {
            users[data.nickname] = ws;
            ws.nickname = data.nickname;
            
            // Отправляем подтверждение регистрации
            ws.send(JSON.stringify({ 
              type: MESSAGE_TYPES.REGISTERED 
            }));
            
            // Отправляем историю сообщений новому пользователю
            sendMessageHistory();
            
            // Обновляем список пользователей у всех
            broadcastUsers();
          }
          break;
          
        case MESSAGE_TYPES.MESSAGE:
          // Добавляем сообщение в историю
          messageHistory.push({
            nickname: data.nickname,
            message: data.message,
            timestamp: new Date().toISOString()
          });
          
          // Ограничиваем историю последними MAX_HISTORY сообщениями
          if (messageHistory.length > MAX_HISTORY) {
            messageHistory.shift();
          }
          
          broadcastMessage(data);
          break;
      }
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  });

  ws.on("close", function () {
    delete users[ws.nickname];
    broadcastUsers();
  });
});

function broadcastUsers() {
  const userList = Object.keys(users);
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "users", users: userList }));
    }
  });
}

function broadcastMessage(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "message", ...data }));
    }
  });
}
