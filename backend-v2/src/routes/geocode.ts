import type { FastifyInstance } from 'fastify';
import { resolveAddress, suggestAddresses } from '../services/geocodeService';
import { GeocodeResolveQuery, GeocodeSuggestQuery } from '../schemas';

export default async function geocodeRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q: string } }>(
    '/geocode/suggest',
    { schema: { querystring: GeocodeSuggestQuery } },
    async (request) => {
      return suggestAddresses(request.query.q, 5);
    },
  );

  app.get<{ Querystring: { address: string } }>(
    '/geocode/resolve',
    { schema: { querystring: GeocodeResolveQuery } },
    async (request, reply) => {
      const suggestion = await resolveAddress(request.query.address);
      if (!suggestion) {
        return reply.code(404).send({ error: 'Address not found' });
      }
      return suggestion;
    },
  );
}