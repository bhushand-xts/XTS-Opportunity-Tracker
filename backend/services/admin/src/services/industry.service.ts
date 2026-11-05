import * as repository from "../repositories/industry.repository";
import * as validator from "../validators/industry.validator";
import { conflict, notFound } from "../../../../shared/errors/graphqlErrors";
import type { IndustryInput } from "../repositories/industry.repository";

async function list() {
  return repository.findAll();
}

async function get(id: number) {
  const industry = await repository.findById(id);

  if (!industry) {
    throw notFound("Industry not found");
  }

  return industry;
}

async function create(input: IndustryInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicateName = await repository.findByName(input.industryName.trim());

  if (duplicateName) {
    throw conflict("An Industry with this name already exists.");
  }

  const userId = ctx?.user?.id ?? input.createdBy;

  if (!userId) {
    throw conflict("Created By user is required");
  }

  return repository.create(input, userId);
}

async function update(industryId: number, input: Partial<IndustryInput>, ctx: any) {
  const current = await repository.findById(industryId);

  if (!current) {
    throw notFound("Industry not found");
  }

  validator.assertValidUpdate(input);

  const incomingName = input.industryName?.trim();
  const currentName = current.industryName.trim();

  if (incomingName && incomingName.toLowerCase() !== currentName.toLowerCase()) {
    const duplicateName = await repository.findByName(incomingName, industryId);

    if (duplicateName) {
      throw conflict("An Industry with this name already exists.");
    }
  }

  const userId = ctx?.user?.id ?? input.updatedBy ?? null;

  return repository.update(industryId, input, userId);
}

async function toggleStatus(id: number, isActive: boolean, ctx: any, updatedBy?: number | null) {
  const current = await repository.findById(id);

  if (!current) {
    throw notFound("Industry not found");
  }

  const userId = ctx?.user?.id ?? updatedBy ?? null;

  return repository.update(id, { isActive }, userId);
}

export { list, get, create, update, toggleStatus };
