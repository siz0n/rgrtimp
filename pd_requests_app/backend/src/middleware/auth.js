import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({
        message: "Требуется авторизация",
      });
    }

    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({
        message: "Неверный формат токена",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "change_this_secret_key"
    );

    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Недействительный или просроченный токен",
    });
  }
}

export function requireRole(roles = []) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        message: "Требуется авторизация",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Недостаточно прав",
      });
    }

    return next();
  };
}

export function permit(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        message: "Требуется авторизация",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Недостаточно прав",
      });
    }

    return next();
  };
}