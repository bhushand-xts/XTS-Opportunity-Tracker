import * as repository from "../repositories/currency.repository";
import * as validator from "../validators/currency.validator";
import { conflict, notFound } from "../../../../shared/errors/graphqlErrors";
import type { CurrencyInput } from "../repositories/currency.repository";

async function list() {
  return repository.findAll();
}

async function get(id: number) {
  const currency = await repository.findById(id);

  if (!currency) {
    throw notFound("Currency not found");
  }

  return currency;
}

async function create(input: CurrencyInput, ctx: any) {
  validator.assertValidCreate(input);
 
  const duplicateCode = await repository.findByCode(input.currencyCode.trim());
  const duplicateName = await repository.findByName(input.currencyName.trim());
 
  if (duplicateName) {
    throw conflict("Currency Name already exists");
  }
 
  if (duplicateCode) {
    throw conflict("Currency Code already exists");
  }
 
  const userId = ctx?.user?.id ?? input.createdBy;
 
  if (!userId) {
    throw conflict("Created By user is required");
  }
 
  return repository.create(input, userId);
}
 
async function update(
  currencyId: number,
  input: Partial<CurrencyInput>,
  ctx: any
) {
  const current = await repository.findById(currencyId);
 
  if (!current) {
    throw notFound("Currency not found");
  }
 
  validator.assertValidUpdate(input);
 
  const incomingName = input.currencyName?.trim();
  const currentName = current.currencyName.trim();
 
  if (incomingName && incomingName.toLowerCase() !== currentName.toLowerCase()) {
    const duplicateName = await repository.findByName(
      incomingName,
      currencyId
    );
 
    if (duplicateName) {
      throw conflict("Currency Name already exists");
    }
  }
 
  const incomingCode = input.currencyCode?.trim().toUpperCase();
  const currentCode = current.currencyCode.trim().toUpperCase();
 
  if (incomingCode && incomingCode !== currentCode) {
    const duplicateCode = await repository.findByCode(
      incomingCode,
      currencyId
    );
 
    if (duplicateCode) {
      throw conflict("Currency Code already exists");
    }
  }
 
  const userId = ctx?.user?.id ?? input.updatedBy ?? null;
 
  return repository.update(currencyId, input, userId);
}

async function toggleStatus(
  id: number,
  isActive: boolean,
  ctx: any,
  updatedBy?: number | null
) {
  const current = await repository.findById(id);

  if (!current) {
    throw notFound("Currency not found");
  }

  const userId = ctx?.user?.id ?? updatedBy ?? null;

  return repository.update(id, { isActive }, userId);
}

async function remove(
  id: number
) {
  const current = await repository.findById(id);

  if (!current) {
    throw notFound("Currency not found");
  }

  const used = await repository.isUsed(id);

  if (used) {
    throw conflict("This currency is already used and cannot be deleted");
  }

  await repository.remove(id);

  return true;
}

export {
  list,
  get,
  create,
  update,
  toggleStatus,
  remove
};