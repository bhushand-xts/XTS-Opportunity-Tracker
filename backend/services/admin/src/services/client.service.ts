import * as repository from '../repositories/client.repository';
import * as validator from '../validators/client.validator';
import { conflict, notFound } from '../../../../shared/errors/graphqlErrors';
import type { ClientInput } from '../repositories/client.repository';

// Business rules and use-case logic for clients.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

async function history(clientId: number) {
  return repository.findHistory(clientId);
}

async function get(id: number) {
  const client = await repository.findById(id);
  if (!client) throw notFound('Client not found');
  return client;
}

async function contactsFor(clientId: number) {
  return repository.findContactsByClient(clientId);
}

async function create(input: ClientInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicate = await repository.findByName(input.clientName);
  if (duplicate) throw conflict('A client with this name already exists');

  const userId = ctx?.user?.id ?? input.createdBy ?? null;
  return repository.create(input, userId);
}

async function update(id: number, input: Partial<ClientInput>, ctx: any) {
  const current = await repository.findById(id);
  if (!current) throw notFound('Client not found');

  validator.assertValidUpdate(input);

  if (input.clientName) {
    const duplicate = await repository.findByName(input.clientName, id);
    if (duplicate) throw conflict('A client with this name already exists');
  }

  const userId = ctx?.user?.id ?? input.updatedBy ?? null;
  return repository.update(id, input, userId);
}

async function remove(id: number, userId: number | null = null) {
  const current = await repository.findById(id);
  if (!current) throw notFound('Client not found');

  await repository.remove(id, userId);
  return true;
}

export { list, get, history, contactsFor, create, update, remove };
