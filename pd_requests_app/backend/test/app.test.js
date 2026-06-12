import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { auth, requireRole } from "../src/middleware/auth.js";

async function withServer(callback) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const address = server.address();
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

test("GET /api/health returns 200 and ok", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});

test("unknown route returns 404", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/unknown`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).message, "Маршрут не найден");
  });
});

test("auth rejects a request without Bearer token", () => {
  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  auth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Требуется авторизация");
});

test("auth accepts a valid JWT", () => {
  process.env.JWT_SECRET = "test-secret";
  const token = jwt.sign({ id: 1, role: "ADMIN" }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let nextCalled = false;

  auth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 1);
  assert.equal(req.user.role, "ADMIN");
});

test("requireRole returns 403 for a user without permission", () => {
  const req = { user: { id: 2, role: "USER" } };
  const res = createResponse();
  let nextCalled = false;

  requireRole(["ADMIN"])(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Недостаточно прав");
});
