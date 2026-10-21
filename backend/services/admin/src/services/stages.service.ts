import * as repository from "../repositories/stages.repository";
import * as validator from "../validators/stages.validator";
import { conflict, notFound } from "../../../../shared/errors/graphqlErrors";
import type { StageInput } from "../repositories/stages.repository";

async function list() {
  return repository.findAll();
}

async function get(id: number) {
  const stage = await repository.findById(id);
  if (!stage) throw notFound("Stage not found");
  return stage;
}

async function inUse(id: number) {
  return repository.isInUse(id);
}

async function history(stageId: number) {
  return repository.findHistory(stageId);
}

async function create(input: StageInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicateName = await repository.findByName(input.stageName.trim());
  if (duplicateName) throw conflict("A stage with this name already exists");

  const duplicateOrder = await repository.findByDisplayOrder(input.displayOrder);
  if (duplicateOrder) throw conflict("A stage with this sequence already exists");

  const userId = ctx?.user?.id ?? input.createdBy;
  if (!userId) throw conflict("Created By user is required");

  return repository.create(input, userId);
}

async function update(id: number, input: Partial<StageInput>, ctx: any) {
  const current = await repository.findById(id);
  if (!current) throw notFound("Stage not found");

  // A stage in active use by an opportunity can't be changed out from under it.
  if (await repository.isInUse(id)) {
    throw conflict("This stage is in use by one or more opportunities and cannot be edited");
  }

  validator.assertValidUpdate(input);

  if (input.stageName) {
    const duplicateName = await repository.findByName(input.stageName, id);
    if (duplicateName) throw conflict("A stage with this name already exists");
  }

  if (input.displayOrder != null) {
    const duplicateOrder = await repository.findByDisplayOrder(input.displayOrder, id);
    if (duplicateOrder) throw conflict("A stage with this sequence already exists");
  }

  const userId = ctx?.user?.id ?? input.updatedBy ?? null;
  return repository.update(id, input, userId);
}

export { list, get, inUse, history, create, update };
