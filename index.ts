import express, { Express, Request, Response, Application } from "express";
import dotenv from "dotenv";
const routes = require("./route/CouponTokenRoute");

//For env File
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 8000;

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Coupon Token Server");
});

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});

// Mounting the routes
app.use("/api", routes);
