require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const { getUserFromRequest } = require("./middleware/auth");
const { pool } = require("./config/db");

async function start() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:4000" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: "draft-7", legacyHeaders: false }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok", application: "Nivaaran API" }));
  app.use(express.static("public"));

  const apollo = new ApolloServer({
    typeDefs, resolvers,
    introspection: process.env.NODE_ENV !== "production"
  });
  await apollo.start();
  app.use("/graphql", expressMiddleware(apollo, {
    context: async ({ req }) => ({ user: getUserFromRequest(req) })
  }));

  const port = Number(process.env.PORT || 4000);
  const server = app.listen(port, () => console.log(`Nivaaran running at http://localhost:${port}\nGraphQL: http://localhost:${port}/graphql`));
  const shutdown = async () => { server.close(); await apollo.stop(); await pool.end(); process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch(err => { console.error("Failed to start Nivaaran:", err.message); process.exit(1); });
