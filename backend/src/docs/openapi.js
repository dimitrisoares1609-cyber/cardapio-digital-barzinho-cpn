// Documentação OpenAPI 3 da API do Cardápio Digital (servida pelo Swagger UI em /api/docs)

const error = (code, message, details) => ({
  error: { code, message, ...(details ? { details } : {}) },
});

const errorResponse = (description, example) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example } },
});

const responses = {
  ValidationError: errorResponse(
    'Dados inválidos (falha de validação)',
    error('VALIDATION_ERROR', 'Dados inválidos', [{ field: 'name', message: 'O nome deve ter pelo menos 2 caracteres' }]),
  ),
  Unauthorized: errorResponse('Token ausente, inválido ou expirado', error('TOKEN_INVALID', 'Sessão expirada ou token inválido. Faça login novamente.')),
  NotFound: errorResponse('Recurso não encontrado', error('NOT_FOUND', 'Item não encontrado')),
  Conflict: errorResponse('Conflito com o estado atual do recurso', error('CONFLICT', 'O pedido já está com o status "Pronto"')),
  Unprocessable: errorResponse('Regra de negócio violada', error('UNPROCESSABLE', 'Escolha uma opção em "Tamanho" para Corona')),
  TooManyRequests: errorResponse('Limite de requisições excedido', error('TOO_MANY_REQUESTS', 'Muitas tentativas de login. Tente novamente em alguns minutos.')),
  ServerError: errorResponse('Erro interno', error('INTERNAL_ERROR', 'Erro interno no servidor')),
};

const idParam = (description) => ({
  name: 'id',
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 },
  example: 1,
});

const exampleItem = {
  id: 1,
  categoryId: 1,
  categoryName: 'Cervejas',
  name: 'Corona',
  shortDescription: 'Disponível em garrafa 600 ml, lata ou long neck.',
  description: 'Cerveja Corona bem gelada. Escolha o tamanho na hora de pedir.',
  ingredients: null,
  price: 9,
  imageUrl: '/seed-images/cerveja.svg',
  options: [
    {
      id: 'tamanho',
      name: 'Tamanho',
      type: 'single',
      required: true,
      choices: [
        { id: 'g600', name: 'Garrafa 600 ml', priceDelta: 9 },
        { id: 'lata', name: 'Lata', priceDelta: 0 },
        { id: 'longNeck', name: 'Long neck', priceDelta: 2 },
      ],
    },
  ],
  available: true,
  sortOrder: 1,
  createdAt: '2026-11-17T22:10:00.000Z',
  updatedAt: '2026-11-17T22:10:00.000Z',
};

