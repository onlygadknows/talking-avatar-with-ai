import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { openAIChain, parser } from "./modules/openAI.mjs";
import { lipSync } from "./modules/lip-sync.mjs";
import { sendDefaultMessages, defaultResponse } from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";

dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

app.post("/tts", async (req, res) => {
  const userMessage = req.body.message;
  console.log("Received message for TTS:", userMessage); // Debug

  const defaultMessages = await sendDefaultMessages({ userMessage });
  if (defaultMessages) {
    console.log("Sending default messages:", defaultMessages); // Debug
    res.send({ messages: defaultMessages });
    return;
  }

  let openAImessages;
  try {
    openAImessages = await openAIChain.invoke({
      question: userMessage,
      format_instructions: parser.getFormatInstructions(),
    });
    console.log("OpenAI response:", openAImessages); // Debug
  } catch (error) {
    console.error("Error invoking OpenAI:", error); // Debug
    openAImessages = { messages: defaultResponse }; // Ensure default structure
  }

  const messages = Array.isArray(openAImessages.messages) ? openAImessages.messages : [];
  console.log("Messages passed to lipSync:", messages); // Debug

  try {
    const lipSyncMessages = await lipSync({ messages });
    console.log("Lip sync messages:", lipSyncMessages); // Debug
    res.send({ messages: lipSyncMessages });
  } catch (error) {
    console.error("Error in lipSync:", error); // Debug
    res.status(500).send({ error: "An error occurred during lip sync processing." });
  }
});

app.post("/sts", async (req, res) => {
  const base64Audio = req.body.audio;
  const audioData = Buffer.from(base64Audio, "base64");
  const userMessage = await convertAudioToText({ audioData });
  let openAImessages;
  try {
    openAImessages = await openAIChain.invoke({
      question: userMessage,
      format_instructions: parser.getFormatInstructions(),
    });
  } catch (error) {
    openAImessages = defaultResponse;
  }
  openAImessages = await lipSync({ messages: openAImessages.messages });
  res.send({ messages: openAImessages });
});

app.listen(port, () => {
  console.log(`Jack are listening on port ${port}`);
});
