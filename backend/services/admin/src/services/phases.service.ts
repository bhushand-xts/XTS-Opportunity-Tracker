import * as repository from '../repositories/phases.repository';
import * as validator from '../validators/phases.validator';
import { conflict, notFound } from '../../../../shared/errors/graphqlErrors';
import type { PhaseInput } from '../repositories/phases.repository';

// Business rules and use-case logic for estimation phases.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

async function history(phaseId: number) {
  return repository.findHistory(phaseId);
}

async function get(id: number) {
  const phase = await repository.findById(id);
  if (!phase) throw notFound('Estimate phase not found');
  return phase;
}

async function create(input: PhaseInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicateName = await repository.findByName(input.phaseName);
  if (duplicateName) throw conflict('An estimate phase with this name already exists');

  if (input.phaseCode) {
    const duplicateCode = await repository.findByCode(input.phaseCode);
    if (duplicateCode) throw conflict('An estimate phase with this code already exists');
  }

  if (input.displayOrder != null) {
    const duplicateOrder = await repository.findByDisplayOrder(input.displayOrder);
    if (duplicateOrder) throw conflict('An estimate phase with this display order already exists');
  }

  const userId = ctx?.user?.id ?? input.createdBy ?? null;
  return repository.create(input, userId);
}

async function update(id: number, input: Partial<PhaseInput>, ctx: any) {
  const current = await repository.findById(id);
  if (!current) throw notFound('Estimate phase not found');

  validator.assertValidUpdate(input);

  if (input.phaseName) {
    const duplicateName = await repository.findByName(input.phaseName, id);
    if (duplicateName) throw conflict('An estimate phase with this name already exists');
  }

  if (input.phaseCode) {
    const duplicateCode = await repository.findByCode(input.phaseCode, id);
    if (duplicateCode) throw conflict('An estimate phase with this code already exists');
  }

  if (input.displayOrder != null) {
    const duplicateOrder = await repository.findByDisplayOrder(input.displayOrder, id);
    if (duplicateOrder) throw conflict('An estimate phase with this display order already exists');
  }

  const userId = ctx?.user?.id ?? input.updatedBy ?? null;
  return repository.update(id, input, userId);
}

async function remove(id: number, userId: number | null = null) {
  const current = await repository.findById(id);
  if (!current) throw notFound('Estimate phase not found');

  await repository.remove(id, userId);
  return true;
}

export { list, get, history, create, update, remove };
