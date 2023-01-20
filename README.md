# fastify-graphql-voyager

## Usage

```ts
import FastifyGraphQLVoyager from 'fastify-graphql-voyager';

fastify.register(FastifyGraphQLVoyager, {
  path: '/voyager', // default
  graphql: {
    // schema or url to introspection
  },
  voyager: {
    // see https://github.com/IvanGoncharov/graphql-voyager#properties
  },
});
```

## LICENSE

MIT
