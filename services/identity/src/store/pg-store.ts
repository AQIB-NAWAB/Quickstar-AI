import type { Pool } from "pg";
import type {
  ApiKeyRecord,
  IdentityStore,
  MembershipRecord,
  OrganizationRecord,
  RefreshTokenRecord,
  UserRecord,
} from "./types.js";

export function createPgStore(pool: Pool): IdentityStore {
  return {
    async createUserWithOrg(input) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`, [
          input.userId,
          input.email.toLowerCase(),
          input.passwordHash,
        ]);
        await client.query(`INSERT INTO organizations (id, name) VALUES ($1, $2)`, [
          input.orgId,
          input.orgName,
        ]);
        await client.query(
          `INSERT INTO org_memberships (org_id, user_id, role) VALUES ($1, $2, 'owner')`,
          [input.orgId, input.userId],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async findUserByEmail(email) {
      const { rows } = await pool.query<UserRecord>(
        `SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt"
         FROM users WHERE email = $1`,
        [email.toLowerCase()],
      );
      return rows[0] ?? null;
    },

    async findUserById(userId) {
      const { rows } = await pool.query<UserRecord>(
        `SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt"
         FROM users WHERE id = $1`,
        [userId],
      );
      return rows[0] ?? null;
    },

    async listOrganizationsForUser(userId) {
      const { rows } = await pool.query<OrganizationRecord>(
        `SELECT o.id, o.name, o.created_at AS "createdAt"
         FROM organizations o
         INNER JOIN org_memberships m ON m.org_id = o.id
         WHERE m.user_id = $1
         ORDER BY o.created_at ASC`,
        [userId],
      );
      return rows;
    },

    async getMembership(orgId, userId) {
      const { rows } = await pool.query<MembershipRecord>(
        `SELECT org_id AS "orgId", user_id AS "userId", role::text AS role
         FROM org_memberships WHERE org_id = $1 AND user_id = $2`,
        [orgId, userId],
      );
      const row = rows[0];
      if (!row) {
        return null;
      }
      return { ...row, role: row.role as MembershipRecord["role"] };
    },

    async getOrganization(orgId) {
      const { rows } = await pool.query<OrganizationRecord>(
        `SELECT id, name, created_at AS "createdAt" FROM organizations WHERE id = $1`,
        [orgId],
      );
      return rows[0] ?? null;
    },

    async insertRefreshToken(record) {
      await pool.query(
        `INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [record.id, record.userId, record.sessionId, record.tokenHash, record.expiresAt],
      );
    },

    async findRefreshByHash(tokenHash) {
      const { rows } = await pool.query<RefreshTokenRecord>(
        `SELECT id, user_id AS "userId", session_id AS "sessionId", token_hash AS "tokenHash",
                expires_at AS "expiresAt", replaced_by_id AS "replacedById", revoked_at AS "revokedAt"
         FROM refresh_tokens WHERE token_hash = $1`,
        [tokenHash],
      );
      return rows[0] ?? null;
    },

    async markRefreshReplaced(id, replacedById) {
      await pool.query(`UPDATE refresh_tokens SET replaced_by_id = $2 WHERE id = $1`, [
        id,
        replacedById,
      ]);
    },

    async revokeRefreshToken(id) {
      await pool.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [id]);
    },

    async revokeSessionTokens(sessionId) {
      await pool.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE session_id = $1`, [
        sessionId,
      ]);
    },

    async createApiKey(record) {
      await pool.query(
        `INSERT INTO api_keys (id, org_id, name, key_prefix, key_hash, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [record.id, record.orgId, record.name, record.keyPrefix, record.keyHash, record.createdBy],
      );
    },

    async listApiKeys(orgId) {
      const { rows } = await pool.query<ApiKeyRecord>(
        `SELECT id, org_id AS "orgId", name, key_prefix AS "keyPrefix", key_hash AS "keyHash",
                created_by AS "createdBy", revoked_at AS "revokedAt", created_at AS "createdAt"
         FROM api_keys WHERE org_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`,
        [orgId],
      );
      return rows;
    },

    async revokeApiKey(orgId, keyId) {
      const { rowCount } = await pool.query(
        `UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND org_id = $2 AND revoked_at IS NULL`,
        [keyId, orgId],
      );
      return (rowCount ?? 0) > 0;
    },
  };
}
