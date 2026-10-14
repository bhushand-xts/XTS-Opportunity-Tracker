import * as service from '../../services/client.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    clientsList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
    client: (_: unknown, args: { id: number }) => service.get(args.id),
    clientHistory: (_: unknown, args: { clientId: number }) => service.history(args.clientId),
  },
  Mutation: {
    createClient: (_: unknown, args: { input: any }, ctx: unknown) => service.create(args.input, ctx),
    updateClient: (_: unknown, args: { id: number; input: any }, ctx: unknown) => service.update(args.id, args.input, ctx),
    deleteClient: (_: unknown, args: { id: number; updatedBy?: number }, ctx: any) =>
      service.remove(args.id, ctx?.user?.id ?? args.updatedBy ?? null),
  },
  Client: {
    contacts: (parent: { id: number }) => service.contactsFor(parent.id),
  },
};
