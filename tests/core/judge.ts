import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import config from '~/config';
import { TEST_MODEL, TEST_PROVIDER } from './config';
import type { Assessment, StepEvidence, Verdict } from './types';

export const MEETS_SCORE = 80;
export const PARTIAL_SCORE = 40;

export const verdictOf = (score: number): Verdict => (score >= MEETS_SCORE ? 'cumple' : score >= PARTIAL_SCORE ? 'parcial' : 'no cumple');

const judgePrompt = (
  about: string
): string => `Eres el juez de las pruebas de METBOT, un asistente para usuarios de negocio. En estas pruebas, ${about} Valoras lo que el asistente hizo y respondió. Respondes siempre en español.

TAREA "paso": recibes en JSON el historial de la conversación (los pasos anteriores; los marcados "fuera de la conversación" los hizo la prueba directamente en el servicio, no el usuario ni el asistente), el mensaje del usuario, lo esperado, la respuesta del asistente, el recorrido del turno (cada herramienta que llamó, con sus argumentos y lo que le respondió; "no ejecutada" es una llamada que una regla rechazó sin correrla), los eventos que emitieron, la verificación (lo que de verdad quedó guardado, comprobado aparte) y, si vienen, qué significa cada opción que el paso tocó. Valora tres cosas:
1. Cumplimiento: hizo o explicó lo esperado.
2. Veracidad: lo que dice coincide con la verificación. Afirmar un cambio que no ocurrió, o callar uno que sí, es la falla más grave.
3. Forma: conciso y claro.
Una opción que pasa de "(sin valor)" a un valor puede no cambiar nada de lo que se ve, si ese era el valor por defecto: no afirmes que cambió la apariencia si las opciones no lo dicen.
Si lo esperado no ocurrió por una causa ajena al asistente (un tiempo de espera agotado, un error del servidor o de la base de datos en el resultado de una herramienta) y el asistente lo informó con la verdad, valora su conducta y empieza el motivo con "Falla externa:" nombrando la causa.
Lo esperado es una hipótesis de la prueba, no la verdad: la verdad es lo que dicen las herramientas (sus resultados, un "NOT UPDATED" del guard que explica por qué un cambio no se puede, lo que se puede cambiar en ese gráfico) y la verificación. Si un resultado de herramienta contradice lo esperado (mostró que no era posible, o que lo era de otra forma) y el asistente actuó y respondió de acuerdo con él, valora su conducta y empieza el motivo con "Expectativa dudosa:" citando ese resultado.
Valora contra el objeto del pedido, no contra el camino exacto de lo esperado: si lo que hizo logra lo que el usuario pidió y nada de lo que hizo lo contradice, cumple, aunque lo esperado sugiriera otro camino; dilo empezando el motivo con "Otro camino:". Resta solo por lo que se sale del pedido, y en proporción: borrar para siempre algo que nadie pidió borrar, o cambiar opciones que nadie pidió, pesa mucho; un paso de más que no cambia nada de lo que el usuario tiene, poco. Las "observaciones" de la verificación son debilidades por confirmar, no fallas.
Puntaje de 0 a 100: 100 cumple todo; ${MEETS_SCORE}-99 cumple, con detalles menores de forma; ${PARTIAL_SCORE}-${MEETS_SCORE - 1} cumple en parte; 0-${PARTIAL_SCORE - 1} no cumple o falta a la verdad. Motivo: 1 o 2 frases concretas. Mejora: una sugerencia concreta para el asistente o para la prueba, solo si hace falta.

TAREA "resumen": recibes en JSON la confiabilidad medida y todos los pasos valorados de la corrida. En 5 a 8 líneas: qué es confiable, qué falló o fue inestable y por qué, y qué ajustar primero en el asistente o en la prueba.`;

const StepAssessmentSchema = z.object({
  puntaje: z.number().int().min(0).max(100).describe('De 0 a 100.'),
  motivo: z.string().describe('1 o 2 frases concretas.'),
  mejora: z.string().optional().describe('Una sugerencia concreta, solo si hace falta.'),
});

export class Judge {
  public readonly modelName = `${TEST_PROVIDER} · ${TEST_MODEL}`;
  private readonly prompt: string;
  private readonly model =
    TEST_PROVIDER === 'openai'
      ? new ChatOpenAI({ model: TEST_MODEL, apiKey: config.llm.openai.apikey, maxRetries: 2 })
      : new ChatGoogleGenerativeAI({ model: TEST_MODEL, apiKey: config.llm.gemini.apikey, temperature: 0, maxRetries: 2 });

  /**
   * Constructor del juez
   * Recibe 'about': lo que hace el agente sobre el servicio bajo prueba, usado para construir el prompt del juez.
   */
  constructor(about: string) {
    this.prompt = judgePrompt(about);
  }

  public async assessStep(evidence: StepEvidence): Promise<Assessment> {
    try {
      const assessment = await this.model
        .withStructuredOutput(StepAssessmentSchema, { name: 'valoracion' })
        .withConfig({ runName: 'Juez · paso' })
        .invoke([
          ['system', this.prompt],
          ['human', `TAREA "paso"\n${JSON.stringify(evidence, null, 2)}`],
        ]);
      return {
        score: assessment.puntaje,
        verdict: verdictOf(assessment.puntaje),
        reason: assessment.motivo,
        ...(assessment.mejora && { improvement: assessment.mejora }),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  public async summarize(run: unknown): Promise<string> {
    try {
      const summary = await this.model.withConfig({ runName: 'Juez · resumen' }).invoke([
        ['system', this.prompt],
        ['human', `TAREA "resumen"\n${JSON.stringify(run, null, 2)}`],
      ]);
      return summary.text.trim();
    } catch (error) {
      return `(el juez no pudo resumir: ${error instanceof Error ? error.message : String(error)})`;
    }
  }
}
