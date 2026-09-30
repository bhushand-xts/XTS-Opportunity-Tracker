import {
  RateMasterRepository,
  RateMasterRecord
} from "../repositories/rate-master.repository";

import {
  CreateRateMasterInput,
  UpdateRateMasterInput,
  validateCreateRateMaster,
  validateUpdateRateMaster
} from "../validators/rate-master.validator";


export class RateMasterService {

  constructor(
    private readonly repository: RateMasterRepository
  ) {}


  // --------------------------------------------------
  // GET ALL
  // --------------------------------------------------

  async getRateMasters(): Promise<RateMasterRecord[]> {

    return this.repository.findAll();
  }


  // --------------------------------------------------
  // GET BY ID
  // --------------------------------------------------

  async getRateMaster(
    ratemasterId: number
  ): Promise<RateMasterRecord | null> {

    return this.repository.findById(
      ratemasterId
    );
  }


  // --------------------------------------------------
  // CREATE
  // --------------------------------------------------

  async createRateMaster(
    input: CreateRateMasterInput
  ): Promise<RateMasterRecord> {

    validateCreateRateMaster(input);

    const duplicate =
      await this.repository.findDuplicate(
        input.roleName.trim(),
        input.roleCode.trim()
      );

    if (duplicate) {

      throw new Error(
        "This technical role configuration already exists."
      );
    }

    return this.repository.create(input);
  }


  // --------------------------------------------------
  // UPDATE
  // --------------------------------------------------

  async updateRateMaster(
    ratemasterId: number,
    input: UpdateRateMasterInput
  ): Promise<RateMasterRecord> {

    validateUpdateRateMaster(input);

    const existing =
      await this.repository.findById(
        ratemasterId
      );

    if (!existing) {

      throw new Error(
        "Rate master not found."
      );
    }

    const duplicate =
      await this.repository.findDuplicate(
        input.roleName.trim(),
        input.roleCode.trim(),
        ratemasterId
      );

    if (duplicate) {

      throw new Error(
        "This technical role configuration already exists."
      );
    }

    return this.repository.update(
      ratemasterId,
      input
    );
  }


  // --------------------------------------------------
  // STATUS
  // --------------------------------------------------

  async toggleRateMasterStatus(
    ratemasterId: number,
    isActive: boolean,
    updatedBy: number
  ): Promise<RateMasterRecord> {

    const existing =
      await this.repository.findById(
        ratemasterId
      );

    if (!existing) {

      throw new Error(
        "Rate master not found."
      );
    }

    if (!updatedBy) {

      throw new Error(
        "You must be signed in to make changes."
      );
    }

    return this.repository.updateStatus(
      ratemasterId,
      isActive,
      updatedBy
    );
  }
}