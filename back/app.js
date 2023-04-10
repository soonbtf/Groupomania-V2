import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import url from "url";
import bcrypt from "bcrypt";
import "dotenv/config";
import axios from "axios";
import { sequelize } from "./db/db_init.js";
import { User } from "./db/sequelize.js";
import postRoutes from "./routes/postRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import reactionRoutes from "./routes/reactionRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

export const app = express();
export const httpServer = createServer(app);

/* Ces deux lignes sont obligatoires car la syntaxe ES6 est utilisée.*/
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/images", express.static(path.join(__dirname, "images")));
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Parse les données json et impose une limite de 50mb
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

/* Connexion et initialisation de la db avec un user admin génér automatiquement */
sequelize
  .sync()
  .then(async () => {
    console.log("Connexion à la BDD réussie");
    const findUserAdmin = await User.findOne({
      where: {
        isAdmin: true,
      },
    });
    if (!findUserAdmin) {
      // Pour éviter de recréer un user admin s'il y en a déjà un
      bcrypt.hash(process.env.ADMINPASSWORD, 10).then((hash) => {
        User.create({
          email: "admin@gmail.com",
          password: hash,
          firstname: "Modérateur",
          lastname: "TinyTeams",
          username: "modérateurtinyteams",
          isAdmin: true,
          profilePicture: "http://localhost:3000/images/moderator.png",
        });
      });
    }
  })
  .catch((error) => console.log(error));

app.use("/api/users/", userRoutes);
app.use("/api/posts/", postRoutes);
app.use("/api/posts/", reactionRoutes);
app.use("/api/posts/", commentRoutes);
app.use("/api/users/", followRoutes);
app.use("/api/notifications", notificationRoutes);

const sessionsMap = {};
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  },
});

const getFollowers = async (userId, token) => {
  return await axios({
    url: `http://localhost:3000/api/users/follow/getAll/${userId}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
const createNotification = async (data, followerId) => {
  try {
    await axios({
      url: "http://localhost:3000/api/notifications/create",
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.token}`,
      },
      data: {
        notifiableType: data.type,
        notifiableId: data.notifiableId ? data.notifiableId : null,
        postId: data.postId ? data.postId : null,
        sender: data.senderId,
        senderUsername: data.senderUsername,
        senderProfilePicture: data.senderProfilePicture,
        receiver: followerId,
      },
    });
  } catch (err) {
    console.log(err.response);
  }
};

const sendNotification = (data, receiver, eventName) => {
  if (receiver === data.senderId) {
    console.log(receiver === data.senderId);
    return;
  }
  io.to(sessionsMap[receiver]).emit(eventName, {
    notifType: data.type,
    senderId: data.sender,
    senderUsername: data.senderUsername,
    postId: data.postId || null,
  });
};

io.on("connection", (socket) => {
  socket.on("sendUserId", (userId) => {
    if (userId) {
      sessionsMap[userId] = socket.id;
      console.log(sessionsMap);
    }
  });
  socket.on("newFollow", async (data) => {
    console.log(data);
    createNotification(data, data.receiver);
    sendNotification(data, data.receiver, "notifFollow");
  });
  socket.on("newPost", async (data) => {
    const authorFollowers = await getFollowers(data.senderId, data.token);
    for (const follower of authorFollowers.data) {
      createNotification(data, follower.author);
      sendNotification(data, follower.author, "notifPost");
    }
  });
  socket.on("newLike", async (data) => {
    console.log(data);
    createNotification(data, data.receiver);
    sendNotification(data, data.receiver, "notifLike");
  });
  socket.on("newComment", async (data) => {
    console.log(data);
    createNotification(data, data.receiver);
    sendNotification(data, data.receiver, "notifComment");
  });
});

httpServer.listen(process.env.PORT || 3000);
// app.listen(process.env.PORT || 3000);
