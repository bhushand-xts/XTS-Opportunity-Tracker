// Where each domain service lives. The gateway composes these.

export interface ServiceEntry {
  name: string;
  url: string;
}

const availableServices: ServiceEntry[] = [
  { name: 'user',        url: process.env.USER_URL        || 'http://localhost:4001/graphql' },
  { name: 'opportunity', url: process.env.OPPORTUNITY_URL || 'http://localhost:4003/graphql' },
  { name: 'admin',       url: process.env.ADMIN_URL       || 'http://localhost:4010/graphql' },
];

// The user service answers "whose login token is this?" for every request,
// whether or not it is one of the composed subgraphs.
const userServiceUrl = availableServices.find((service) => service.name === 'user')!.url;

// Local development can run a subset while other domain databases are not configured.
const enabledServiceNames = new Set(
  (process.env.ENABLED_SUBGRAPHS || 'user,admin')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
);

const services = availableServices.filter((service) => enabledServiceNames.has(service.name));

export { userServiceUrl };
export default services;
