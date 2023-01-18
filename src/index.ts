import { type FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { type GraphQLSchema, introspectionFromSchema } from 'graphql';

export type VoyagerDisplayOptions = {
  rootType?: string;
  skipRelay?: boolean;
  skipDeprecated?: boolean;
  showLeafFields?: boolean;
  sortByAlphabet?: boolean;
  hideRoot?: boolean;
};

export type VoyagerOptions = {
  displayOptions?: VoyagerDisplayOptions,
  hideDocs?: boolean,
  hideSettings?: boolean,
};

type InlineIntrospectionOptions = {
  schema: GraphQLSchema,
};

type RemoteIntrospectionOptions = {
  url: string,
  headers?: HeadersInit,
  credentials?: 'same-origin' | 'include' | 'omit',
};

export type FastifyGraphQLVoyagerOptions = {
  /**
   * Path to expose GraphQL Voyager
   *
   * @default "/voyager"
   */
  path?: string,

  /**
   * GraphQL Options
   *
   * @default { url: "/graphql" }
   */
  graphql?: (
    | InlineIntrospectionOptions
    | RemoteIntrospectionOptions
  ),

  /**
   * GraphQL Voyager initialization options
   *
   * @see https://github.com/IvanGoncharov/graphql-voyager#properties
   */
  voyager?: VoyagerOptions,
};

const fastifyGraphQLVoyagerPlugin: FastifyPluginCallback<FastifyGraphQLVoyagerOptions> = (
  fastify,
  {
    path = '/voyager',
    graphql: graphqlOptions = { url: '/graphql' },
    voyager: voyagerOptions = {},
  },
  done,
) => {
  const js = String.raw;
  const html = String.raw;

  function generateScriptWithInlineIntrospection({ schema }: InlineIntrospectionOptions) {
    const introspection = introspectionFromSchema(schema, {
      descriptions: true,
      schemaDescription: true,
      directiveIsRepeatable: true,
      inputValueDeprecation: true,
      specifiedByUrl: true,
    });
    return js`
      GraphQLVoyager.init(document.getElementById('voyager'), {
        ...${JSON.stringify(voyagerOptions)},
        introspection: ${JSON.stringify({ data: introspection })},
      });
    `;
  }

  function generateScriptWithRemoteIntrospection({ url, headers, credentials }: RemoteIntrospectionOptions) {
    let headersObj = {};
    if (Array.isArray(headers) || headers instanceof Headers) {
      for (const [key, val] of headers) {
        headersObj[key] = val;
      }
    } else {
      headersObj = headers;
    }

    return js`
      async function introspectionProvider(query) {
        const response = await fetch(${JSON.stringify(url)}, {
          method: 'POST',
          ${credentials ? `credentials: ${JSON.stringify(credentials)},`: '\n'}
          headers: {
            'Content-Type': 'application/json',
            ...${JSON.stringify(headersObj)}
          },
          body: JSON.stringify({ query }),
        });
      }

      GraphQLVoyager.init(document.getElementById('voyager'), {
        ...${JSON.stringify(voyagerOptions)},
        introspection: introspectionProvider, 
      });
    `;
  }

  function renderYoyager() {
    return html`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" >
          <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0">
          <title>GraphQL Voyager</title>
          <style>
            body {
              margin: 0;
              height: 100vh;
              overflow: hidden;
            }

            #voyager {
              height: 100%;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.css"
          />
          <script src="https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.min.js"></script>
        </head>
        <body>
          <div id="voyager">Loading...</div>
          <script>
            ${'schema' in graphqlOptions
              ? generateScriptWithInlineIntrospection(graphqlOptions as InlineIntrospectionOptions)
              : generateScriptWithRemoteIntrospection(graphqlOptions)
            }
          </script>
        </body>
      </html>
    `;
  }

  fastify.get(path, (_req, reply) => {
    reply.type('text/html');
    reply.send(renderYoyager());
  });

  done();
};

export default fp(fastifyGraphQLVoyagerPlugin, {
  fastify: '4.x',
  name: 'fastify-graphql-voyager',
});
