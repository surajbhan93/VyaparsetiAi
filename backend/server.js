import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

// 👉 DownBot route import (IMPORTANT)
import downbotRoutes from "./routes/downbot.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("GrowthStack AI Backend Running 🚀");
});

// 👉 Route use
app.use("/api/downbot", downbotRoutes);

// DB Connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => console.log(err));