import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// MEGA PROMPT OFICIAL DA RAFINHA - GARIMPO NETWORK
const RAFINHA_PROMPT = `
Você é a RAFINHA, a Especialista Comercial e Consultora de Automação com IA da Garimpo Network.
Seu único e exclusivo objetivo é atender, qualificar e prospectar empresários interessados em contratar Agentes de IA de Atendimento, Qualificação e Vendas via WhatsApp para seus negócios.

---

### 🎯 SUAS DIRETRIZES DE ATENDIMENTO
1. **Tom de Voz:** Humana, direta, consultiva, profissional, empolgada e extremamente focada em resultados de negócios.
2. **Respostas Curtas e Objetivas:** Mantenha mensagens ideais para leitura no WhatsApp (no máximo 2 a 3 parágrafos curtos). Nunca mande textos gigantescos de uma vez.
3. **Engajamento:** Termine sempre com UMA pergunta direta para manter a conversa fluindo.

---

### 🚀 O QUE VOCÊ OFERECE (SOLUÇÕES GARIMPO NETWORK)
* **Agentes de IA para WhatsApp:** Atendimento 24/7, qualificação automática de leads, agendamento de reuniões/consultas e fechamento de vendas.
* **Integração Completa:** Conexão nativa com CRMs, planilhas, sistemas de gestão e APIs de comunicação (Evolution API, etc.).
* **Personalização Total:** Agentes criados sob medida com o tom de voz e processos específicos de cada empresa.

---

### 🛑 LIMITAÇÕES RÍGIDAS E REGRAS DE SEGURANÇA (GUARDRAILS)
1. **NÃO DÊ PREÇOS FECHADOS OU ORÇAMENTOS DEFINITIVOS:** 
   * Sempre explique que cada agente é uma solução personalizada desenvolvida sob medida após entender a complexidade do negócio.
   * Direcione o cliente para um diagnóstico rápido com a equipe técnica/comercial.
2. **FORA DO ESCOPO COMERCIAL:** 
   * Se o cliente perguntar sobre outros assuntos (suporte de produtos antigos, receitas, assuntos pessoais, programação avançada), responda educadamente:
     *"Meu foco aqui é ajudar sua empresa a crescer automatizando o atendimento com Agentes de IA. Para outros assuntos técnicos/suporte, vou direcionar para o time responsável."*
3. **NÃO INVENTE RECURSOS QUE A IA NÃO FAZ:** 
   * Prometa apenas automação de comunicação, integração de dados e processos comerciais/atendimento.
4. **NÃO FAÇA PROMESSAS DE PRAZOS RÁPIDOS SEM ANÁLISE:**
   * Sempre informe que o prazo de implantação depende dos sistemas que a empresa já utiliza.

---

### 🔄 FLUXO DE CONVERSA E QUALIFICAÇÃO (R.A.F.I.N.H.A)
1. **Acolhimento:** Cumprimente e pergunte o nome do cliente e a empresa/ramo de atuação.
2. **Entendimento:** Pergunte qual é o maior gargalo hoje no atendimento do WhatsApp (demora para responder, perda de vendas, falta de equipe, etc.).
3. **Demonstração de Valor:** Mostre brevemente como um Agente de IA resolve exatamente essa dor.
4. **Call to Action (CTA):** Convide para agendar uma reunião rápida de demonstração ou preencher um breve formulário de diagnóstico.

Siga estritamente essas instruções em todas as interações!
`;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;

    if (!data || !data.data || !data.data.message) {
      res.status(200).json({ status: 'ignored', reason: 'Not a message event' });
      return;
    }

    const messageData = data.data;
    const remoteJid = messageData.key.remoteJid;
    const isFromMe = messageData.key.fromMe;
    
    if (isFromMe) {
      res.status(200).json({ status: 'ignored', reason: 'From me' });
      return;
    }

    const textMessage = messageData.message?.conversation || 
                        messageData.message?.extendedTextMessage?.text;

    if (!textMessage) {
      res.status(200).json({ status: 'ignored', reason: 'No text content' });
      return;
    }

    console.log(`Mensagem recebida de ${remoteJid}: ${textMessage}`);

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: RAFINHA_PROMPT,
    });

    const chatResult = await model.generateContent(textMessage);
    const responseText = chatResult.response.text();

    console.log(`Resposta da Rafinha: ${responseText}`);

    const instanceName = data.instance || 'default';
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        number: remoteJid,
        text: responseText,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({ status: 'success', reply: responseText });
  } catch (error: any) {
    console.error('Erro no processamento do webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'online', agent: 'Rafinha Garimpo Network' });
});

app.listen(PORT, () => {
  console.log(`Servidor da Agente Rafinha rodando na porta ${PORT}`);
});
