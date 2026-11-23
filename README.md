# Cardápio Digital — Barzinho CPN

Aplicação web distribuída desenvolvida na **Prática Extensionista VII** do curso de Engenharia da Computação da UNAERP.

O cliente abre o cardápio no celular (pelo QR Code da mesa), escolhe os itens, envia o pedido e acompanha o preparo em tempo real. O bar usa um painel administrativo para gerenciar o cardápio e os pedidos, que chegam na hora, com aviso sonoro.

O cardápio cadastrado é o do **Barzinho CPN**, digitado a partir do cardápio físico do bar (87 itens em 7 categorias).

**Vídeo de demonstração:** https://dimitrisoares1609-cyber.github.io/cardapio-digital-barzinho-cpn/ (arquivo em [`docs/video-demonstracao.mp4`](docs/video-demonstracao.mp4))

## Arquitetura

```
 Celular do cliente            Painel do bar (admin)
 ┌──────────────────┐          ┌──────────────────┐
 │  React (SPA)     │          │  React (SPA)     │
 └────────┬─────────┘          └────────┬─────────┘
          │  HTTP/REST + WebSocket (Socket.IO)  │
          └───────────────┬─────────────────────┘
                 ┌────────▼────────┐
                 │   nginx (web)   │  serve o front e faz proxy
                 └────────┬────────┘
                 ┌────────▼────────┐        ┌──────────────────────┐
                 │  API Node.js    │──S3───▶│ RustFS (objetos S3)  │  imagens dos itens
                 │  Express + JWT  │        └──────────────────────┘
                 │  Socket.IO      │        ┌──────────────────────┐
                 │  Swagger        │──SQL──▶│ PostgreSQL           │  cardápio e pedidos
                 └─────────────────┘        └──────────────────────┘
```

Cada parte roda em um container separado (`docker-compose.yml`): front-end, API, banco de dados e armazenamento de imagens.

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, Vite, React Router, Socket.IO Client |
| Backend | Node.js, Express 5, Socket.IO, JWT, bcrypt, Zod, Multer |
| Banco de dados | PostgreSQL 16 |
| Imagens | Serviço compatível com S3 (RustFS no Docker; AWS S3 ou Cloudflare R2 em produção) |
| Documentação | OpenAPI 3 + Swagger UI |

## Como executar

### Opção 1 — Docker (recomendado)

Pré-requisito: Docker com Docker Compose.

```bash
docker compose up --build
```

| Endereço | O que é |
| --- | --- |
| http://localhost:8080 | Cardápio do cliente |
| http://localhost:8080/?mesa=5 | Cardápio já com a mesa 5 preenchida (link do QR Code) |
| http://localhost:8080/admin | Painel administrativo |
| http://localhost:3333/api/docs | Documentação Swagger da API |
| http://localhost:9001 | Console do RustFS (imagens) |

Na primeira execução a API cria as tabelas, cadastra o cardápio do bar e o administrador.

### Opção 2 — Sem Docker

Pré-requisitos: Node.js 20.19+ (recomendado o 22 LTS) e PostgreSQL.