const exampleOrder = {
  id: 42,
  number: 42,
  trackingCode: '6f1c2a0e-8a43-4f0e-9a63-2a7a8f9f1b55',
  customerName: 'Mariana',
  tableNumber: '7',
  notes: 'Trazer os pratos juntos',
  status: 'em_preparo',
  statusLabel: 'Em preparo',
  total: 86,
  createdAt: '2026-11-17T22:15:03.000Z',
  updatedAt: '2026-11-17T22:17:40.000Z',
  items: [
    {
      id: 101,
      menuItemId: 1,
      name: 'Corona',
      unitPrice: 18,
      quantity: 2,
      options: [{ groupId: 'tamanho', group: 'Tamanho', choiceId: 'g600', choice: 'Garrafa 600 ml', priceDelta: 9 }],
      notes: null,
      subtotal: 36,
    },
    {
      id: 102,
      menuItemId: 28,
      name: 'Batata Completa',
      unitPrice: 50,
      quantity: 1,
      options: [],
      notes: 'Sem cheddar',
      subtotal: 50,
    },
  ],
  history: [
    { status: 'recebido', statusLabel: 'Recebido', changedAt: '2026-11-17T22:15:03.000Z', changedBy: null, changedByName: 'Cliente (Mariana)' },
    { status: 'em_preparo', statusLabel: 'Em preparo', changedAt: '2026-11-17T22:17:40.000Z', changedBy: 1, changedByName: 'Administrador' },
  ],
};

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Cardápio Digital — Barzinho CPN',
    version: '1.0.0',
    description: [
      'API REST do Cardápio Digital: consulta do cardápio, envio e acompanhamento de pedidos pelo cliente,',
      'e gestão do cardápio e dos pedidos pelo administrador.',
      '',
      '**Autenticação:** faça `POST /api/auth/login`, copie o `token` e clique em **Authorize** (Bearer).',
      '',
      '**Tempo real:** além do REST, o servidor publica eventos via Socket.IO no mesmo endereço:',
      '`order:created` (novo pedido, para o painel), `order:updated` (mudança de status, para o painel e para o cliente)',
      'e `menu:updated` (cardápio alterado). O cliente entra na sala do pedido emitindo `order:track` com o `trackingCode`.',
      '',
      '**Erros:** todas as respostas de erro seguem o formato `{ "error": { "code", "message", "details?" } }`.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Sistema', description: 'Saúde da API' },
    { name: 'Autenticação', description: 'Login do administrador (JWT)' },
    { name: 'Cardápio', description: 'Consulta pública do cardápio' },
    { name: 'Categorias', description: 'Categorias do cardápio' },
    { name: 'Itens', description: 'Itens do cardápio (cadastro, edição e remoção pelo administrador)' },
    { name: 'Upload', description: 'Envio de imagens dos itens' },
    { name: 'Pedidos', description: 'Envio, acompanhamento e gestão de pedidos' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token obtido em POST /api/auth/login' },
    },
    responses,
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                description: 'Código estável do erro',
                enum: [
                  'VALIDATION_ERROR',
                  'BAD_REQUEST',
                  'INVALID_JSON',
                  'UPLOAD_ERROR',
                  'UNAUTHORIZED',
                  'TOKEN_INVALID',
                  'INVALID_CREDENTIALS',
                  'NOT_FOUND',
                  'CONFLICT',
                  'UNPROCESSABLE',
                  'TOO_MANY_REQUESTS',
                  'INTERNAL_ERROR',
                ],
              },
              message: { type: 'string', description: 'Mensagem em português para exibir ao usuário' },
              details: {
                type: 'array',
                description: 'Campos inválidos (apenas em erros de validação)',
                items: {
                  type: 'object',
                  properties: { field: { type: 'string', example: 'price' }, message: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      Admin: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Administrador' },
          email: { type: 'string', format: 'email', example: 'admin@barzinhocpn.com.br' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Cervejas' },
          slug: { type: 'string', example: 'cervejas', description: 'Gerado a partir do nome' },
          sortOrder: { type: 'integer', example: 1, description: 'Ordem de exibição' },
          active: { type: 'boolean', example: true, description: 'Categorias inativas não aparecem para o cliente' },
          itemCount: { type: 'integer', example: 16, description: 'Quantidade de itens (somente na listagem)' },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 60, example: 'Petiscos' },
          sortOrder: { type: 'integer', minimum: 0, example: 8 },
          active: { type: 'boolean', default: true },
        },
      },
      OptionChoice: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', example: 'longNeck', description: 'Identificador da opção (único dentro do grupo)' },
          name: { type: 'string', example: 'Long neck' },
          priceDelta: { type: 'number', minimum: 0, example: 2, description: 'Valor somado ao preço base do item' },
        },
      },
      OptionGroup: {
        type: 'object',
        required: ['id', 'name', 'choices'],
        description: 'Grupo de opções do item (tamanho, sabor, adicionais...)',
        properties: {
          id: { type: 'string', example: 'tamanho' },
          name: { type: 'string', example: 'Tamanho' },
          type: { type: 'string', enum: ['single', 'multiple'], default: 'single', description: 'single = escolha uma; multiple = várias' },
          required: { type: 'boolean', default: false, description: 'Se o cliente é obrigado a escolher' },
          choices: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/OptionChoice' } },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          categoryId: { type: 'integer' },
          categoryName: { type: 'string' },
          name: { type: 'string' },
          shortDescription: { type: 'string', nullable: true, description: 'Texto curto exibido na lista do cardápio' },
          description: { type: 'string', nullable: true, description: 'Texto completo exibido nos detalhes' },
          ingredients: { type: 'string', nullable: true, description: 'Ingredientes separados por vírgula' },
          price: { type: 'number', description: 'Preço base em reais' },
          imageUrl: { type: 'string', nullable: true, description: 'URL absoluta ou caminho relativo à API' },
          options: { type: 'array', items: { $ref: '#/components/schemas/OptionGroup' } },
          available: { type: 'boolean', description: 'Itens indisponíveis não aparecem no cardápio do cliente' },
          sortOrder: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        example: exampleItem,
      },
      MenuItemInput: {
        type: 'object',
        required: ['categoryId', 'name', 'price'],
        properties: {
          categoryId: { type: 'integer', example: 2 },
          name: { type: 'string', minLength: 2, maxLength: 120, example: 'Isca de Frango' },
          shortDescription: { type: 'string', maxLength: 160, nullable: true, example: 'Tiras de frango empanadas.' },
          description: { type: 'string', maxLength: 1000, nullable: true, example: 'Porção para 2 pessoas, acompanha molho da casa.' },
          ingredients: { type: 'string', maxLength: 500, nullable: true, example: 'Frango, farinha panko, molho' },
          price: { type: 'number', minimum: 0, example: 42.9, description: 'Deve ser maior que zero se available = true' },
          imageUrl: { type: 'string', nullable: true, example: 'http://localhost:9000/cardapio/itens/3f2c.jpg' },
          options: { type: 'array', items: { $ref: '#/components/schemas/OptionGroup' }, default: [] },
          available: { type: 'boolean', default: true },
          sortOrder: { type: 'integer', minimum: 0 },
        },
      },
      MenuCategory: {
        allOf: [
          { $ref: '#/components/schemas/Category' },
          { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/MenuItem' } } } },
        ],
      },
      OrderStatus: {
        type: 'string',
        enum: ['recebido', 'em_preparo', 'pronto', 'entregue'],
        description: 'Recebido → Em preparo → Pronto → Entregue',
      },
      OrderItemInput: {
        type: 'object',
        required: ['itemId', 'quantity'],
        properties: {
          itemId: { type: 'integer', example: 1 },
          quantity: { type: 'integer', minimum: 1, maximum: 50, example: 2 },
          options: {
            type: 'object',
            description: 'Mapa id do grupo → id da opção (ou lista de ids em grupos "multiple")',
            additionalProperties: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            example: { tamanho: 'g600' },
          },
          notes: { type: 'string', maxLength: 200, nullable: true, example: 'Bem gelada' },
        },
      },
      OrderInput: {
        type: 'object',
        required: ['customerName', 'tableNumber', 'items'],
        properties: {
          customerName: { type: 'string', minLength: 2, maxLength: 80, example: 'Mariana' },
          tableNumber: { type: 'string', maxLength: 10, example: '7' },
          tableToken: { type: 'string', description: 'Código assinado que vem no QR code da mesa (parâmetro t do link)', example: 'Xk3...' },
          notes: { type: 'string', maxLength: 300, nullable: true, example: 'Trazer os pratos juntos' },
          items: { type: 'array', minItems: 1, maxItems: 50, items: { $ref: '#/components/schemas/OrderItemInput' } },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          menuItemId: { type: 'integer', nullable: true, description: 'Fica nulo se o item for removido do cardápio' },
          name: { type: 'string', description: 'Nome gravado no momento do pedido' },
          unitPrice: { type: 'number', description: 'Preço unitário calculado pelo servidor (base + opções)' },
          quantity: { type: 'integer' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                groupId: { type: 'string' },
                group: { type: 'string' },
                choiceId: { type: 'string' },
                choice: { type: 'string' },
                priceDelta: { type: 'number' },
              },
            },
          },
          notes: { type: 'string', nullable: true },
          subtotal: { type: 'number' },
        },
      },
      StatusHistory: {
        type: 'object',
        properties: {
          status: { $ref: '#/components/schemas/OrderStatus' },
          statusLabel: { type: 'string', example: 'Em preparo' },
          changedAt: { type: 'string', format: 'date-time' },
          changedBy: { type: 'integer', nullable: true, description: 'ID do admin (nulo quando criado pelo cliente). Só nas rotas do admin.' },
          changedByName: { type: 'string', description: 'Quem alterou. Só nas rotas do admin.' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          number: { type: 'integer', description: 'Número do pedido exibido ao cliente' },
          trackingCode: { type: 'string', format: 'uuid', description: 'Código secreto para o cliente acompanhar o pedido' },
          customerName: { type: 'string' },
          tableNumber: { type: 'string' },
          notes: { type: 'string', nullable: true },
          status: { $ref: '#/components/schemas/OrderStatus' },
          statusLabel: { type: 'string' },
          total: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          history: { type: 'array', items: { $ref: '#/components/schemas/StatusHistory' } },
        },
        example: exampleOrder,
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Verifica se a API e o banco estão no ar',
        responses: {
          200: {
            description: 'API saudável',
            content: { 'application/json': { example: { status: 'ok', database: 'ok', uptime: 523.4 } } },
          },
          503: {
            description: 'Banco de dados indisponível',
            content: { 'application/json': { example: { status: 'error', database: 'down' } } },
          },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Login do administrador',
        description: 'Retorna um JWT válido por 8 horas (configurável em JWT_EXPIRES_IN). Limite de 10 tentativas com erro a cada 15 minutos por IP.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
              example: { email: 'admin@barzinhocpn.com.br', password: 'admin123' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login realizado',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { token: { type: 'string' }, admin: { $ref: '#/components/schemas/Admin' } } },
                example: {
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  admin: { id: 1, name: 'Administrador', email: 'admin@barzinhocpn.com.br' },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: errorResponse('E-mail ou senha incorretos', error('INVALID_CREDENTIALS', 'E-mail ou senha inválidos')),
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Autenticação'],
        summary: 'Dados do administrador logado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Sessão válida',
            content: {
              'application/json': {
                example: { admin: { id: 1, name: 'Administrador', email: 'admin@barzinhocpn.com.br' }, expiresAt: '2026-11-18T06:00:00.000Z' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/menu': {
      get: {
        tags: ['Cardápio'],
        summary: 'Cardápio completo agrupado por categoria',
        description: 'Somente categorias ativas e itens disponíveis. Usado pela tela do cliente (RF001).',
        responses: {
          200: {
            description: 'Cardápio',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { categories: { type: 'array', items: { $ref: '#/components/schemas/MenuCategory' } } } },
                example: { categories: [{ id: 1, name: 'Cervejas', slug: 'cervejas', sortOrder: 1, active: true, items: [exampleItem] }] },
              },
            },
          },
        },
      },
    },

    '/api/categories': {
      get: {
        tags: ['Categorias'],
        summary: 'Lista todas as categorias (com quantidade de itens)',
        responses: {
          200: {
            description: 'Categorias',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Categorias'],
        summary: 'Cria uma categoria',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } } } },
        responses: {
          201: {
            description: 'Categoria criada',
            content: { 'application/json': { example: { category: { id: 8, name: 'Petiscos', slug: 'petiscos', sortOrder: 8, active: true, itemCount: 0 } } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/categories/{id}': {
      put: {
        tags: ['Categorias'],
        summary: 'Atualiza uma categoria',
        security: [{ bearerAuth: [] }],
        parameters: [idParam('ID da categoria')],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } } } },
        responses: {
          200: { description: 'Categoria atualizada', content: { 'application/json': { schema: { type: 'object', properties: { category: { $ref: '#/components/schemas/Category' } } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Categorias'],
        summary: 'Exclui uma categoria vazia',
        security: [{ bearerAuth: [] }],
        parameters: [idParam('ID da categoria')],
        responses: {
          204: { description: 'Categoria excluída' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          409: errorResponse('A categoria ainda tem itens', error('CONFLICT', 'A categoria possui 3 item(ns). Mova ou remova os itens antes de excluir.')),
        },
      },
    },

    '/api/items': {
      get: {
        tags: ['Itens'],
        summary: 'Lista todos os itens (inclui indisponíveis)',
        description: 'Listagem do painel administrativo. O cliente usa GET /api/menu.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'categoryId', in: 'query', schema: { type: 'integer' }, description: 'Filtra por categoria' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Busca por nome ou descrição', example: 'batata' },
        ],
        responses: {
          200: {
            description: 'Itens',
            content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/MenuItem' } } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Itens'],
        summary: 'Cadastra um item no cardápio',
        description: 'Após a operação o servidor emite `menu:updated` e o cardápio do cliente é atualizado automaticamente.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuItemInput' } } } },
        responses: {
          201: { description: 'Item criado', content: { 'application/json': { schema: { type: 'object', properties: { item: { $ref: '#/components/schemas/MenuItem' } } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: errorResponse('Categoria inexistente', error('UNPROCESSABLE', 'Categoria não encontrada')),
        },
      },
    },
    '/api/items/{id}': {
      get: {
        tags: ['Itens'],
        summary: 'Detalhes de um item (público)',
        description: 'Usado na tela de detalhes do item (RF002).',
        parameters: [idParam('ID do item')],
        responses: {
          200: { description: 'Item', content: { 'application/json': { schema: { type: 'object', properties: { item: { $ref: '#/components/schemas/MenuItem' } } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Itens'],
        summary: 'Edita um item (substitui todos os campos)',
        security: [{ bearerAuth: [] }],
        parameters: [idParam('ID do item')],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuItemInput' } } } },
        responses: {
          200: { description: 'Item atualizado', content: { 'application/json': { schema: { type: 'object', properties: { item: { $ref: '#/components/schemas/MenuItem' } } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Itens'],
        summary: 'Remove o item permanentemente',
        description: 'Pedidos antigos continuam com o nome e o preço gravados. A imagem enviada é apagada do armazenamento.',
        security: [{ bearerAuth: [] }],
        parameters: [idParam('ID do item')],
        responses: {
          204: { description: 'Item removido' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/items/{id}/availability': {
      patch: {
        tags: ['Itens'],
        summary: 'Marca o item como disponível ou esgotado',
        security: [{ bearerAuth: [] }],
        parameters: [idParam('ID do item')],
        requestBody: { required: true, content: { 'application/json': { example: { available: false } } } },
        responses: {
          200: { description: 'Disponibilidade alterada', content: { 'application/json': { schema: { type: 'object', properties: { item: { $ref: '#/components/schemas/MenuItem' } } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          422: errorResponse('Item sem preço', error('UNPROCESSABLE', 'Defina um preço antes de deixar o item disponível')),
        },
      },
    },

    '/api/tables/qrcodes': {
      post: {
        tags: ['Mesas'],
        summary: 'Gera os códigos assinados dos QR codes das mesas',
        description: 'Usado pelo painel para montar as plaquinhas. Cada mesa recebe um token calculado com a chave secreta do servidor.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { example: { tables: ['1', '2', '3', 'Balcão'] } } },
        },
        responses: {
          200: { description: 'Mesas com o token de cada uma', content: { 'application/json': { example: { tables: [{ table: '1', token: 'q8Zr...' }] } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/uploads': {
      post: {
        tags: ['Upload'],
        summary: 'Envia a imagem de um item',
        description:
          'Aceita JPG, PNG ou WEBP de até 5 MB. Com STORAGE_DRIVER=s3 a imagem é gravada no serviço de objetos compatível com S3 (RustFS no docker-compose); ' +
          'com STORAGE_DRIVER=local fica na pasta uploads da API. Use a URL retornada no campo imageUrl do item.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', required: ['image'], properties: { image: { type: 'string', format: 'binary' } } },
            },
          },
        },
        responses: {
          201: {
            description: 'Imagem armazenada',
            content: {
              'application/json': {
                example: { url: 'http://localhost:9000/cardapio/itens/8b1e6c3e.jpg', key: 'itens/8b1e6c3e.jpg', size: 184322, mimeType: 'image/jpeg' },
              },
            },
          },
          400: errorResponse('Arquivo ausente, grande demais ou formato inválido', error('BAD_REQUEST', 'Formato não suportado. Envie JPG, PNG ou WEBP.')),
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/orders': {
      post: {
        tags: ['Pedidos'],
        summary: 'Cliente envia um pedido',
        description:
          'O preço de cada item é recalculado no servidor a partir do cardápio (o navegador não define preço). ' +
          'Grava o pedido com status "recebido", registra no histórico e notifica o painel em tempo real (`order:created`). ' +
          'Exige o tableToken do QR code oficial da mesa: sem ele (ou com mesa trocada) a resposta é 403.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderInput' },
              example: {
                customerName: 'Mariana',
                tableNumber: '7',
                tableToken: 'código-do-qr-da-mesa',
                notes: 'Trazer os pratos juntos',
                items: [
                  { itemId: 1, quantity: 2, options: { tamanho: 'g600' } },
                  { itemId: 28, quantity: 1, notes: 'Sem cheddar' },
                ],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Pedido registrado. Guarde o trackingCode para acompanhar.',
            content: { 'application/json': { schema: { type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          403: errorResponse('Pedido sem o QR code da mesa', error('TABLE_QR_REQUIRED', 'Para fazer o pedido, aponte a câmera do celular para o QR code da sua mesa.')),
          422: { $ref: '#/components/responses/Unprocessable' },
          429: errorResponse('Muitos pedidos seguidos do mesmo IP', error('TOO_MANY_REQUESTS', 'Muitos pedidos em sequência. Aguarde um pouco.')),
        },
      },
      get: {
        tags: ['Pedidos'],
        summary: 'Lista os pedidos (painel do administrador)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Um ou mais status separados por vírgula',
            schema: { type: 'string' },
            example: 'recebido,em_preparo',
          },
          {
            name: 'period',
            in: 'query',
            description: 'Período de criação do pedido',
            schema: { type: 'string', enum: ['today', '7d', '30d', 'all'], default: 'today' },
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 500, default: 200 } },
        ],
        responses: {
          200: {
            description: 'Pedidos do mais recente para o mais antigo',
            content: { 'application/json': { schema: { type: 'object', properties: { orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/orders/track/{code}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Cliente acompanha o próprio pedido',
        description: 'Público, mas exige o código UUID recebido na confirmação (não é possível listar pedidos de outras pessoas).',
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, example: exampleOrder.trackingCode }],
        responses: {
          200: { description: 'Pedido', content: { 'application/json': { schema: { type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          404: errorResponse('Código não encontrado', error('NOT_FOUND', 'Pedido não encontrado')),
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Detalhes de um pedido com histórico completo',
        security: [{ bearerAuth: [] }],
        parameters: [idParam('Número do pedido')],
        responses: {
          200: { description: 'Pedido', content: { 'application/json': { schema: { type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: errorResponse('Pedido não existe', error('NOT_FOUND', 'Pedido não encontrado')),
        },
      },
    },
    '/api/orders/{id}/status': {
      patch: {
        tags: ['Pedidos'],
        summary: 'Atualiza o status do pedido',
        description:
          'Persiste o novo status, grava no histórico a data/hora e o administrador que alterou (RF008) ' +
          'e envia `order:updated` para o painel e para o cliente que acompanha o pedido.',
        security: [{ bearerAuth: [] }],
        parameters: [idParam('Número do pedido')],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['status'], properties: { status: { $ref: '#/components/schemas/OrderStatus' } } },
              example: { status: 'em_preparo' },
            },
          },
        },
        responses: {
          200: { description: 'Status atualizado', content: { 'application/json': { schema: { type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: errorResponse('Pedido não existe', error('NOT_FOUND', 'Pedido não encontrado')),
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
  },
};
