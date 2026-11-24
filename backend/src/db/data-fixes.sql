-- Correções de dados do cardápio já cadastrado (rodam em toda inicialização e são idempotentes:
-- só mudam o que ainda está no valor antigo, então não desfazem alterações feitas pelo painel).

-- Preços informados pelo dono para os itens que estavam sem preço no cardápio impresso (24/11/2026)
UPDATE menu_items SET price = 80, available = true, updated_at = now() WHERE name = 'Tilápia Recheada' AND price = 0;
UPDATE menu_items SET price = 25, available = true, updated_at = now() WHERE name = 'Batata Chips' AND price = 0;
UPDATE menu_items SET price = 45, available = true, updated_at = now() WHERE name = 'Camarão' AND price = 0;
UPDATE menu_items SET price = 40, available = true, updated_at = now() WHERE name = 'Joelho de Porco' AND price = 0;
UPDATE menu_items SET price = 30, available = true, updated_at = now() WHERE name = 'Pé de Porco' AND price = 0;

-- Lanches sem carne não usam mais a ilustração de hambúrguer
UPDATE menu_items SET image_url = '/seed-images/sanduiche.svg'
 WHERE name IN ('Pão com Ovo', 'Maneirinho') AND image_url = '/seed-images/lanche.svg';
