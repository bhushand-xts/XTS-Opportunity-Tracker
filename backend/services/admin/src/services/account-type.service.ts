import * as repository from "../repositories/account-type.repository";
import * as validator from "../validators/account-type.validator";
import { conflict, notFound } from "../../../../shared/errors/graphqlErrors";
import type { AccountTypeInput } from "../repositories/account-type.repository";

async function list() {
  return repository.findAll();
}

async function get(id: number) {
  const accountType = await repository.findById(id);

  if (!accountType) {
    throw notFound("Account type not found");
  }

  return accountType;
}

async function create(input: AccountTypeInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicateName = await repository.findByName(input.accountName.trim());

  if (duplicateName) {
    throw conflict("Account Name already exists");
  }

  const userId = ctx?.user?.id ?? input.createdBy;

  if (!userId) {
    throw conflict("Created By user is required");
  }

  return repository.create(input, userId);
}

async function update(accountTypeId: number, input: Partial<AccountTypeInput>, ctx: any) {
  const current = await repository.findById(accountTypeId);

  if (!current) {
    throw notFound("Account type not found");
  }

  validator.assertValidUpdate(input);

  const incomingName = input.accountName?.trim();
  const currentName = current.accountName.trim();

  if (incomingName && incomingName.toLowerCase() !== currentName.toLowerCase()) {
    const duplicateName = await repository.findByName(incomingName, accountTypeId);

    if (duplicateName) {
      throw conflict("Account Name already exists");
    }
  }

  const userId = ctx?.user?.id ?? input.updatedBy ?? null;

  return repository.update(accountTypeId, input, userId);
}

async function toggleStatus(id: number, isActive: boolean, ctx: any, updatedBy?: number | null) {
  const current = await repository.findById(id);

  if (!current) {
    throw notFound("Account type not found");
  }

  const userId = ctx?.user?.id ?? updatedBy ?? null;

  return repository.update(id, { isActive }, userId);
}

export { list, get, create, update, toggleStatus };
