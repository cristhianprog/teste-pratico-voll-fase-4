import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { supabase } from "./src/server/supabaseClient";
import { GoogleGenAI } from "@google/genai";

type StudentCreateInput = {
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  plan?: string;
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Listar aluno
  app.get("/api/students", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.json(data ?? []);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });


  // Criar aluno
  app.post("/api/students", async (req, res) => {
    try {
      const body = req.body as StudentCreateInput;

      if (!body?.name || typeof body.name !== "string" || body.name.trim().length < 2) {
        return res.status(400).json({ message: "O campo 'nome' é obrigatório." });
      }

      const payload = {
        name: body.name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        status: body.status?.trim() || "Ativo",
        plan: body.plan?.trim() || null,
      };

      const { data, error } = await supabase
        .from("students")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  // Deletar aluno
  app.delete(["/api/students", "/api/students/:id"], async (req, res) => {
    try {
      const id = (req.params.id || (req.query.id as string) || "").trim();

      if (!id || typeof id !== "string") {
        return res.status(400).json({ message: "ID inválido" });
      }

      const { error } = await supabase.from("students").delete().eq("id", id);

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(204).send();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  // ── Agenda ───

  app.get("/api/schedules", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, students(name, email, phone)")
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });
      if (error) return res.status(500).json({ message: error.message });
      return res.json(data ?? []);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  app.post("/api/schedules", async (req, res) => {
    try {
      const { student_id, scheduled_date, scheduled_time, description, status } = req.body ?? {};
      if (!student_id) return res.status(400).json({ message: "student_id é obrigatório" });
      if (!scheduled_date) return res.status(400).json({ message: "scheduled_date é obrigatório" });
      if (!scheduled_time) return res.status(400).json({ message: "scheduled_time é obrigatório" });

      const { data, error } = await supabase
        .from("schedules")
        .insert({ student_id, scheduled_date, scheduled_time, description: description?.trim() || null, status: status || "Agendado" })
        .select("*, students(name, email, phone)")
        .single();
      if (error) return res.status(500).json({ message: error.message });
      return res.status(201).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  app.patch(["/api/schedules", "/api/schedules/:id"], async (req, res) => {
    try {
      const id = (req.params.id || (req.query.id as string) || "").trim();
      const { status } = req.body ?? {};
      if (!id) return res.status(400).json({ message: "ID ausente" });
      if (!status) return res.status(400).json({ message: "status ausente" });

      const { data, error } = await supabase
        .from("schedules").update({ status }).eq("id", id)
        .select("*, students(name, email, phone)").single();
      if (error) return res.status(500).json({ message: error.message });
      return res.json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  app.delete(["/api/schedules", "/api/schedules/:id"], async (req, res) => {
    try {
      const id = (req.params.id || (req.query.id as string) || "").trim();
      if (!id) return res.status(400).json({ message: "ID ausente" });
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) return res.status(500).json({ message: error.message });
      return res.status(204).send();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  // ── Financeiro ───

  app.get("/api/financial", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("financial_entries")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) return res.status(500).json({ message: error.message });
      return res.json(data ?? []);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  app.post("/api/financial", async (req, res) => {
    try {
      const { type, description, amount, due_date, status } = req.body ?? {};
      if (!type || !["receita", "despesa"].includes(type))
        return res.status(400).json({ message: "type inválido" });
      if (!description || description.trim().length < 2)
        return res.status(400).json({ message: "description é obrigatório" });
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
        return res.status(400).json({ message: "amount inválido" });
      if (!due_date)
        return res.status(400).json({ message: "due_date é obrigatório" });

      const { data, error } = await supabase
        .from("financial_entries")
        .insert({ type, description: description.trim(), amount: Number(amount), due_date, status: status || "Pendente" })
        .select("*").single();
      if (error) return res.status(500).json({ message: error.message });
      return res.status(201).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  app.patch(["/api/financial", "/api/financial/:id"], async (req, res) => {
    try {
      const id = (req.params.id || (req.query.id as string) || "").trim();
      const { status } = req.body ?? {};
      if (!id) return res.status(400).json({ message: "ID ausente" });
      if (!status) return res.status(400).json({ message: "status ausente" });

      const { data, error } = await supabase
        .from("financial_entries").update({ status }).eq("id", id).select("*").single();
      if (error) return res.status(500).json({ message: error.message });
      return res.json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  app.delete(["/api/financial", "/api/financial/:id"], async (req, res) => {
    try {
      const id = (req.params.id || (req.query.id as string) || "").trim();
      if (!id) return res.status(400).json({ message: "ID ausente" });
      const { error } = await supabase.from("financial_entries").delete().eq("id", id);
      if (error) return res.status(500).json({ message: error.message });
      return res.status(204).send();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro inesperado" });
    }
  });

  // ── IA (Gemini) ───

  app.post("/api/ai", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "GEMINI_API_KEY não configurada" });

      const { action, data } = req.body as { action: string; data: Record<string, string> };
      if (!action || !data) return res.status(400).json({ message: "Campos 'action' e 'data' são obrigatórios." });

      const genAI = new GoogleGenAI({ apiKey });

      let prompt = "";
      if (action === "describe-class") {
        const { studentName, date, time, hint } = data;
        const dateFormatted = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
          weekday: "long", day: "2-digit", month: "long",
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
        prompt = `Você é assistente de comunicação de um estúdio de atividades físicas (yoga, pilates, dança, etc).

Escreva uma mensagem de WhatsApp para o aluno "${studentName}" com o seguinte objetivo: ${typeMap[messageType] ?? messageType}.
${extraContext ? `Contexto adicional: ${extraContext}` : ""}

Regras:
- Seja informal, acolhedor e próximo
- Use o primeiro nome do aluno na abertura
- Inclua 1 a 3 emojis relevantes distribuídos no texto
- Máximo de 4 linhas
- Termine com a assinatura "Equipe VOLL 💚"

Responda apenas com o texto da mensagem, sem explicações, sem aspas e sem introduções.`;
      } else {
        return res.status(400).json({ message: "Ação inválida." });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? response.text ?? "";
      return res.status(200).json({ result: text.trim() });
    } catch (err) {
      console.error("[/api/ai] Erro:", err);
      return res.status(500).json({ message: "Erro ao processar solicitação de IA." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VOLL Candidate rodando em http://localhost:${PORT}`);
  });
}

startServer();
