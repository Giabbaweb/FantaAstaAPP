import type {
  CreateOwnerInput,
  Owner,
  UpdateOwnerInput
} from "@fantaastaapp/contracts";

import type {
  OwnerRepository
} from "../repositories/owner.repository.js";

export type OwnerServiceErrorCode =
  | "OWNER_NOT_FOUND"
  | "OWNER_UPDATE_FAILED"
  | "OWNER_DELETE_FAILED";

export class OwnerServiceError extends Error {
  readonly code: OwnerServiceErrorCode;

  constructor(
    code: OwnerServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "OwnerServiceError";
    this.code = code;
  }
}

export class OwnerService {
  constructor(
    private readonly repository: OwnerRepository
  ) {}

  async listOwners(): Promise<Owner[]> {
    return this.repository.findAll();
  }

  async getOwnerById(id: string): Promise<Owner> {
    return this.requireOwner(id);
  }

  async createOwner(
    input: CreateOwnerInput
  ): Promise<Owner> {
    return this.repository.create(input);
  }

  async updateOwner(
    id: string,
    input: UpdateOwnerInput
  ): Promise<Owner> {
    await this.requireOwner(id);

    const updatedOwner = await this.repository.update(
      id,
      input
    );

    if (!updatedOwner) {
      throw new OwnerServiceError(
        "OWNER_UPDATE_FAILED",
        `Failed to update owner "${id}"`
      );
    }

    return updatedOwner;
  }

  async deleteOwner(id: string): Promise<void> {
    await this.requireOwner(id);

    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new OwnerServiceError(
        "OWNER_DELETE_FAILED",
        `Failed to delete owner "${id}"`
      );
    }
  }

  private async requireOwner(
    id: string
  ): Promise<Owner> {
    const owner = await this.repository.findById(id);

    if (!owner) {
      throw new OwnerServiceError(
        "OWNER_NOT_FOUND",
        `Owner "${id}" was not found`
      );
    }

    return owner;
  }
}
