import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

type AIRequestBody = {
  action: "describe-class" | "whatsapp-message";
  data: Record<string, string>;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY não configurada no servidor." });
    }

    const { action, data } = req.body as AIRequestBody;

    if (!action || !data) {
      return res.status(400).json({ message: "Campos 'action' e 'data' são obrigatórios." });
    }

    let prompt = "";

    if (action === "describe-class") {
      const { studentName, date, time, hint } = data;
      const dateFormatted = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });

      prompt = `Você é assistente de um estúdio de atividades físicas (yoga, pilates, dança, musculação, etc).

Crie uma descrição curta e profissional para uma aula agendada com as seguintes informações:
- Aluno: ${studentName}
- Data: ${dateFormatted}
- Horário: ${time}
${hint ? `- Dica / contexto: ${hint}` : ""}

A descrição deve ter de 1 a 2 frases, ser objetiva e incluir o foco ou objetivo da aula.
Responda apenas com a descrição da aula, sem aspas nem introduções extras.`;
    } else if (action === "whatsapp-message") {
      const { studentName, messageType, extraContext } = data;

      const typeMap: Record<string, string> = {
        agendamento: "confirmação de um novo agendamento de aula",
        lembrete: "lembrete amigável de aula marcada para amanhã",
        cobranca: "lembrete gentil de mensalidade em aberto",
        motivacao: "mensagem motivacional para incentivar a continuar praticando",
        retorno: "convite para o aluno que está ausente há um tempo retornar às aulas",
      };

      const goal = typeMap[messageType] ?? messageType;

      prompt = `Você é assistente de comunicação de um estúdio de atividades físicas (yoga, pilates, dança, etc).

Escreva uma mensagem de WhatsApp para o aluno "${studentName}" com o seguinte objetivo: ${goal}.
${extraContext ? `Contexto adicional fornecido: ${extraContext}` : ""}

Regras para a mensagem:
- Seja informal, acolhedor e próximo
- Use o primeiro nome do aluno na abertura
- Inclua 1 a 3 emojis relevantes distribuídos no texto
- Máximo de 4 linhas
- Termine com a assinatura "Equipe VOLL 💚"

Responda apenas com o texto da mensagem, sem explicações, sem aspas e sem introduções.`;
    } else {
      return res.status(400).json({ message: "Ação inválida. Use 'describe-class' ou 'whatsapp-message'." });
    }

    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? response.text ?? "";
    return res.status(200).json({ result: text.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ai] Erro:", message);
    return res.status(500).json({ message: `Erro na IA: ${message}` });
  }
}

    if (!action || !data) {
      return res.status(400).json({ message: "Campos 'action' e 'data' são obrigatórios." });
    }

    let prompt = "";

    if (action === "describe-class") {
      const { studentName, date, time, hint } = data;
      const dateFormatted = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });

      prompt = `Você é assistente de um estúdio de atividades físicas (yoga, pilates, dança, musculação, etc).

Crie uma descrição curta e profissional para uma aula agendada com as seguintes informações:
- Aluno: ${studentName}
- Data: ${dateFormatted}
- Horário: ${time}
${hint ? `- Dica / contexto: ${hint}` : ""}

A descrição deve ter de 1 a 2 frases, ser objetiva e incluir o foco ou objetivo da aula.
Responda apenas com a descrição da aula, sem aspas nem introduções extras.`;
    } else if (action === "whatsapp-message") {
      const { studentName, messageType, extraContext } = data;

      const typeMap: Record<string, string> = {
        agendamento: "confirmação de um novo agendamento de aula",
        lembrete: "lembrete amigável de aula marcada para amanhã",
        cobranca: "lembrete gentil de mensalidade em aberto",
        motivacao: "mensagem motivacional para incentivar a continuar praticando",
        retorno: "convite para o aluno que está ausente há um tempo retornar às aulas",
      };

      const goal = typeMap[messageType] ?? messageType;

      prompt = `Você é assistente de comunicação de um estúdio de atividades físicas (yoga, pilates, dança, etc).

Escreva uma mensagem de WhatsApp para o aluno "${studentName}" com o seguinte objetivo: ${goal}.
${extraContext ? `Contexto adicional fornecido: ${extraContext}` : ""}

Regras para a mensagem:
- Seja informal, acolhedor e próximo
- Use o primeiro nome do aluno na abertura
- Inclua 1 a 3 emojis relevantes distribuídos no texto
- Máximo de 4 linhas
- Termine com a assinatura "Equipe VOLL 💚"

Responda apenas com o texto da mensagem, sem explicações, sem aspas e sem introduções.`;
    } else {
      return res.status(400).json({ message: "Ação inválida. Use 'describe-class' ou 'whatsapp-message'." });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text ?? "";
    return res.status(200).json({ result: text.trim() });
  } catch (err) {
    console.error("[api/ai] Erro:", err);
    return res.status(500).json({ message: "Erro ao processar solicitação de IA." });
  }
}
