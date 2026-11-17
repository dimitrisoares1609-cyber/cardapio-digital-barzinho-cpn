// Mesmo cálculo feito no servidor, usado para mostrar o preço antes de enviar.
// O valor final do pedido sempre vem da API.

export function selectedChoices(item, selected = {}) {
  const result = [];
  for (const group of item.options ?? []) {
    const value = selected[group.id];
    const ids = value == null ? [] : Array.isArray(value) ? value : [value];
    for (const id of ids) {
      const choice = group.choices.find((c) => c.id === id);
      if (choice) result.push({ group, choice });
    }
  }
  return result;
}

export function unitPrice(item, selected) {
  const extras = selectedChoices(item, selected).reduce((sum, { choice }) => sum + Number(choice.priceDelta || 0), 0);
  return Math.round((Number(item.price) + extras) * 100) / 100;
}

// Primeiro grupo obrigatório ainda sem escolha (para desabilitar o botão de adicionar)
export function missingRequired(item, selected = {}) {
  return (item.options ?? []).find((g) => {
    const v = selected[g.id];
    return g.required && (v == null || (Array.isArray(v) && v.length === 0));
  });
}

// Preço mínimo possível, para exibir "a partir de" na lista
export function startingPrice(item) {
  const requiredMin = (item.options ?? [])
    .filter((g) => g.required)
    .reduce((sum, g) => sum + Math.min(...g.choices.map((c) => Number(c.priceDelta || 0))), 0);
  return Number(item.price) + requiredMin;
}

export function hasPriceVariation(item) {
  return (item.options ?? []).some((g) => g.choices.some((c) => Number(c.priceDelta) > 0));
}
