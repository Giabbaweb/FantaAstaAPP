import { randomUUID } from "node:crypto";

import type {
  CreateOwnerInput,
  Owner,
  UpdateOwnerInput
} from "@fantaastaapp/contracts";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { owners } from "../db/schema/index.js";

export interface OwnerRepository {
  findAll(): Promise<Owner[]>;

  findById(id: string): Promise<Owner | null>;

  create(input: CreateOwnerInput): Promise<Owner>;

  update(
    id: string,
    input: UpdateOwnerInput
  ): Promise<Owner | null>;

  delete(id: string): Promise<boolean>;
}

export class SqliteOwnerRepository
  implements OwnerRepository
{
  async findAll(): Promise<Owner[]> {
    return db
      .select()
      .from(owners)
      .orderBy(
        asc(owners.name),
        asc(owners.id)
      );
  }

  async findById(id: string): Promise<Owner | null> {
    const [owner] = await db
      .select()
      .from(owners)
      .where(eq(owners.id, id))
      .limit(1);

    return owner ?? null;
  }

  async create(
    input: CreateOwnerInput
  ): Promise<Owner> {
    const [owner] = await db
      .insert(owners)
      .values({
        id: randomUUID(),
        name: input.name
      })
      .returning();

    if (!owner) {
      throw new Error("Failed to create owner");
    }

    return owner;
  }

  async update(
    id: string,
    input: UpdateOwnerInput
  ): Promise<Owner | null> {
    const [owner] = await db
      .update(owners)
      .set({
        ...input,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(owners.id, id))
      .returning();

    return owner ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedOwners = await db
      .delete(owners)
      .where(eq(owners.id, id))
      .returning({
        id: owners.id
      });

    return deletedOwners.length > 0;
  }
}
