import { io } from "socket.io-client";

const locStr = JSON.parse(localStorage.getItem(`user`));
const userId = locStr?.userId || null;

const socket = io("http://localhost:3000");

const sendUserId = () => {
  if (userId) {
    socket.on("askForUserId", () => {
      socket.emit("sendUserId", userId);
    });
  }
};

socket.on("message", (arg) => {
  alert(arg);
});

sendUserId();

export default socket;