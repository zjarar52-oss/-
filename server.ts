import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("Warning: GEMINI_API_KEY is not defined. The parser API will fail until configured.");
}

// REST API for Gemini Parser
app.post("/api/parse", async (req, res) => {
  try {
    const { text, currentDate } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing calendar instruction text" });
    }

    if (!ai) {
      return res.status(503).json({ 
        error: "Gemini API integration is not available as the GEMINI_API_KEY is missing. Please set your key in the Secrets panel." 
      });
    }

    const referenceDate = currentDate || "2026-05-31"; // Default fallback

    const prompt = `你是一个智能日程解析小助手。根据用户输入的中文语音文本，识别用户意图。
当前系统时间/参考日期为: ${referenceDate}。
请注意根据当前日期推算相对日期，比如：
- "今天" 指: ${referenceDate} 对应的日期。
- "明天" 指: ${referenceDate} 的下一天。
- "后天" 指: ${referenceDate} 的下两天。
- "下周一" 指: 距离最近的的下一个星期一（如果参考日期是星期天，则下周一就是明天，其他以此类推）。
- 具体的具体时间如"下午三点"表示"15:00"，"早上八点半"表示"08:30"，"晚上十点十一"表示"22:11"。如果只有天没有提到时间，则 time 设为空字符串 ""。
- "删除腾讯面试" 意图是删除一个日程，对应的 title 是 "腾讯面试"。
- "我明天有什么安排" 意图是查询日程，对应的 action 是 "query", date 是明天的日期，title 设为空字符串 ""。

用户说："${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "必须是 'add', 'query', 或 'delete' 之一。",
            },
            title: {
              type: Type.STRING,
              description: "日程的名称或主题。若为 query 且无特定主题，则为空字符串 ''。对于 delete，提取要删除的日程的名称。",
            },
            date: {
              type: Type.STRING,
              description: "用相对日期推算出的 YYYY-MM-DD 格式的日期，例如 2026-06-01。如果是 query actions 且没有指定日期，可以推算当天或提到的日期。",
            },
            time: {
              type: Type.STRING,
              description: "HH:MM 格式的24小时制具体时间，如 15:00。如果没有明确提取到具体时间，则为空字符串 ''。",
            }
          },
          required: ["action", "title", "date", "time"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from Gemini API");
    }

    const result = JSON.parse(responseText.trim());
    res.json(result);
  } catch (err: any) {
    console.error("Gemini Parsing Error:", err);
    res.status(500).json({ error: err.message || "解析语音意图失败" });
  }
});

// Configure Vite or Static Files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

setupServer();
