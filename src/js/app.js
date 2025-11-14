import ChatApp from "./ChatApp.js";

document.addEventListener("DOMContentLoaded", () => {
  // const serverUrl = "ws://localhost:8080";
  const serverUrl = "wss://ahj-homeworks-8-1.onrender.com";
  const chatApp = new ChatApp(serverUrl);
  chatApp.start();
});
