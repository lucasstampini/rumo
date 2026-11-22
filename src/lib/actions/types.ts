/** Retorno padrão das Server Actions usadas com useActionState. */
export type ActionState = { error?: string; ok?: string } | null;

/** Erros levantados pelos triggers do banco (prefixo RUMO:) e constraints → mensagem para a pessoa. */
const DB_MESSAGES: Record<string, string> = {
  "RUMO:car_unavailable": "Este carro não está mais disponível para aluguel.",
  "RUMO:own_car": "Você não pode alugar o seu próprio carro.",
  "RUMO:invalid_days": "Escolha de 1 a 30 diárias.",
  "RUMO:past_date": "A retirada não pode ser em uma data que já passou.",
  "RUMO:day_unavailable": "O carro não está disponível em um dos dias escolhidos.",
  "RUMO:invalid_transition": "Esta reserva já mudou de situação. Atualize a página.",
  "RUMO:immutable": "Esses dados da reserva não podem ser alterados.",
  "RUMO:pickup_code_required": "Não foi possível gerar o código de retirada. Tente de novo.",
  "RUMO:code_not_confirmed": "O dono ainda não confirmou o código de retirada.",
  "RUMO:photos_missing": "Faltam fotos da vistoria.",
};

export function friendlyDbError(error: { message: string; code?: string } | null): string {
  if (!error) return "Algo deu errado. Tente de novo.";
  // 23P01 = violação da exclusion constraint de datas sobrepostas
  if (error.code === "23P01") {
    return "Essas datas acabaram de ser reservadas por outra pessoa. Escolha outro período.";
  }
  const key = Object.keys(DB_MESSAGES).find((k) => error.message.includes(k));
  return key ? DB_MESSAGES[key] : "Algo deu errado. Tente de novo.";
}