```bash
# 1) Banco: crie um banco chamado "cardapio" no PostgreSQL

# 2) API
cd backend
cp .env.example .env        # ajuste DATABASE_URL se necessário
npm install
npm run db:setup            # cria as tabelas e insere o cardápio + admin
npm run dev                 # http://localhost:3333

# 3) Front-end (em outro terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Sem Docker as imagens enviadas ficam na pasta `backend/uploads` (`STORAGE_DRIVER=local`).

### Acesso ao painel

| E-mail | Senha |
| --- | --- |
| admin@barzinhocpn.com.br | admin123 |

Troque a senha e o `JWT_SECRET` antes de usar em produção (variáveis `ADMIN_PASSWORD` e `JWT_SECRET`).

## Funcionalidades

### Módulo cliente

- **RF001 – Visualizar cardápio:** categorias em abas, troca sem recarregar a página, busca, itens com nome, descrição, preço e imagem carregados da API.
- **RF002 – Detalhes do item:** imagem ampliada, descrição, ingredientes, preço, opções (tamanho da cerveja, carne do lanche, sabor), observação e botão para adicionar.
- **RF003 – Adicionar ao pedido:** carrinho mantido entre as telas (e ao recarregar), várias unidades do mesmo item, contador animado no ícone e barra flutuante com o total.
- **RF004 – Revisar e enviar:** lista com quantidade, preço unitário e total, ajuste e remoção de itens, nome e mesa do cliente, envio via `POST /api/orders` e tela de confirmação com o número do pedido.
- Acompanhamento do pedido em tempo real e histórico dos pedidos feitos no aparelho.

### Módulo administração

- **RF005 – Login:** e-mail e senha, token JWT com expiração, sessão mantida até sair ou o token expirar, rotas protegidas redirecionam para o login, limite de tentativas.
- **RF006 – Gerenciar itens:** cadastrar, editar e remover, upload de imagem, validação dos campos, controle de disponibilidade (esgotado) e opções do item. O cardápio aberto nos celulares é atualizado sozinho.
- **RF007 – Lista de pedidos:** número, data/hora, itens, total, status e cliente/mesa; filtros por status e período; novos pedidos chegam em tempo real com som e destaque.
- **RF008 – Status do pedido:** Recebido → Em preparo → Pronto → Entregue, salvo no banco, com histórico (data/hora e quem alterou) e reflexo imediato na tela do cliente.
- **RF009 – Swagger:** todos os endpoints documentados com exemplos, códigos de erro e teste interativo em `/api/docs`.

## API

Documentação completa em **http://localhost:3333/api/docs**.

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/health` | público | Situação da API e do banco |
| POST | `/api/auth/login` | público | Login do administrador (JWT) |
| GET | `/api/auth/me` | admin | Dados da sessão |
| GET | `/api/menu` | público | Cardápio agrupado por categoria |
| GET | `/api/categories` | público | Categorias |
| POST / PUT / DELETE | `/api/categories[/:id]` | admin | Gerenciar categorias |
| GET | `/api/items` | admin | Todos os itens (inclui indisponíveis) |
| GET | `/api/items/:id` | público | Detalhes de um item |
| POST / PUT / DELETE | `/api/items[/:id]` | admin | Gerenciar itens |
| PATCH | `/api/items/:id/availability` | admin | Disponível / esgotado |
| POST | `/api/uploads` | admin | Envio de imagem |
| POST | `/api/orders` | público | Enviar pedido |
| GET | `/api/orders/track/:code` | público | Acompanhar pedido pelo código |
| GET | `/api/orders` | admin | Listar pedidos (filtros `status`, `period`) |
| GET | `/api/orders/:id` | admin | Detalhes do pedido |
| PATCH | `/api/orders/:id/status` | admin | Alterar status |

Eventos Socket.IO: `order:created`, `order:updated`, `menu:updated` (servidor → clientes) e `order:track` (cliente → servidor).

Decisões importantes:

- O **preço é sempre calculado no servidor** a partir do cardápio; o valor enviado pelo navegador é ignorado.
- O cliente acompanha o pedido por um código UUID, então ninguém consegue ver pedidos de outras mesas trocando o número na URL.
- Itens removidos do cardápio não quebram pedidos antigos: o pedido guarda o nome e o preço do momento da compra.

## Estrutura

```
backend/
  src/
    db/            schema.sql, migração e cardápio inicial (seed)
    routes/        rotas REST
    services/      regras de negócio (cardápio, pedidos, armazenamento)
    realtime/      Socket.IO
    middlewares/   autenticação, validação e tratamento de erros
    docs/          especificação OpenAPI (Swagger)
  public/seed-images/  ilustrações padrão dos itens
frontend/
  src/
    pages/client/  cardápio, detalhes, carrinho, acompanhamento
    pages/admin/   login, pedidos, cardápio, categorias
    context/       estado do carrinho, sessão, cardápio e avisos
    lib/           cliente HTTP, socket, formatação e cálculo de preço
docker-compose.yml
```

## Equipe

- Dimitri Soares Lopes
- Rafael Zaporoli Nunes
- Guilherme Pazoti Neto
- Rafael Vetrano Cairo
