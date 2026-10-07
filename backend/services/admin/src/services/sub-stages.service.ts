import * as repository from "../repositories/sub-stages.repository";
import * as validator from "../validators/sub-stages.validator";
import { conflict, notFound } from "../../../../shared/errors/graphqlErrors";
import type { SubStageInput } from "../repositories/sub-stages.repository";

async function list() {
  return repository.findAll();
}

async function get(id: number) {
  const subStage = await repository.findById(id);
  if (!subStage) throw notFound("Sub stage not found");
  return subStage;
}

async function inUse(id: number) {
  return repository.isInUse(id);
}

async function history(subStageId: number) {
  return repository.findHistory(subStageId);
}

async function create(input: SubStageInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicateName = await repository.findByName(input.stageId, input.subStageName.trim());
  if (duplicateName) throw conflict("A sub stage with this name already exists under this stage");

  const userId = ctx?.user?.id ?? input.createdBy;
  if (!userId) throw conflict("Created By user is required");

  return repository.create(input, userId);
}

async function update(id: number, input: Partial<SubStageInput>, ctx: any) {
  const current = await repository.findById(id);
  if (!current) throw notFound("Sub stage not found");

  if (await repository.isInUse(id)) {
    throw conflict("This sub stage is in use by one or more opportunities and cannot be edited");
  }

  validator.assertValidUpdate(input);

  const stageId = input.stageId ?? current.stageId;
  if (input.subStageName) {
    const duplicateName = await repository.findByName(stageId, input.subStageName, id);
    if (duplicateName) throw conflict("A sub stage with this name already exists under this stage");
  }

  const userId = ctx?.user?.id ?? input.updatedBy ?? null;
  return repository.update(id, input, userId);
}

export { list, get, inUse, history, create, update };
