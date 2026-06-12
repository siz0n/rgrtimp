import { query } from "../config/db.js";

export async function logAction(
  userId,
  action,
  entityName,
  entityId,
  options = {}
) {
  const actorUsername = options.actorUsername || null;
  const actorEmail = options.actorEmail || null;
  const actorRole = options.actorRole || null;

  await query(
    `
      INSERT INTO audit_logs (
        user_id,
        actor_username,
        actor_email,
        actor_role,
        action,
        entity_name,
        entity_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      userId || null,
      actorUsername,
      actorEmail,
      actorRole,
      action,
      entityName,
      entityId || null,
    ]
  );
}
