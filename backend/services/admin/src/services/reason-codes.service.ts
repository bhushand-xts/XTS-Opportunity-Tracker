import * as repository from '../repositories/reason-codes.repository';
import * as validator from '../validators/reason-codes.validator';
import { conflict, notFound } from '../../../../shared/errors/graphqlErrors';
import type { ReasonCodeInput } from '../repositories/reason-codes.repository';

// Business rules and use-case logic for reason codes.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

async function history(reasonCodeId: number) {
  return repository.findHistory(reasonCodeId);
}

async function get(id: number) {
  const reasonCode = await repository.findById(id);
  if (!reasonCode) throw notFound('Reason code not found');
  return reasonCode;
}

async function create(input: ReasonCodeInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicateName = await repository.findByName(input.reasonName);
  if (duplicateName) throw conflict('A reason code with this name already exists');

  if (input.displayOrder != null) {
    const duplicateOrder = await repository.findByDisplayOrder(input.displayOrder);
    if (duplicateOrder) throw conflict('A reason code with this display order already exists');
  }

  const userId = ctx?.user?.id ?? input.createdBy ?? null;
  return repository.create(input, userId);
}

async function update(id: number, input: Partial<ReasonCodeInput>, ctx: any) {
  const current = await repository.findById(id);
  if (!current) throw notFound('Reason code not found');

  validator.assertValidUpdate(input);

  if (input.reasonName) {
    const duplicateName = await repository.findByName(input.reasonName, id);
    if (duplicateName) throw conflict('A reason code with this name already exists');
  }

  if (input.displayOrder != null) {
    const duplicateOrder = await repository.findByDisplayOrder(input.displayOrder, id);
    if (duplicateOrder) throw conflict('A reason code with this display order already exists');
  }

  const userId = ctx?.user?.id ?? input.updatedBy ?? null;
  return repository.update(id, input, userId);
}

async function remove(id: number, userId: number | null = null) {
  const current = await repository.findById(id);
  if (!current) throw notFound('Reason code not found');

  await repository.remove(id, userId);
  return true;
}

export { list, get, history, create, update, remove };
