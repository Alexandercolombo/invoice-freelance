/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as clients from "../clients.js";
import type * as config from "../config.js";
import type * as fixIds from "../fixIds.js";
import type * as invoices from "../invoices.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migrateUserIds from "../migrateUserIds.js";
import type * as migrations_add_invoiced_field from "../migrations/add_invoiced_field.js";
import type * as migrations_fix_user_ids from "../migrations/fix_user_ids.js";
import type * as migrations_fix_user_schema from "../migrations/fix_user_schema.js";
import type * as migrations_migrate_tasks from "../migrations/migrate_tasks.js";
import type * as migrations_run_migrations from "../migrations/run_migrations.js";
import type * as migrations_update_tasks from "../migrations/update_tasks.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  clients: typeof clients;
  config: typeof config;
  fixIds: typeof fixIds;
  invoices: typeof invoices;
  "lib/validators": typeof lib_validators;
  migrateUserIds: typeof migrateUserIds;
  "migrations/add_invoiced_field": typeof migrations_add_invoiced_field;
  "migrations/fix_user_ids": typeof migrations_fix_user_ids;
  "migrations/fix_user_schema": typeof migrations_fix_user_schema;
  "migrations/migrate_tasks": typeof migrations_migrate_tasks;
  "migrations/run_migrations": typeof migrations_run_migrations;
  "migrations/update_tasks": typeof migrations_update_tasks;
  tasks: typeof tasks;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
