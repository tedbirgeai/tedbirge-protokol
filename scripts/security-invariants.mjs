#!/usr/bin/env node
/**
 * Security invariant guard.
 *
 * Re-checks — on every CI run, after every migration or schema change — the six
 * findings that were closed on 2026-07-30:
 *
 *   ai_leads_missing_insert_policy
 *   field_reports_org_update_delete_missing
 *   link_alerts_no_insert_delete_policy
 *   mesh_messages_no_insert_update_delete_policy
 *   node_enrollments_no_insert_policy
 *   outage_events_no_write_policy
 *
 * Invariant: the tables below are written ONLY by server-side service-role code
 * (telemetry / queue / enroll / cron endpoints and authenticated server fns).
 * No migration may hand INSERT/UPDATE/DELETE back to `anon` or `authenticated`,
 * either through a GRANT or through an RLS policy.
 *
 * Exit code 1 = an invariant regressed; the CI job fails.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";

/** Tables that must stay service-role-write-only. */
const LOCKED_TABLES = [
  "ai_leads",
  "link_alerts",
  "mesh_messages",
  "node_enrollments",
  "outage_events",
];

/** Tables where writes are allowed, but only for the roles listed. */
const RESTRICTED_WRITE_TABLES = {
  // field_reports: users create their own reports; only admins change status.
  field_reports: ["authenticated", "service_role"],
};

const WRITE_WORDS = ["INSERT", "UPDATE", "DELETE", "ALL", "TRUNCATE"];
const CLIENT_ROLES = ["anon", "authenticated", "public"];

function loadMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS_DIR, file), "utf8") }));
}

/** Strip -- and /* *​/ comments so commented-out SQL never trips the guard. */
function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/** Split into individual statements, normalising whitespace. */
function statements(sql) {
  return stripComments(sql)
    .split(";")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const violations = [];
/** Live write-policy problems, keyed `table:policy` so DROP POLICY clears them. */
const policyIssues = new Map();


/** Effective grant/revoke state, replayed in migration order. */
const grantState = new Map(); // `${table}:${role}` -> Set<privilege>

function key(table, role) {
  return `${table}:${role}`;
}

function applyGrant(kind, privileges, table, roles, file) {
  for (const role of roles) {
    const set = grantState.get(key(table, role)) ?? new Set();
    for (const priv of privileges) {
      if (kind === "GRANT") set.add(priv);
      else set.delete(priv);
    }
    grantState.set(key(table, role), set);
  }
  void file;
}

for (const { file, sql } of loadMigrations()) {
  for (const stmt of statements(sql)) {
    const upper = stmt.toUpperCase();

    // --- GRANT / REVOKE tracking -------------------------------------------
    const grantMatch = stmt.match(
      /^(GRANT|REVOKE)\s+(.+?)\s+ON\s+(?:TABLE\s+)?(?:public\.)?"?([a-z0-9_]+)"?\s+(?:TO|FROM)\s+(.+)$/i,
    );
    if (grantMatch) {
      const [, rawKind, rawPrivs, table, rawRoles] = grantMatch;
      const kind = rawKind.toUpperCase();
      const privs = rawPrivs
        .toUpperCase()
        .split(",")
        .map((p) => p.trim().replace(/\s*\(.*\)$/, ""))
        .flatMap((p) => (p === "ALL" || p.startsWith("ALL ") ? WRITE_WORDS : [p]));
      const roles = rawRoles
        .toLowerCase()
        .split(",")
        .map((r) => r.trim().replace(/^"|"$/g, ""));
      applyGrant(kind, privs, table, roles, file);
      continue;
    }

    // --- RLS policies -------------------------------------------------------
    const dropMatch = stmt.match(
      /^DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?([^"\s]+)"?\s+ON\s+(?:public\.)?"?([a-z0-9_]+)"?/i,
    );
    if (dropMatch) {
      policyIssues.delete(`${dropMatch[2]}:${dropMatch[1]}`);
      continue;
    }

    const policyMatch = stmt.match(
      /^CREATE\s+(?:OR\s+REPLACE\s+)?POLICY\s+"?([^"\s]+)"?\s+ON\s+(?:public\.)?"?([a-z0-9_]+)"?([\s\S]*)$/i,
    );
    if (policyMatch) {
      const [, name, table, rest] = policyMatch;
      const restUpper = rest.toUpperCase();
      const forMatch = restUpper.match(/\bFOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\b/);
      const command = forMatch ? forMatch[1] : "ALL";
      const isWrite = command === "ALL" || WRITE_WORDS.includes(command);
      const toMatch = rest.match(/\bTO\s+([a-z_,\s"]+?)\s+(?:USING|WITH\s+CHECK)\b/i);
      const roles = toMatch
        ? toMatch[1]
            .toLowerCase()
            .split(",")
            .map((r) => r.trim().replace(/^"|"$/g, ""))
        : ["public"];
      const clientRoles = roles.filter((r) => CLIENT_ROLES.includes(r));
      const id = `${table}:${name}`;
      policyIssues.delete(id);

      if (isWrite && clientRoles.length > 0) {
        if (LOCKED_TABLES.includes(table)) {
          policyIssues.set(
            id,
            `${file}: policy "${name}" grants ${command} on public.${table} to ${clientRoles.join(", ")} — this table must stay service-role-write-only.`,
          );
        }
        const allowed = RESTRICTED_WRITE_TABLES[table];
        if (allowed && clientRoles.some((r) => !allowed.includes(r))) {
          policyIssues.set(
            id,
            `${file}: policy "${name}" grants ${command} on public.${table} to ${clientRoles.join(", ")}; only ${allowed.join(", ")} may write.`,
          );
        }
      }
    }

  }
}

violations.push(...policyIssues.values());

// --- Final effective grant state ------------------------------------------

for (const table of LOCKED_TABLES) {
  for (const role of ["anon", "authenticated"]) {
    const privs = grantState.get(key(table, role));
    const bad = [...(privs ?? [])].filter((p) => WRITE_WORDS.includes(p));
    if (bad.length > 0) {
      violations.push(
        `public.${table}: role "${role}" still holds ${bad.sort().join(", ")} — revoke it; writes belong to service-role server code only.`,
      );
    }
  }
  const serviceRole = grantState.get(key(table, "service_role"));
  if (!serviceRole || serviceRole.size === 0) {
    violations.push(
      `public.${table}: service_role has no grants — server-side writes (telemetry/queue/cron) would break.`,
    );
  }
}

if (violations.length > 0) {
  console.error("Security invariants FAILED:\n");
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error(
    `\n${violations.length} violation(s). These guard previously fixed findings — do not weaken them without a security review.`,
  );
  process.exit(1);
}

console.log(
  `Security invariants OK — ${LOCKED_TABLES.length} locked tables + ${Object.keys(RESTRICTED_WRITE_TABLES).length} restricted-write table verified across ${readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).length} migrations.`,
);
