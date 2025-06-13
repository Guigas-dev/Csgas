
'use server';
/**
 * @fileOverview AI flow to predict the next purchase date for a customer.
 *
 * - predictNextPurchase - A function that handles the next purchase prediction.
 * - PredictNextPurchaseInput - The input type for the predictNextPurchase function.
 * - PredictNextPurchaseOutput - The return type for the predictNextPurchase function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SalesRecordSchema = z.object({
  date: z.string().describe("Date of the sale in YYYY-MM-DD format."),
  quantity: z.number().describe("Quantity of gas canisters sold."),
});

const PredictNextPurchaseInputSchema = z.object({
  customerId: z.string().describe("The ID of the customer."),
  salesHistory: z.array(SalesRecordSchema)
    .min(1, { message: "At least one sales record is required to make a prediction." })
    .describe("The customer's sales history, ordered from oldest to newest."),
});
export type PredictNextPurchaseInput = z.infer<typeof PredictNextPurchaseInputSchema>;

const PredictNextPurchaseOutputSchema = z.object({
  predictedNextPurchaseDate: z.string()
    .describe("The predicted next purchase date in YYYY-MM-DD format. If prediction is not possible (e.g., insufficient data), provide a descriptive text like 'Incerta' or 'Dados insuficientes'."),
  reasoning: z.string().describe("A brief explanation of how the prediction was derived, or why it's uncertain/not possible."),
});
export type PredictNextPurchaseOutput = z.infer<typeof PredictNextPurchaseOutputSchema>;

export async function predictNextPurchase(input: PredictNextPurchaseInput): Promise<PredictNextPurchaseOutput> {
  return predictNextPurchaseFlow(input);
}

const predictNextPurchasePrompt = ai.definePrompt({
  name: 'predictNextPurchasePrompt',
  input: { schema: PredictNextPurchaseInputSchema },
  output: { schema: PredictNextPurchaseOutputSchema },
  prompt: `Você é um analista de vendas especializado em prever o comportamento de compra de clientes.
Dada a seguinte lista de histórico de vendas para um cliente (data da compra e quantidade de botijões de gás comprados), preveja a data mais provável (no formato YYYY-MM-DD) para a próxima compra.
Forneça também uma breve explicação para sua previsão.

Considere fatores como frequência de compra, variações na quantidade comprada e quaisquer padrões de consumo aparentes.
Se o histórico for muito curto ou errático para fazer uma previsão confiante, declare isso em seu raciocínio e forneça um palpite fundamentado para a data ou indique 'Incerta' ou 'Dados insuficientes' para predictedNextPurchaseDate.

Histórico de Vendas do Cliente (do mais antigo para o mais recente):
{{#each salesHistory}}
- Em {{this.date}}: {{this.quantity}} unidade(s)
{{/each}}

Responda apenas com o objeto JSON que corresponda ao esquema de saída definido.
`,
});

const predictNextPurchaseFlow = ai.defineFlow(
  {
    name: 'predictNextPurchaseFlow',
    inputSchema: PredictNextPurchaseInputSchema,
    outputSchema: PredictNextPurchaseOutputSchema,
  },
  async (input: PredictNextPurchaseInput) => {
    // Potential future enhancement: If salesHistory is very long, consider sending only the most recent N records.
    // For now, we send all, as per current Zod schema.
    const { output } = await predictNextPurchasePrompt(input);
    if (!output) {
        // Fallback if the model returns nothing, though it should respect the schema
        return {
            predictedNextPurchaseDate: "Erro na IA",
            reasoning: "O modelo de IA não retornou uma resposta válida."
        };
    }
    return output;
  }
);
