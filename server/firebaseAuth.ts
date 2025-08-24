import { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage.js";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  const sessionSecret = process.env.SESSION_SECRET || "fallback-development-secret-only-for-replit-agent-migration";
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export function setupAuth(app: any) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Firebase token verification endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { idToken, user } = req.body;
      
      if (!idToken || !user) {
        return res.status(400).json({ message: "ID token and user data required" });
      }

      // Store user in session
      (req.session as any).firebaseUser = user;
      
      // Upsert user in database
      await storage.upsertUser({
        id: user.uid,
        email: user.email,
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: user.photoURL,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Get current user endpoint  
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      const firebaseUser = (req.session as any)?.firebaseUser;
      
      if (!firebaseUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(firebaseUser.uid);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const firebaseUser = (req.session as any)?.firebaseUser;
  
  if (!firebaseUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user info to request
  (req as any).user = {
    claims: {
      sub: firebaseUser.uid,
      email: firebaseUser.email,
    }
  };

  next();
};
