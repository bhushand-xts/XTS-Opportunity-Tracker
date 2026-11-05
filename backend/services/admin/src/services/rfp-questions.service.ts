import * as repository from '../repositories/rfp-questions.repository';
import * as validator from '../validators/rfp-questions.validator';
import { conflict, notFound } from '../../../../shared/errors/graphqlErrors';
import type { RfpQuestionInput } from '../repositories/rfp-questions.repository';

// Business rules and use-case logic for RFP questions.

async function list(args: Record<string, any>, ctx: unknown) {
  return repository.findAll();
}

async function history(questionId: number) {
  return repository.findHistory(questionId);
}

async function get(id: number) {
  const question = await repository.findById(id);
  if (!question) throw notFound('RFP question not found');
  return question;
}

async function create(input: RfpQuestionInput, ctx: any) {
  validator.assertValidCreate(input);

  const duplicateQuestion = await repository.findByQuestion(input.question);
  if (duplicateQuestion) throw conflict('This RFP question already exists');

  if (input.displayOrder != null) {
    const duplicateOrder = await repository.findByDisplayOrder(input.displayOrder);
    if (duplicateOrder) throw conflict('An RFP question with this display order already exists');
  }

  const userId = ctx?.user?.id ?? input.createdBy ?? null;
  return repository.create(input, userId);
}

async function update(id: number, input: Partial<RfpQuestionInput>, ctx: any) {
  const current = await repository.findById(id);
  if (!current) throw notFound('RFP question not found');

  validator.assertValidUpdate(input);

  if (input.question) {
    const duplicateQuestion = await repository.findByQuestion(input.question, id);
    if (duplicateQuestion) throw conflict('This RFP question already exists');
  }

  if (input.displayOrder != null) {
    const duplicateOrder = await repository.findByDisplayOrder(input.displayOrder, id);
    if (duplicateOrder) throw conflict('An RFP question with this display order already exists');
  }

  const userId = ctx?.user?.id ?? input.updatedBy ?? null;
  return repository.update(id, input, userId);
}

export { list, get, history, create, update };
