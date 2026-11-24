import { z } from 'zod';

export const ORDER_STATUSES = ['recebido', 'em_preparo', 'pronto', 'entregue', 'cancelado'];

export const STATUS_LABELS = {
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres`)
    .nullish()
    .transform((value) => (value ? value : null));

export const idParam = z.object({
  id: z.coerce.number().int('ID inválido').positive('ID inválido'),
});

// ---------- Auth ----------

export const passwordBody = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z
      .string()
      .min(10, 'A nova senha precisa ter pelo menos 10 caracteres')
      .max(100, 'A nova senha pode ter no máximo 100 caracteres'),
  })
  .refine((d) => d.newPassword !== d.currentPassword, { message: 'A nova senha deve ser diferente da atual', path: ['newPassword'] });

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

// ---------- Categorias ----------

export const categoryBody = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres').max(60),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().default(true),
});

// ---------- Itens do cardápio ----------

const choiceSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1, 'Informe o nome da opção').max(60),
  priceDelta: z.number().min(0, 'O acréscimo não pode ser negativo').max(9999).default(0),
});

const optionGroupSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1, 'Informe o nome do grupo de opções').max(60),
  type: z.enum(['single', 'multiple']).default('single'),
  required: z.boolean().default(false),
  choices: z.array(choiceSchema).min(1, 'O grupo precisa de pelo menos uma opção').max(30),
});

export const itemBody = z
  .object({
    categoryId: z.number({ error: 'Selecione a categoria' }).int().positive('Selecione a categoria'),
    name: z.string({ error: 'Informe o nome' }).trim().min(2, 'O nome deve ter pelo menos 2 caracteres').max(120),
    shortDescription: optionalText(160),
    description: optionalText(1000),
    ingredients: optionalText(500),
    price: z.number({ error: 'Informe o preço' }).min(0, 'O preço não pode ser negativo').max(99999),
    imageUrl: optionalText(500).refine((value) => value === null || /^(https?:\/\/|\/)/.test(value), {
      message: 'URL da imagem inválida',
    }),
    options: z.array(optionGroupSchema).max(10).default([]),
    available: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.available && data.price <= 0) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'Item disponível precisa ter preço maior que zero' });
    }
    const groupIds = new Set();
    data.options.forEach((group, gi) => {
      if (groupIds.has(group.id)) {
        ctx.addIssue({ code: 'custom', path: ['options', gi, 'id'], message: 'Grupo de opções repetido' });
      }
      groupIds.add(group.id);
      const choiceIds = new Set();
      group.choices.forEach((choice, ci) => {
        if (choiceIds.has(choice.id)) {
          ctx.addIssue({ code: 'custom', path: ['options', gi, 'choices', ci, 'id'], message: 'Opção repetida' });
        }
        choiceIds.add(choice.id);
      });
    });
  });

export const availabilityBody = z.object({
  available: z.boolean({ error: 'Informe true ou false' }),
});

export const itemsQuery = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(60).optional(),
});

// ---------- Pedidos ----------

export const orderBody = z.object({
  customerName: z.string({ error: 'Informe seu nome' }).trim().min(2, 'Informe seu nome').max(80),
  tableNumber: z.preprocess(
    (value) => (typeof value === 'number' ? String(value) : value),
    z.string({ error: 'Informe o número da mesa' }).trim().min(1, 'Informe o número da mesa').max(10),
  ),
  notes: optionalText(300),
  tableToken: z.string().trim().max(64).optional().nullable(),
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        quantity: z.number().int().min(1, 'Quantidade mínima é 1').max(50, 'Quantidade máxima é 50'),
        options: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
        notes: optionalText(200),
      }),
    )
    .min(1, 'O pedido precisa ter pelo menos um item')
    .max(50, 'Pedido com itens demais'),
});

export const statusBody = z.object({
  status: z.enum(ORDER_STATUSES, { error: `Status deve ser: ${ORDER_STATUSES.join(', ')}` }),
});

export const ordersQuery = z.object({
  status: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').map((s) => s.trim()) : []))
    .refine((list) => list.every((s) => ORDER_STATUSES.includes(s)), { message: 'Status inválido no filtro' }),
  period: z.enum(['today', '7d', '30d', 'all']).default('today'),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const trackingParam = z.object({
  code: z.uuid('Código de acompanhamento inválido'),
});

// Gera os QR codes das mesas (painel)
export const tablesBody = z.object({
  tables: z
    .array(z.string().trim().min(1, 'Mesa sem nome').max(10, 'Use no máximo 10 caracteres por mesa'))
    .min(1, 'Informe pelo menos uma mesa')
    .max(200, 'No máximo 200 mesas por vez'),
});
